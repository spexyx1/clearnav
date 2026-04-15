import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendKycEmail(opts: {
  resendApiKey: string;
  fromAddress: string;
  toEmail: string;
  clientName: string;
  tenantName: string;
  verificationUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const { resendApiKey, fromAddress, toEmail, clientName, tenantName, verificationUrl } = opts;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; }
    .header { background: linear-gradient(135deg, #0e7490 0%, #0891b2 100%); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 22px; font-weight: 300; letter-spacing: 2px; }
    .header h1 span { font-weight: 700; }
    .content { background: #ffffff; padding: 40px 32px; }
    .content h2 { color: #0f172a; margin-top: 0; font-size: 20px; }
    .info-box { background: #f0f9ff; border-left: 4px solid #0891b2; padding: 16px; margin: 20px 0; border-radius: 0 6px 6px 0; }
    .steps { counter-reset: step; margin: 20px 0; padding: 0; list-style: none; }
    .steps li { counter-increment: step; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .steps li::before { content: counter(step); display: flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; border-radius: 50%; background: #0891b2; color: white; font-size: 12px; font-weight: 700; margin-top: 2px; }
    .button-container { text-align: center; margin: 28px 0; }
    .button { display: inline-block; padding: 14px 36px; background: #0891b2; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .link-fallback { font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 8px; }
    .notice { background: #fefce8; border: 1px solid #fde047; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #713f12; margin-top: 20px; }
    .footer { text-align: center; padding: 24px 32px; color: #64748b; font-size: 13px; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CLEAR<span>NAV</span></h1>
  </div>
  <div class="content">
    <h2>Identity Verification Required</h2>
    <p>Hello ${clientName || 'there'},</p>
    <p><strong>${tenantName}</strong> requires you to complete identity and AML verification before accessing your investor account. This is a one-time process that typically takes 3–5 minutes.</p>

    <div class="info-box">
      <strong>What you'll need:</strong>
      <ul style="margin: 8px 0 0 0; padding-left: 20px;">
        <li>A valid government-issued photo ID (passport, driver's license, or national ID)</li>
        <li>Access to your device's camera for a liveness check</li>
      </ul>
    </div>

    <p><strong>The verification process:</strong></p>
    <ol class="steps">
      <li><div><strong>Upload your ID</strong> — photograph or upload your government-issued document</div></li>
      <li><div><strong>Complete a liveness check</strong> — a brief selfie to confirm your identity</div></li>
      <li><div><strong>AML screening</strong> — an automated check against global sanctions and PEP lists</div></li>
    </ol>

    <div class="button-container">
      <a href="${verificationUrl}" class="button">Start Verification</a>
    </div>

    <p class="link-fallback">Or copy and paste this link into your browser:<br>${verificationUrl}</p>

    <div class="notice">
      This verification link is unique to you. Please do not share it with others. The link remains active until your verification is complete.
    </div>

    <p style="margin-top: 28px;">If you have any questions, please contact your account manager directly.</p>

    <p>Best regards,<br><strong>The ${tenantName} Team</strong></p>
  </div>
  <div class="footer">
    <p>This email was sent on behalf of ${tenantName} via ClearNav</p>
    <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail],
      subject: `Action Required: Complete Your Identity Verification for ${tenantName}`,
      html,
    }),
  });

  if (res.ok) return { sent: true };
  const data = await res.json().catch(() => ({}));
  return { sent: false, error: data.message || "Resend API error" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const diditApiKey = Deno.env.get("DIDIT_API_KEY");
    const diditWorkflowId = Deno.env.get("DIDIT_WORKFLOW_ID") || "9ec0b071-71c2-4c20-ad6e-9eee7e60976d";

    if (!diditApiKey) {
      return new Response(
        JSON.stringify({ error: "Didit API credentials not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { contact_id, client_name, client_email, tenant_id, callback_url, client_user_id, send_email } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: tenantConfig } = await supabase
      .from("didit_kyc_configs")
      .select("workflow_id, enabled")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (tenantConfig && !tenantConfig.enabled) {
      return new Response(
        JSON.stringify({ error: "KYC verification is disabled for this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workflowId = tenantConfig?.workflow_id || diditWorkflowId;
    const vendorData = contact_id || client_user_id || user.id;

    const sessionPayload: Record<string, unknown> = {
      workflow_id: workflowId,
      vendor_data: vendorData,
      callback: callback_url || undefined,
      callback_method: "both",
      metadata: JSON.stringify({
        tenant_id,
        contact_id: contact_id || null,
        client_user_id: client_user_id || null,
        initiated_by: user.id,
      }),
      language: "en",
    };

    if (client_email || client_name) {
      sessionPayload.contact_details = {
        email: client_email || "",
        send_notification_emails: false,
        email_lang: "en",
      };
    }

    if (client_name) {
      const nameParts = (client_name as string).trim().split(" ");
      sessionPayload.expected_details = {
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
      };
    }

    const diditResponse = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": diditApiKey,
      },
      body: JSON.stringify(sessionPayload),
    });

    if (!diditResponse.ok) {
      const errorText = await diditResponse.text();
      console.error("Didit API error:", diditResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create verification session", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await diditResponse.json();

    const kycRecord: Record<string, unknown> = {
      tenant_id,
      didit_session_id: session.session_id,
      didit_session_url: session.url,
      didit_session_status: session.status || "Not Started",
      verification_initiated_at: new Date().toISOString(),
      id_verification_status: "pending",
      aml_screening_status: "pending",
    };

    if (contact_id) {
      kycRecord.contact_id = contact_id;

      const { data: existingRecord } = await supabase
        .from("kyc_aml_records")
        .select("id")
        .eq("contact_id", contact_id)
        .maybeSingle();

      if (existingRecord) {
        await supabase
          .from("kyc_aml_records")
          .update({
            didit_session_id: session.session_id,
            didit_session_url: session.url,
            didit_session_status: session.status || "Not Started",
            verification_initiated_at: new Date().toISOString(),
            id_verification_status: "pending",
            aml_screening_status: "pending",
            verification_completed_at: null,
            didit_decision_data: null,
          })
          .eq("id", existingRecord.id);
      } else {
        if (client_user_id) kycRecord.client_user_id = client_user_id;
        if (client_name) kycRecord.full_legal_name = client_name;
        await supabase.from("kyc_aml_records").insert(kycRecord);
      }
    } else if (client_user_id) {
      kycRecord.client_user_id = client_user_id;
      if (client_name) kycRecord.full_legal_name = client_name;

      const { data: existingRecord } = await supabase
        .from("kyc_aml_records")
        .select("id")
        .eq("client_user_id", client_user_id)
        .maybeSingle();

      if (existingRecord) {
        await supabase
          .from("kyc_aml_records")
          .update({
            didit_session_id: session.session_id,
            didit_session_url: session.url,
            didit_session_status: session.status || "Not Started",
            verification_initiated_at: new Date().toISOString(),
            id_verification_status: "pending",
            aml_screening_status: "pending",
            verification_completed_at: null,
            didit_decision_data: null,
          })
          .eq("id", existingRecord.id);
      } else {
        await supabase.from("kyc_aml_records").insert(kycRecord);
      }
    }

    let emailSent = false;
    let emailError: string | undefined;

    if (send_email && client_email) {
      let resendApiKey = Deno.env.get("RESEND_API_KEY") || null;

      if (!resendApiKey) {
        const { data: vaultSecret } = await supabase
          .from("vault.decrypted_secrets")
          .select("decrypted_secret")
          .eq("name", "RESEND_API_KEY")
          .maybeSingle();
        if (vaultSecret?.decrypted_secret) {
          resendApiKey = vaultSecret.decrypted_secret;
        }
      }

      if (resendApiKey) {
        const { data: tenantData } = await supabase
          .from("platform_tenants")
          .select("name, company_name, tenant_email_address, email_verified")
          .eq("id", tenant_id)
          .maybeSingle();

        const tenantName = tenantData?.company_name || tenantData?.name || "ClearNav";
        const tenantEmail = tenantData?.tenant_email_address && tenantData.email_verified
          ? tenantData.tenant_email_address
          : null;
        const fromAddress = tenantEmail
          ? `${tenantName} <${tenantEmail}>`
          : `${tenantName} <ny@clearnav.cv>`;

        const result = await sendKycEmail({
          resendApiKey,
          fromAddress,
          toEmail: client_email,
          clientName: client_name || "",
          tenantName,
          verificationUrl: session.url,
        });

        emailSent = result.sent;
        emailError = result.error;
      }
    }

    return new Response(
      JSON.stringify({
        session_id: session.session_id,
        verification_url: session.url,
        status: session.status,
        email_sent: emailSent,
        email_error: emailError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
