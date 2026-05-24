import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ClearNAV</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#020617;border-radius:12px 12px 0 0;padding:32px 40px 24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#0ea5e9);border-radius:6px;"></div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:300;color:#ffffff;letter-spacing:2px;">CLEAR</span><span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:2px;">NAV</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cyan accent bar -->
          <tr><td style="background-color:#06b6d4;height:4px;"></td></tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 32px;">

              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#ecfeff;border:1px solid #a5f3fc;border-radius:20px;padding:6px 16px;">
                    <span style="font-size:12px;font-weight:600;color:#0891b2;letter-spacing:0.5px;text-transform:uppercase;">Official Tenant Confirmation</span>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#0f172a;line-height:1.2;">
                Welcome to ClearNAV,<br />Noah
              </h1>

              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.7;">
                Dear Noah,
              </p>

              <p style="margin:0 0 24px;font-size:16px;color:#475569;line-height:1.7;">
                This is a test of the ClearNAV tenant welcome email system. The design and content you see here is exactly what a new tenant admin receives upon onboarding.
              </p>

              <p style="margin:0 0 32px;font-size:16px;color:#475569;line-height:1.7;">
                In a real welcome email, we would attach the following documents for the tenant's records:
              </p>

              <!-- Attachment callout -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Documents Included</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <div style="width:20px;height:20px;background-color:#ecfeff;border:1px solid #a5f3fc;border-radius:4px;text-align:center;line-height:20px;font-size:11px;color:#0891b2;font-weight:700;">1</div>
                              </td>
                              <td style="padding-left:10px;">
                                <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">Fund Administration Agreement</p>
                                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Outlines the terms of our fund administration services</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0 0;">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="width:28px;vertical-align:top;padding-top:2px;">
                                <div style="width:20px;height:20px;background-color:#ecfeff;border:1px solid #a5f3fc;border-radius:4px;text-align:center;line-height:20px;font-size:11px;color:#0891b2;font-weight:700;">2</div>
                              </td>
                              <td style="padding-left:10px;">
                                <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">KYC/AML Protocols</p>
                                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Know Your Customer and Anti-Money Laundering procedures</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0f172a;">Next Steps for New Tenants</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                <tr><td style="padding:8px 0;">
                  <table cellpadding="0" cellspacing="0" width="100%"><tr>
                    <td style="width:32px;vertical-align:top;padding-top:2px;"><div style="width:24px;height:24px;background-color:#06b6d4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">1</div></td>
                    <td style="padding-left:12px;"><p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0f172a;">Log in to your portal</p><p style="margin:0;font-size:13px;color:#64748b;">Access your dedicated ClearNAV dashboard and explore all available modules.</p></td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <table cellpadding="0" cellspacing="0" width="100%"><tr>
                    <td style="width:32px;vertical-align:top;padding-top:2px;"><div style="width:24px;height:24px;background-color:#06b6d4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">2</div></td>
                    <td style="padding-left:12px;"><p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0f172a;">Invite your team</p><p style="margin:0;font-size:13px;color:#64748b;">Add staff members and assign roles from the Staff Management section.</p></td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <table cellpadding="0" cellspacing="0" width="100%"><tr>
                    <td style="width:32px;vertical-align:top;padding-top:2px;"><div style="width:24px;height:24px;background-color:#06b6d4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">3</div></td>
                    <td style="padding-left:12px;"><p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0f172a;">Configure your branding</p><p style="margin:0;font-size:13px;color:#64748b;">Personalise your investor-facing portal with your firm's colours, logo, and domain.</p></td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <table cellpadding="0" cellspacing="0" width="100%"><tr>
                    <td style="width:32px;vertical-align:top;padding-top:2px;"><div style="width:24px;height:24px;background-color:#06b6d4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">4</div></td>
                    <td style="padding-left:12px;"><p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0f172a;">Review compliance settings</p><p style="margin:0;font-size:13px;color:#64748b;">Complete your KYC/AML configuration before onboarding investors.</p></td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <table cellpadding="0" cellspacing="0" width="100%"><tr>
                    <td style="width:32px;vertical-align:top;padding-top:2px;"><div style="width:24px;height:24px;background-color:#06b6d4;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#ffffff;">5</div></td>
                    <td style="padding-left:12px;"><p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0f172a;">Contact us anytime</p><p style="margin:0;font-size:13px;color:#64748b;">Reach us at info@clearnav.cv for onboarding support or platform questions.</p></td>
                  </tr></table>
                </td></tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                <tr>
                  <td style="background-color:#06b6d4;border-radius:8px;">
                    <a href="https://app.clearnav.cv" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.2px;">
                      Access Your ClearNAV Portal &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">
                We look forward to supporting your fund administration journey.<br />
                <strong style="color:#0f172a;">The ClearNAV Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#020617;border-radius:0 0 12px 12px;padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:13px;font-weight:300;color:#94a3b8;letter-spacing:1px;">CLEAR</span><span style="font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:1px;">NAV</span>
                  </td>
                  <td align="right">
                    <a href="mailto:info@clearnav.cv" style="font-size:12px;color:#64748b;text-decoration:none;">info@clearnav.cv</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <p style="margin:0;font-size:11px;color:#334155;line-height:1.6;">
                      This is a test email sent from the ClearNAV platform. This email and any attachments are confidential and intended solely for the named recipient.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ClearNAV Info <info@clearnav.cv>",
        to: ["noah@key13.co"],
        subject: "Welcome to ClearNAV — Your Fund Administration Platform is Ready [TEST]",
        html,
        text: `Welcome to ClearNAV, Noah\n\nThis is a test of the ClearNAV tenant welcome email system.\n\nIn a real welcome email, we would attach:\n- Fund Administration Agreement\n- KYC/AML Protocols\n\nNext Steps:\n1. Log in to your portal: https://app.clearnav.cv\n2. Invite your team\n3. Configure your branding\n4. Review compliance settings\n5. Contact us at info@clearnav.cv\n\nThe ClearNAV Team\ninfo@clearnav.cv`,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify({ ok: res.ok, status: res.status, data }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
