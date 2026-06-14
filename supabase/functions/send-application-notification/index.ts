import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://arklinetrust.com",
  "https://www.arklinetrust.com",
  "https://arkline.vercel.app",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const INVESTOR_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  joint: "Joint",
  aus_proprietary_company: "Australian Proprietary Company",
  aus_public_company: "Australian Public Company",
  regulated_trust_individual_trustee: "Regulated Trust – Individual Trustee",
  regulated_trust_corporate_trustee: "Regulated Trust – Corporate Trustee",
  unregulated_trust_individual_trustee: "Unregulated Trust – Individual Trustee",
  unregulated_trust_corporate_trustee: "Unregulated Trust – Corporate Trustee",
  other: "Other",
};

// deno-lint-ignore no-explicit-any
function row(label: string, value: any) {
  if (value === null || value === undefined || value === "") return "";
  return `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:4px 0;color:#111827;">${value}</td></tr>`;
}

function section(title: string, rows: string) {
  if (!rows) return "";
  return `
    <h3 style="margin:24px 0 8px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">${title}</h3>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">${rows}</table>
  `;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { application_id } = body;

    if (!application_id) {
      return new Response(JSON.stringify({ error: "Missing application_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the application from the database using the service role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: app, error: dbError } = await supabase
      .from("investor_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (dbError || !app) {
      console.error("DB fetch error:", dbError);
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const investorTypeLabel = INVESTOR_TYPE_LABELS[app.investor_type] ?? app.investor_type ?? "Unknown";

    // Determine primary display name
    let primaryName = "";
    if (app.investor_type === "individual" || app.investor_type === "joint") {
      primaryName = [app.a_given_names, app.a_surname].filter(Boolean).join(" ");
    } else if (app.investor_type?.includes("company")) {
      primaryName = app.c_company_name ?? "";
    } else if (app.investor_type?.includes("trust")) {
      primaryName = app.d_trust_name ?? "";
    }
    if (!primaryName) primaryName = [app.contact_given_names, app.contact_surname].filter(Boolean).join(" ");

    // Build investment summary
    const investments: string[] = [];
    if (app.invest_class_a && app.amount_class_a) investments.push(`Class A: A$${app.amount_class_a}`);
    if (app.invest_class_b && app.amount_class_b) investments.push(`Class B: A$${app.amount_class_b}`);
    if (app.invest_class_c && app.amount_class_c) investments.push(`Class C: A$${app.amount_class_c}`);

    const contactRows = [
      row("Name", [app.contact_given_names, app.contact_surname].filter(Boolean).join(" ")),
      row("Email", app.contact_email),
      row("Phone", app.contact_phone),
      row("Address", [app.postal_address, app.postal_suburb, app.postal_state, app.postal_postcode, app.postal_country].filter(Boolean).join(", ")),
    ].join("");

    const investmentRows = [
      row("Investor Type", investorTypeLabel),
      row("Investment", investments.join(" | ") || "—"),
      row("Reinvest Distributions", app.bank_reinvest === true ? "Yes" : app.bank_reinvest === false ? "No" : ""),
    ].join("");

    // Section A — TFN deliberately excluded
    let sectionARows = "";
    if (app.a_given_names || app.a_surname) {
      sectionARows = [
        row("Name", [app.a_title, app.a_given_names, app.a_surname].filter(Boolean).join(" ")),
        row("DOB", app.a_dob),
        row("Email", app.a_email),
        row("Address", [app.a_residential_address, app.a_suburb, app.a_state, app.a_postcode, app.a_country].filter(Boolean).join(", ")),
        row("PEP", app.a_pep === true ? "Yes" : app.a_pep === false ? "No" : ""),
      ].join("");
    }

    // Section B — joint investor, TFN excluded
    let sectionBRows = "";
    if (app.b_given_names || app.b_surname) {
      sectionBRows = [
        row("Name", [app.b_title, app.b_given_names, app.b_surname].filter(Boolean).join(" ")),
        row("DOB", app.b_dob),
        row("Email", app.b_email),
        row("PEP", app.b_pep === true ? "Yes" : app.b_pep === false ? "No" : ""),
      ].join("");
    }

    // Section C — company, TFN/ACN shown only masked
    let sectionCRows = "";
    if (app.c_company_name) {
      sectionCRows = [
        row("Company Name", app.c_company_name),
        row("ACN", app.c_acn),
        row("Address", [app.c_registered_address, app.c_suburb, app.c_state, app.c_postcode, app.c_country].filter(Boolean).join(", ")),
      ].join("");
    }

    // Section D — trust, TFN excluded
    let sectionDRows = "";
    if (app.d_trust_name) {
      sectionDRows = [
        row("Trust Name", app.d_trust_name),
        row("Trust Type", app.d_trust_type),
        row("Settlor", app.d_settlor),
        row("Country Established", app.d_country_established),
      ].join("");
    }

    // Bank section — account number and BSB excluded; only institution and account name shown
    const bankRows = [
      row("Institution", app.bank_institution_name),
      row("Account Name", app.bank_account_name),
    ].join("");

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:#0E2219;padding:28px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;border-radius:4px;background:#B8934A;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#0E2219;">A</div>
      <div>
        <div style="color:#F5F2EE;font-size:17px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;">Arkline Trust</div>
        <div style="color:#B8934A;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px;">New Application Received</div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:15px;color:#111827;">
        A new investor application has been submitted.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
        Applicant: <strong style="color:#111827;">${primaryName || "—"}</strong> &nbsp;|&nbsp; Type: <strong style="color:#111827;">${investorTypeLabel}</strong>
        ${application_id ? `&nbsp;|&nbsp; ID: <code style="font-size:12px;background:#f3f4f6;padding:2px 6px;border-radius:3px;">${application_id}</code>` : ""}
      </p>

      ${section("Contact Details", contactRows)}
      ${section("Investment Details", investmentRows)}
      ${sectionARows ? section("Individual / Applicant A", sectionARows) : ""}
      ${sectionBRows ? section("Joint Applicant B", sectionBRows) : ""}
      ${sectionCRows ? section("Company Details", sectionCRows) : ""}
      ${sectionDRows ? section("Trust Details", sectionDRows) : ""}
      ${bankRows ? section("Bank Account", bankRows) : ""}

      <div style="margin-top:32px;padding:16px;background:#fff8ed;border-radius:6px;border:1px solid #f3e0b5;">
        <p style="margin:0;font-size:13px;color:#92600a;">
          <strong>Sensitive fields omitted from this email.</strong> TFN, bank account numbers, and BSB are stored securely and must be accessed via the admin portal.
        </p>
      </div>

      <div style="margin-top:12px;padding:16px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
        <p style="margin:0;font-size:13px;color:#6b7280;">
          Log in to the Arkline admin portal to review the full application and attached documents.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Arkline Trust &nbsp;·&nbsp; Level 6, 111 Cecil Street, South Melbourne VIC 3205 &nbsp;·&nbsp; enquiries@arklinetrust.com
      </p>
    </div>
  </div>
</body>
</html>`;

    const textBody = `New Arkline Trust Application\n\nApplicant: ${primaryName || "—"}\nType: ${investorTypeLabel}\nEmail: ${app.contact_email || "—"}\nPhone: ${app.contact_phone || "—"}\nInvestment: ${investments.join(", ") || "—"}\n\nApplication ID: ${application_id}\n\nSensitive fields (TFN, bank details) are excluded from this notification.\nLog in to the admin portal to review the full application.`;

    const emailPayload = {
      from: "Arkline Trust <applications@clearnav.cv>",
      to: ["noah@key13.co"],
      subject: `New Application – ${primaryName || "Unknown Applicant"} (${investorTypeLabel})`,
      html: htmlBody,
      text: textBody,
    };

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", resendRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendRes.json();

    return new Response(JSON.stringify({ ok: true, email_id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-application-notification error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
