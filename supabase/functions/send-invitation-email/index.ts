import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvitationRequest {
  email: string;
  token: string;
  role: string;
  userType: string;
  tenantName: string;
  customMessage?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: isPlatformAdmin } = await supabase
      .from("platform_admin_users")
      .select("id")
      .eq("user_id", caller.id)
      .maybeSingle();

    const { data: staffAccount } = await supabase
      .from("staff_accounts")
      .select("tenant_id, role")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    const { data: tenantAdmin } = await supabase
      .from("tenant_users")
      .select("tenant_id, role")
      .eq("user_id", caller.id)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    const canInvite = isPlatformAdmin ||
                      (staffAccount && (staffAccount.role === "admin" || staffAccount.role === "general_manager")) ||
                      tenantAdmin;

    if (!canInvite) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin access required." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, token, role, userType, tenantName, customMessage }: InvitationRequest = await req.json();

    const siteUrl = Deno.env.get("SITE_URL") || supabaseUrl.replace(".supabase.co", ".vercel.app");
    const inviteUrl = `${siteUrl}/accept-invite?token=${token}`;

    const emailSubject = `You're invited to join ${tenantName || 'ClearNav'}`;
    const roleDisplay = role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const typeDisplay = userType === 'staff' ? 'team member' : 'investor client';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background-color: #f8fafc;
          }
          .header {
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
            padding: 32px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
            font-weight: 300;
            letter-spacing: 2px;
          }
          .header .brand {
            font-weight: 600;
          }
          .content {
            background: #ffffff;
            padding: 40px 32px;
          }
          .content h2 {
            color: #0f172a;
            margin-top: 0;
          }
          .button-container {
            text-align: center;
            margin: 28px 0;
          }
          .button {
            display: inline-block;
            padding: 14px 36px;
            background: #0891b2;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
          }
          .info-box {
            background: #f1f5f9;
            border-left: 4px solid #0891b2;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
          }
          .custom-message {
            background: #f0fdfa;
            border-left: 4px solid #14b8a6;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
            font-style: italic;
            color: #475569;
          }
          .footer {
            text-align: center;
            padding: 24px 32px;
            color: #64748b;
            font-size: 13px;
            background: #f8fafc;
          }
          .footer a {
            color: #0891b2;
            text-decoration: none;
          }
          .link-fallback {
            font-size: 12px;
            color: #94a3b8;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CLEAR<span class="brand">NAV</span></h1>
        </div>
        <div class="content">
          <h2>You're Invited!</h2>
          <p>Hello,</p>
          <p>You've been invited to join <strong>${tenantName || 'ClearNav'}</strong> as a <strong>${typeDisplay}</strong>.</p>

          ${customMessage ? `
          <div class="custom-message">
            "${customMessage}"
          </div>
          ` : ''}

          <div class="info-box">
            <strong>Your Role:</strong> ${roleDisplay}<br>
            <strong>Invitation Type:</strong> ${typeDisplay === 'team member' ? 'Staff Member' : 'Investor Client'}
          </div>

          <p>Click the button below to accept your invitation and create your account:</p>

          <div class="button-container">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </div>

          <p class="link-fallback">Or copy and paste this link into your browser:<br>${inviteUrl}</p>

          <p style="margin-top: 28px;"><strong>Important:</strong> This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>

          ${userType === 'client' ? `
          <div class="info-box">
            <strong>What you'll be able to do:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>View your portfolio and investment performance</li>
              <li>Access important documents and reports</li>
              <li>Track your returns and risk metrics</li>
              <li>Submit redemption requests</li>
            </ul>
          </div>
          ` : `
          <div class="info-box">
            <strong>What you'll be able to do:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Access the management portal</li>
              <li>Manage client accounts and contacts</li>
              <li>Track onboarding workflows</li>
              <li>View analytics and reports</li>
            </ul>
          </div>
          `}

          <p>Best regards,<br>
          <strong>The ${tenantName || 'ClearNav'} Team</strong></p>
        </div>
        <div class="footer">
          <p>This email was sent by ${tenantName || 'ClearNav'}</p>
          <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    let resendApiKey = Deno.env.get("RESEND_API_KEY") || null;

    if (!resendApiKey) {
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: vaultSecret } = await serviceClient
        .from("vault.decrypted_secrets")
        .select("decrypted_secret")
        .eq("name", "RESEND_API_KEY")
        .maybeSingle();
      if (vaultSecret?.decrypted_secret) {
        resendApiKey = vaultSecret.decrypted_secret;
      }
    }

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set — invitation email not sent, returning URL only");
      return new Response(
        JSON.stringify({
          success: true,
          sent: false,
          message: "No email provider configured. Share the invitation link manually.",
          inviteUrl,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendPayload = {
      from: `${tenantName || 'ClearNav'} <onboarding@clearnav.cv>`,
      to: [email],
      subject: emailSubject,
      html: emailHTML,
    };

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: resendData.message || "Failed to send email via Resend",
          inviteUrl,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: true,
        message: "Invitation email sent successfully",
        resend_id: resendData.id,
        inviteUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send invitation email",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
