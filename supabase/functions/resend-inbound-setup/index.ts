import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const inboundSecret = Deno.env.get("RESEND_INBOUND_SECRET");
    if (!resendKey || !inboundSecret) return json({ error: "Mail service is not configured" }, 503);

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    if (token !== serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: userData, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
      const { data: roles } = await admin
        .from("user_roles")
        .select("role_category")
        .eq("user_id", userData.user.id)
        .eq("status", "active")
        .in("role_category", ["superadmin", "tenant_admin"]);
      if (!roles || roles.length === 0) return json({ error: "Forbidden" }, 403);
    }

    const base = `${supabaseUrl}/functions/v1/resend-inbound`;
    const target = `${base}?secret=${encodeURIComponent(inboundSecret)}`;
    const headers = { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" };

    const listRes = await fetch("https://api.resend.com/webhooks", { headers });
    if (!listRes.ok) return json({ error: `Resend rejected the request (${listRes.status})` }, 502);
    const list = await listRes.json();
    const hooks: Array<{ id: string; endpoint: string; events?: string[]; status?: string }> =
      Array.isArray(list?.data) ? list.data : [];

    const existing = hooks.find((h) => typeof h.endpoint === "string" && h.endpoint.startsWith(base));

    if (existing) {
      const correct =
        existing.endpoint === target &&
        (existing.events || []).includes("email.received") &&
        existing.status !== "disabled";
      if (correct) return json({ status: "already_connected", webhook_id: existing.id });

      const events = Array.from(new Set([...(existing.events || []), "email.received"]));
      const upd = await fetch(`https://api.resend.com/webhooks/${existing.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ endpoint: target, events, status: "enabled" }),
      });
      if (!upd.ok) return json({ error: `Could not update the Resend webhook (${upd.status})` }, 502);
      return json({ status: "updated", webhook_id: existing.id });
    }

    const createRes = await fetch("https://api.resend.com/webhooks", {
      method: "POST",
      headers,
      body: JSON.stringify({ endpoint: target, events: ["email.received"] }),
    });
    if (!createRes.ok) {
      const detail = await createRes.text();
      return json({ error: `Could not create the Resend webhook (${createRes.status})`, detail }, 502);
    }
    const created = await createRes.json();
    return json({ status: "created", webhook_id: created?.id ?? null });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
