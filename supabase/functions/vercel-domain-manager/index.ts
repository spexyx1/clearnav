import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role_category, tenant_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!roleData || !["superadmin", "tenant_admin"].includes(roleData.role_category)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");

    if (!vercelToken || !vercelProjectId) {
      return new Response(
        JSON.stringify({
          error: "Vercel API not configured",
          message: "VERCEL_API_TOKEN and VERCEL_PROJECT_ID secrets must be set. Please add these in your Vercel project settings and Supabase edge function secrets.",
          configured: false,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "POST" && action === "add") {
      const { domain } = await req.json();
      if (!domain) {
        return new Response(JSON.stringify({ error: "domain is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const vercelRes = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: domain }),
        }
      );

      const vercelData = await vercelRes.json();

      if (!vercelRes.ok) {
        if (vercelData.error?.code === "domain_already_in_use" || vercelData.error?.code === "domain_already_exists") {
          return new Response(
            JSON.stringify({ success: true, message: "Domain already registered on Vercel", data: vercelData }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: vercelData.error?.message || "Failed to add domain to Vercel", details: vercelData }),
          {
            status: vercelRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: vercelData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "DELETE" && action === "remove") {
      const { domain } = await req.json();
      if (!domain) {
        return new Response(JSON.stringify({ error: "domain is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const vercelRes = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains/${domain}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
          },
        }
      );

      if (!vercelRes.ok && vercelRes.status !== 404) {
        const vercelData = await vercelRes.json();
        return new Response(
          JSON.stringify({ error: vercelData.error?.message || "Failed to remove domain from Vercel", details: vercelData }),
          {
            status: vercelRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "GET" && action === "list") {
      const vercelRes = await fetch(
        `https://api.vercel.com/v9/projects/${vercelProjectId}/domains`,
        {
          headers: {
            Authorization: `Bearer ${vercelToken}`,
          },
        }
      );

      const vercelData = await vercelRes.json();

      if (!vercelRes.ok) {
        return new Response(
          JSON.stringify({ error: vercelData.error?.message || "Failed to list domains", details: vercelData }),
          {
            status: vercelRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: vercelData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
