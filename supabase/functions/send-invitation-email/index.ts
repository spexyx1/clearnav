import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user: caller }, error: authError } = await supabase.auth.getUser();

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
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
      .eq("user_id", caller.id)
      .maybeSingle();

    const canInvite = isPlatformAdmin || (staffAccount && (staffAccount.role === "admin" || staffAccount.role === "manager"));

    if (!canInvite) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin or Manager access required." }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { email, token, role, userType, tenantName }: InvitationRequest = await req.json();

    const inviteUrl = `${Deno.env.get('SITE_URL')}/accept-invite?token=${token}`;

    const emailSubject = `You're invited to join ${tenantName || 'Grey Alpha'}`;

    const roleDisplay = role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const typeDisplay = userType === 'staff' ? 'team member' : 'investor client';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
            font-weight: 300;
          }
          .header .brand {
            font-weight: 600;
          }
          .content {
            background: #ffffff;
            padding: 40px;
            border: 1px solid #e2e8f0;
            border-top: none;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background: #0891b2;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
          }
          .button:hover {
            background: #0e7490;
          }
          .info-box {
            background: #f1f5f9;
            border-left: 4px solid #0891b2;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #64748b;
            font-size: 14px;
          }
          .footer a {
            color: #0891b2;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GREY<span class="brand">ALPHA</span></h1>
        </div>
        <div class="content">
          <h2>You're Invited!</h2>
          <p>Hello,</p>
          <p>You've been invited to join <strong>${tenantName || 'Grey Alpha'}</strong> as a <strong>${typeDisplay}</strong>.</p>

          <div class="info-box">
            <strong>Your Role:</strong> ${roleDisplay}<br>
            <strong>Invitation Type:</strong> ${typeDisplay === 'team member' ? 'Staff Member' : 'Investor Client'}
          </div>

          <p>Click the button below to accept your invitation and create your account:</p>

          <div style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </div>

          <p><small>Or copy and paste this link into your browser:</small><br>
          <small style="color: #64748b; word-break: break-all;">${inviteUrl}</small></p>

          <p style="margin-top: 30px;"><strong>Important:</strong> This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>

          ${userType === 'client' ? `
          <div class="info-box">
            <strong>What's Next?</strong><br>
            After accepting your invitation, you'll be able to:
            <ul style="margin: 10px 0;">
              <li>View your portfolio and investment performance</li>
              <li>Access important documents and reports</li>
              <li>Connect your IBKR account</li>
              <li>Track your returns and risk metrics</li>
            </ul>
          </div>
          ` : `
          <div class="info-box">
            <strong>What's Next?</strong><br>
            After accepting your invitation, you'll be able to:
            <ul style="margin: 10px 0;">
              <li>Access the management portal</li>
              <li>Manage client accounts and contacts</li>
              <li>Track onboarding workflows</li>
              <li>View analytics and reports</li>
            </ul>
          </div>
          `}

          <p>If you have any questions, please don't hesitate to reach out to our team.</p>

          <p>Best regards,<br>
          <strong>The ${tenantName || 'Grey Alpha'} Team</strong></p>
        </div>
        <div class="footer">
          <p>This email was sent by ${tenantName || 'Grey Alpha'}</p>
          <p>&copy; ${new Date().getFullYear()} All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    console.log(`Sending invitation email to ${email}`);
    console.log(`Invitation URL: ${inviteUrl}`);
    console.log(`Role: ${role}, Type: ${userType}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent successfully',
        inviteUrl
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error sending invitation email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send invitation email'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
