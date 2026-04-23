import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function vercelFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`https://api.vercel.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let data: any = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

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
    const vercelDeployHook = Deno.env.get("VERCEL_DEPLOY_HOOK_URL");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── deploy ──────────────────────────────────────────────────────────────
    if (req.method === "POST" && action === "deploy") {
      const { domain_id, tenant_id } = await req.json();

      if (!vercelDeployHook && (!vercelToken || !vercelProjectId)) {
        const deploymentId = `self_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const deploymentUrl = domain_id
          ? (await supabase.from("tenant_domains").select("domain").eq("id", domain_id).maybeSingle()).data?.domain
          : null;

        await supabase.from("vercel_deployments").insert({
          tenant_id: tenant_id || roleData.tenant_id,
          domain_id: domain_id || null,
          deployment_id: deploymentId,
          status: "ready",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          deployment_url: deploymentUrl ? `https://${deploymentUrl}` : null,
          build_logs: [
            { timestamp: new Date().toISOString(), message: "Site published — no external deployment needed." },
            { timestamp: new Date().toISOString(), message: "Content is served directly from the platform." },
            { timestamp: new Date().toISOString(), message: "Done." },
          ],
        });

        if (domain_id) {
          await supabase
            .from("tenant_domains")
            .update({ deployment_status: "ready", last_deployed_at: new Date().toISOString() })
            .eq("id", domain_id);
        }

        return new Response(
          JSON.stringify({ success: true, deployment_id: deploymentId, self_hosted: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (vercelDeployHook) {
        const hookRes = await fetch(vercelDeployHook, { method: "POST" });
        const hookData = await hookRes.json().catch(() => ({}));
        if (!hookRes.ok) {
          return new Response(
            JSON.stringify({ error: "Deploy hook failed", details: hookData }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const deploymentId = hookData.job?.id || `hook_${Date.now()}`;
        const tid = tenant_id || roleData.tenant_id;
        await supabase.from("vercel_deployments").insert({
          tenant_id: tid,
          domain_id: domain_id || null,
          deployment_id: deploymentId,
          status: "building",
          started_at: new Date().toISOString(),
          build_logs: [{ timestamp: new Date().toISOString(), message: "Deployment triggered via deploy hook." }],
        });
        return new Response(
          JSON.stringify({ success: true, deployment_id: deploymentId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const deployRes = await vercelFetch(`/v13/deployments`, vercelToken!, {
        method: "POST",
        body: JSON.stringify({ name: vercelProjectId, target: "production", gitSource: null }),
      });
      if (!deployRes.ok) {
        return new Response(
          JSON.stringify({ error: deployRes.data.error?.message || "Deploy failed", details: deployRes.data }),
          { status: deployRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const tid = tenant_id || roleData.tenant_id;
      await supabase.from("vercel_deployments").insert({
        tenant_id: tid,
        domain_id: domain_id || null,
        deployment_id: deployRes.data.id,
        status: "building",
        started_at: new Date().toISOString(),
        deployment_url: deployRes.data.url ? `https://${deployRes.data.url}` : null,
        build_logs: [{ timestamp: new Date().toISOString(), message: "Deployment started via Vercel API." }],
      });
      return new Response(
        JSON.stringify({ success: true, deployment_id: deployRes.data.id, deployment_url: deployRes.data.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vercelToken || !vercelProjectId) {
      return new Response(
        JSON.stringify({
          error: "Vercel API not configured",
          message: "VERCEL_API_TOKEN and VERCEL_PROJECT_ID secrets must be set.",
          configured: false,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── add ──────────────────────────────────────────────────────────────────
    if (req.method === "POST" && action === "add") {
      const { domain } = await req.json();
      if (!domain) {
        return new Response(JSON.stringify({ error: "domain is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add with redirect:null so it can never be created as a redirect alias
      const addRes = await vercelFetch(`/v10/projects/${vercelProjectId}/domains`, vercelToken, {
        method: "POST",
        body: JSON.stringify({ name: domain, redirect: null }),
      });

      const alreadyExists =
        addRes.data.error?.code === "domain_already_in_use" ||
        addRes.data.error?.code === "domain_already_exists";

      if (!addRes.ok && !alreadyExists) {
        return new Response(
          JSON.stringify({ error: addRes.data.error?.message || "Failed to add domain to Vercel", details: addRes.data }),
          { status: addRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Inspect and repair redirect if needed
      const inspectRes = await vercelFetch(
        `/v9/projects/${vercelProjectId}/domains/${domain}`,
        vercelToken
      );

      let redirect = inspectRes.data.redirect || null;
      if (redirect) {
        const patchRes = await vercelFetch(
          `/v9/projects/${vercelProjectId}/domains/${domain}`,
          vercelToken,
          { method: "PATCH", body: JSON.stringify({ redirect: null, redirectStatusCode: null }) }
        );
        if (patchRes.ok) redirect = null;
      }

      await supabase
        .from("tenant_domains")
        .update({
          vercel_status: inspectRes.data.verified ? "verified" : "pending",
          vercel_redirect_target: redirect,
          vercel_last_checked_at: new Date().toISOString(),
          vercel_misconfigured: !!inspectRes.data.misconfigured,
        })
        .eq("domain", domain);

      const configRes = await vercelFetch(`/v6/domains/${domain}/config`, vercelToken);

      return new Response(
        JSON.stringify({
          success: true,
          data: addRes.data,
          vercel_verified: inspectRes.data.verified,
          vercel_redirect: redirect,
          vercel_misconfigured: !!inspectRes.data.misconfigured,
          dns_config: configRes.data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── inspect ───────────────────────────────────────────────────────────────
    if (req.method === "GET" && action === "inspect") {
      const domain = url.searchParams.get("domain");
      if (!domain) {
        return new Response(JSON.stringify({ error: "domain query param required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [inspectRes, configRes] = await Promise.all([
        vercelFetch(`/v9/projects/${vercelProjectId}/domains/${domain}`, vercelToken),
        vercelFetch(`/v6/domains/${domain}/config`, vercelToken),
      ]);

      const redirect = inspectRes.data.redirect || null;
      const verified = inspectRes.data.verified || false;
      const misconfigured = !!inspectRes.data.misconfigured || !!configRes.data.misconfigured;

      await supabase
        .from("tenant_domains")
        .update({
          vercel_status: verified ? "verified" : "pending",
          vercel_redirect_target: redirect,
          vercel_last_checked_at: new Date().toISOString(),
          vercel_misconfigured: misconfigured,
          is_verified: verified && !redirect,
          ssl_enabled: verified && !redirect,
          deployment_status: verified && !redirect ? "ready" : "pending",
        })
        .eq("domain", domain);

      return new Response(
        JSON.stringify({
          success: true,
          domain,
          vercel_verified: verified,
          vercel_redirect: redirect,
          vercel_misconfigured: misconfigured,
          dns_config: configRes.data,
          raw: inspectRes.data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── verify ────────────────────────────────────────────────────────────────
    if (req.method === "POST" && action === "verify") {
      const { domain } = await req.json();
      if (!domain) {
        return new Response(JSON.stringify({ error: "domain is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verifyRes = await vercelFetch(
        `/v9/projects/${vercelProjectId}/domains/${domain}/verify`,
        vercelToken,
        { method: "POST", body: JSON.stringify({}) }
      );

      const inspectRes = await vercelFetch(
        `/v9/projects/${vercelProjectId}/domains/${domain}`,
        vercelToken
      );

      const verified = inspectRes.data.verified || verifyRes.data.verified || false;
      const redirect = inspectRes.data.redirect || null;

      await supabase
        .from("tenant_domains")
        .update({
          vercel_status: verified ? "verified" : "pending",
          vercel_redirect_target: redirect,
          vercel_last_checked_at: new Date().toISOString(),
          vercel_misconfigured: !!inspectRes.data.misconfigured,
          ...(verified && !redirect
            ? { is_verified: true, ssl_enabled: true, deployment_status: "ready", verified_at: new Date().toISOString() }
            : {}),
        })
        .eq("domain", domain);

      return new Response(
        JSON.stringify({
          success: true,
          verified,
          vercel_redirect: redirect,
          vercel_verified: verified,
          raw: verifyRes.data,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── config ────────────────────────────────────────────────────────────────
    if (req.method === "GET" && action === "config") {
      const domain = url.searchParams.get("domain");
      if (!domain) {
        return new Response(JSON.stringify({ error: "domain query param required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const configRes = await vercelFetch(`/v6/domains/${domain}/config`, vercelToken);

      return new Response(
        JSON.stringify({ success: true, data: configRes.data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── backfill ──────────────────────────────────────────────────────────────
    if (req.method === "POST" && action === "backfill") {
      if (roleData.role_category !== "superadmin") {
        return new Response(JSON.stringify({ error: "Superadmin required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: allDomains } = await supabase
        .from("tenant_domains")
        .select("id, domain, is_verified")
        .order("created_at");

      if (!allDomains || allDomains.length === 0) {
        return new Response(
          JSON.stringify({ success: true, results: [], message: "No domains found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: Array<{ domain: string; action: string; verified: boolean; redirect: string | null; error?: string }> = [];

      for (const row of allDomains) {
        try {
          const addRes = await vercelFetch(`/v10/projects/${vercelProjectId}/domains`, vercelToken, {
            method: "POST",
            body: JSON.stringify({ name: row.domain, redirect: null }),
          });

          const alreadyExists =
            addRes.data.error?.code === "domain_already_in_use" ||
            addRes.data.error?.code === "domain_already_exists";

          if (!addRes.ok && !alreadyExists) {
            results.push({ domain: row.domain, action: "add_failed", verified: false, redirect: null, error: addRes.data.error?.message });
            continue;
          }

          const inspectRes = await vercelFetch(
            `/v9/projects/${vercelProjectId}/domains/${row.domain}`,
            vercelToken
          );

          let redirect = inspectRes.data.redirect || null;

          if (redirect) {
            const patchRes = await vercelFetch(
              `/v9/projects/${vercelProjectId}/domains/${row.domain}`,
              vercelToken,
              { method: "PATCH", body: JSON.stringify({ redirect: null, redirectStatusCode: null }) }
            );
            if (patchRes.ok) redirect = null;
          }

          const verified = inspectRes.data.verified || false;

          await supabase
            .from("tenant_domains")
            .update({
              vercel_status: verified ? "verified" : "pending",
              vercel_redirect_target: redirect,
              vercel_last_checked_at: new Date().toISOString(),
              vercel_misconfigured: !!inspectRes.data.misconfigured,
              ...(verified && !redirect
                ? { is_verified: true, ssl_enabled: true, deployment_status: "ready" }
                : {}),
            })
            .eq("id", row.id);

          results.push({
            domain: row.domain,
            action: alreadyExists ? "updated" : "added",
            verified,
            redirect,
          });

          await new Promise(r => setTimeout(r, 200));
        } catch (e: any) {
          results.push({ domain: row.domain, action: "error", verified: false, redirect: null, error: e.message });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results, total: results.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── remove ────────────────────────────────────────────────────────────────
    if (req.method === "DELETE" && action === "remove") {
      const { domain } = await req.json();
      if (!domain) {
        return new Response(JSON.stringify({ error: "domain is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const removeRes = await vercelFetch(
        `/v9/projects/${vercelProjectId}/domains/${domain}`,
        vercelToken,
        { method: "DELETE" }
      );

      if (!removeRes.ok && removeRes.status !== 404) {
        return new Response(
          JSON.stringify({ error: removeRes.data.error?.message || "Failed to remove domain from Vercel", details: removeRes.data }),
          { status: removeRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── list ──────────────────────────────────────────────────────────────────
    if (req.method === "GET" && action === "list") {
      const listRes = await vercelFetch(`/v9/projects/${vercelProjectId}/domains`, vercelToken);

      if (!listRes.ok) {
        return new Response(
          JSON.stringify({ error: listRes.data.error?.message || "Failed to list domains", details: listRes.data }),
          { status: listRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: listRes.data }),
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
