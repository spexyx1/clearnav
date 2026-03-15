import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyRequest {
  tenantId: string;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { tenantId }: VerifyRequest = await req.json();

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role_category")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (userRole?.role_category !== "tenant_admin") {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Tenant admin access required." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tenant } = await serviceClient
      .from("platform_tenants")
      .select("tenant_email_address, email_verified")
      .eq("id", tenantId)
      .maybeSingle();

    if (!tenant?.tenant_email_address) {
      return new Response(
        JSON.stringify({
          verified: false,
          error: "No email address claimed for this tenant"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (tenant.email_verified) {
      return new Response(
        JSON.stringify({
          verified: true,
          message: "Email address already verified",
          email: tenant.tenant_email_address
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let resendApiKey = Deno.env.get("RESEND_API_KEY") || null;

    if (!resendApiKey) {
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
      return new Response(
        JSON.stringify({
          verified: false,
          error: "Email provider not configured. Contact platform administrator."
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const domainCheckRes = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
    });

    const domainData = await domainCheckRes.json();

    if (!domainCheckRes.ok) {
      console.error("Resend domain check error:", domainData);
      return new Response(
        JSON.stringify({
          verified: false,
          error: "Failed to verify with email provider"
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clearnavDomain = domainData.data?.find((d: any) =>
      d.name === "clearnav.cv" && d.status === "verified"
    );

    if (!clearnavDomain) {
      return new Response(
        JSON.stringify({
          verified: false,
          error: "clearnav.cv domain not verified in Resend. Contact platform administrator."
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await serviceClient
      .from("platform_tenants")
      .update({
        email_verified: true,
        resend_identity_id: clearnavDomain.id
      })
      .eq("id", tenantId);

    console.log(`Verified email address ${tenant.tenant_email_address} for tenant ${tenantId}`);

    return new Response(
      JSON.stringify({
        verified: true,
        message: "Email address verified successfully",
        email: tenant.tenant_email_address
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error verifying tenant email:", error);
    return new Response(
      JSON.stringify({
        verified: false,
        error: error.message || "Failed to verify email address",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
