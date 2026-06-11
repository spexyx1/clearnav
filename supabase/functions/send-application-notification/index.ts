import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

function row(label: string, value: string | null | undefined) {
  if (!value) return "";
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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { application_id, form } = body;

    if (!form) {
      return new Response(JSON.stringify({ error: "Missing form data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const investorTypeLabel = INVESTOR_TYPE_LABELS[form.investor_type] ?? form.investor_type ?? "Unknown";

    // Determine primary name for subject
    let primaryName = "";
    if (form.investor_type === "individual" || form.investor_type === "joint") {
      primaryName = [form.a_given_names, form.a_surname].filter(Boolean).join(" ");
    } else if (form.investor_type?.includes("company")) {
      primaryName = form.c_company_name ?? "";
    } else if (form.investor_type?.includes("trust")) {
      primaryName = form.d_trust_name ?? "";
    }
    if (!primaryName) primaryName = [form.contact_given_names, form.contact_surname].filter(Boolean).join(" ");

    // Build investment summary
    const investments: string[] = [];
    if (form.invest_class_a && form.amount_class_a) investments.push(`Class A: A$${form.amount_class_a}`);
    if (form.invest_class_b && form.amount_class_b) investments.push(`Class B: A$${form.amount_class_b}`);
    if (form.invest_class_c && form.amount_class_c) investments.push(`Class C: A$${form.amount_class_c}`);

    const contactRows = [
      row("Name", [form.contact_given_names, form.contact_surname].filter(Boolean).join(" ")),
      row("Email", form.contact_email),
      row("Phone", form.contact_phone),
      row("Address", [form.postal_address, form.postal_suburb, form.postal_state, form.postal_postcode, form.postal_country].filter(Boolean).join(", ")),
    ].join("");

    const investmentRows = [
      row("Investor Type", investorTypeLabel),
      row("Investment", investments.join(" | ") || "—"),
      row("Reinvest Distributions", form.bank_reinvest === true ? "Yes" : form.bank_reinvest === false ? "No" : ""),
    ].join("");

    const bankRows = [
      row("Institution", form.bank_institution_name),
      row("Account Name", form.bank_account_name),
      row("BSB", form.bank_bsb),
      row("Account No.", form.bank_account_number),
      form.bank_swift ? row("SWIFT", form.bank_swift) : "",
    ].join("");

    // Section A individual details
    let sectionARows = "";
    if (form.a_given_names || form.a_surname) {
      sectionARows = [
        row("Name", [form.a_title, form.a_given_names, form.a_surname].filter(Boolean).join(" ")),
        row("DOB", form.a_dob),
        row("Email", form.a_email),
        row("Address", [form.a_residential_address, form.a_suburb, form.a_state, form.a_postcode, form.a_country].filter(Boolean).join(", ")),
        row("TFN", form.a_tfn),
        row("PEP", form.a_pep === true ? "Yes" : form.a_pep === false ? "No" : ""),
      ].join("");
    }

    // Section C company details
    let sectionCRows = "";
    if (form.c_company_name) {
      sectionCRows = [
        row("Company Name", form.c_company_name),
        row("ABN/TFN", form.c_abn_tfn),
        row("ACN", form.c_acn),
        row("Address", [form.c_registered_address, form.c_suburb, form.c_state, form.c_postcode, form.c_country].filter(Boolean).join(", ")),
      ].join("");
    }

    // Section D trust details
    let sectionDRows = "";
    if (form.d_trust_name) {
      sectionDRows = [
        row("Trust Name", form.d_trust_name),
        row("ABN/TFN", form.d_abn_tfn),
        row("Trust Type", form.d_trust_type),
        row("Settlor", form.d_settlor),
        row("Country Established", form.d_country_established),
      ].join("");
    }

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
      ${sectionCRows ? section("Company Details", sectionCRows) : ""}
      ${sectionDRows ? section("Trust Details", sectionDRows) : ""}
      ${bankRows ? section("Bank Account", bankRows) : ""}

      <div style="margin-top:32px;padding:16px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
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

    const textBody = `New Arkline Trust Application\n\nApplicant: ${primaryName || "—"}\nType: ${investorTypeLabel}\nEmail: ${form.contact_email || "—"}\nPhone: ${form.contact_phone || "—"}\nInvestment: ${investments.join(", ") || "—"}\n\nApplication ID: ${application_id || "N/A"}\n\nPlease log in to the admin portal to review the full application.`;

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
