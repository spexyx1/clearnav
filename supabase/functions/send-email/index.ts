import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendEmailPayload {
  account_id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  reply_to?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: 50 emails per minute per user
    const rateLimitResult = checkRateLimit(user.id, { maxRequests: 50, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    const payload: SendEmailPayload = await req.json();
    const { account_id, to, cc, bcc, subject, body_text, body_html, reply_to } = payload;

    if (!account_id || !to?.length || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields: account_id, to, subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: accessCheck } = await supabase
      .from("email_account_access")
      .select("access_level")
      .eq("account_id", account_id)
      .eq("user_id", user.id)
      .in("access_level", ["full", "send_only"])
      .maybeSingle();

    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("role_category")
      .eq("user_id", user.id)
      .eq("role_category", "tenant_admin")
      .maybeSingle();

    if (!accessCheck && !adminCheck) {
      return new Response(JSON.stringify({ error: "No send permission for this account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: account, error: accountError } = await supabase
      .from("email_accounts")
      .select("*, tenant_id")
      .eq("id", account_id)
      .single();

    if (accountError || !account) {
      return new Response(JSON.stringify({ error: "Email account not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: emailSettings } = await supabase
      .from("tenant_email_settings")
      .select("*")
      .eq("tenant_id", account.tenant_id)
      .eq("is_active", true)
      .maybeSingle();

    let providerResult = { success: false, provider: "internal", message_id: null as string | null };

    if (emailSettings && emailSettings.api_key_encrypted) {
      const apiKey = emailSettings.api_key_encrypted;

      if (emailSettings.provider_type === "resend") {
        const resendPayload = {
          from: `${account.display_name} <${account.email_address}>`,
          to,
          cc: cc || [],
          bcc: bcc || [],
          subject,
          text: body_text,
          html: body_html,
          reply_to: reply_to || account.email_address,
        };

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resendPayload),
        });

        const resendData = await resendRes.json();
        if (resendRes.ok) {
          providerResult = { success: true, provider: "resend", message_id: resendData.id };
        } else {
          throw new Error(`Resend error: ${resendData.message || JSON.stringify(resendData)}`);
        }
      } else if (emailSettings.provider_type === "sendgrid") {
        const sgPayload = {
          personalizations: [{
            to: to.map(email => ({ email })),
            cc: cc?.map(email => ({ email })),
            bcc: bcc?.map(email => ({ email })),
          }],
          from: { email: account.email_address, name: account.display_name },
          reply_to: { email: reply_to || account.email_address },
          subject,
          content: [
            ...(body_text ? [{ type: "text/plain", value: body_text }] : []),
            ...(body_html ? [{ type: "text/html", value: body_html }] : []),
          ],
        };

        const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sgPayload),
        });

        if (sgRes.ok || sgRes.status === 202) {
          providerResult = { success: true, provider: "sendgrid", message_id: sgRes.headers.get("X-Message-Id") };
        } else {
          const sgData = await sgRes.json().catch(() => ({}));
          throw new Error(`SendGrid error: ${JSON.stringify(sgData)}`);
        }
      }
    }

    const { data: savedMessage, error: saveError } = await supabase
      .from("email_messages")
      .insert({
        account_id,
        from_address: account.email_address,
        from_name: account.display_name,
        to_addresses: to.map(email => ({ email })),
        cc_addresses: cc?.map(email => ({ email })) || [],
        bcc_addresses: bcc?.map(email => ({ email })) || [],
        subject,
        body_text: body_text || null,
        body_html: body_html || null,
        folder: "sent",
        is_read: true,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("Failed to save sent message:", saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: providerResult.provider,
        sent_via_provider: providerResult.success,
        message_id: savedMessage?.id,
        provider_message_id: providerResult.message_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
