import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Missing Authorization header", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return err("Unauthorized", 401);

    const body = await req.json();
    const { action, tenant_id, payload } = body as {
      action: "search_people" | "enrich_person" | "search_organizations";
      tenant_id: string;
      payload: Record<string, unknown>;
    };

    if (!action || !tenant_id) return err("action and tenant_id are required");

    // Fetch the Apollo API key for this tenant
    const { data: integration, error: intErr } = await supabase
      .from("tenant_integration_settings")
      .select("api_key, is_enabled")
      .eq("tenant_id", tenant_id)
      .eq("integration_name", "apollo")
      .maybeSingle();

    if (intErr) return err("Failed to load integration settings", 500);
    if (!integration || !integration.api_key) return err("Apollo API key not configured. Add it in AI Agent Settings → Integrations.", 422);
    if (!integration.is_enabled) return err("Apollo integration is disabled", 422);

    const apolloKey = integration.api_key;

    // Route the request to the correct Apollo endpoint
    let apolloUrl = "";
    let apolloBody: Record<string, unknown> = {};

    if (action === "search_people") {
      apolloUrl = "https://api.apollo.io/api/v1/mixed_people/search";
      apolloBody = {
        api_key: apolloKey,
        page: payload.page ?? 1,
        per_page: payload.per_page ?? 25,
        person_titles: payload.titles ?? [],
        organization_industry_tag_ids: payload.industry_ids ?? [],
        person_locations: payload.locations ?? [],
        organization_num_employees_ranges: payload.employee_ranges ?? [],
        q_keywords: payload.keywords ?? undefined,
        contact_email_status: ["verified", "likely to engage"],
      };
    } else if (action === "search_organizations") {
      apolloUrl = "https://api.apollo.io/api/v1/mixed_companies/search";
      apolloBody = {
        api_key: apolloKey,
        page: payload.page ?? 1,
        per_page: payload.per_page ?? 25,
        organization_industry_tag_ids: payload.industry_ids ?? [],
        organization_locations: payload.locations ?? [],
        organization_num_employees_ranges: payload.employee_ranges ?? [],
        q_keywords: payload.keywords ?? undefined,
      };
    } else if (action === "enrich_person") {
      apolloUrl = "https://api.apollo.io/api/v1/people/match";
      apolloBody = {
        api_key: apolloKey,
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        organization_name: payload.organization_name,
      };
    } else {
      return err("Unknown action");
    }

    const apolloRes = await fetch(apolloUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apolloBody),
    });

    const apolloData = await apolloRes.json();

    if (!apolloRes.ok) {
      const message = apolloData?.message ?? apolloData?.error ?? "Apollo API error";
      return err(message, apolloRes.status);
    }

    return new Response(JSON.stringify(apolloData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
