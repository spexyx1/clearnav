import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Format E.164 number to display: +15551234567 → +1 (555) 123-4567 */
function formatPhoneDisplay(e164: string): string {
  if (!e164.startsWith('+1') || e164.length !== 12) return e164;
  const n = e164.slice(2);
  return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}

/** Extract area code from E.164 US number */
function extractAreaCode(e164: string): string {
  if (!e164.startsWith('+1') || e164.length < 5) return '';
  return e164.slice(2, 5);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return err("Unauthorized", 401);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return err("Unauthorized", 401);

  // Get tenant ID for this user
  const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
  if (!tenantId) return err("Tenant not found", 403);

  // Get platform Telnyx API key
  const telnyxApiKey = Deno.env.get("TELNYX_API_KEY");
  if (!telnyxApiKey) return err("Telnyx API key not configured", 503);

  const TELNYX_BASE = "https://api.telnyx.com/v2";

  async function telnyxRequest(endpoint: string, method = "GET", body?: unknown) {
    const res = await fetch(`${TELNYX_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${telnyxApiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.errors?.[0]?.detail || e.message || `Telnyx ${method} ${endpoint} failed: ${res.status}`);
    }
    return res.json();
  }

  let body: any;
  try { body = await req.json(); } catch { return err("Invalid JSON"); }

  const { action } = body;

  try {
    // ── SEARCH ──────────────────────────────────────────────────────────────
    if (action === "search") {
      const { country_code = "US", area_code, number_type = "local", limit = 20 } = body;

      const params = new URLSearchParams();
      params.set("filter[country_code]", country_code.toUpperCase());
      params.set("page[size]", String(Math.min(limit, 50)));

      if (number_type === "toll_free") {
        params.set("filter[phone_number_type]", "toll_free");
      } else if (number_type === "international") {
        params.set("filter[phone_number_type]", "local");
      } else {
        params.set("filter[phone_number_type]", "local");
      }

      if (area_code && country_code.toUpperCase() === "US") {
        params.set("filter[national_destination_code]", area_code);
      }

      const result = await telnyxRequest(`/available_phone_numbers?${params.toString()}`);

      const numbers = (result.data || []).map((n: any) => ({
        phone_number: n.phone_number,
        phone_number_display: formatPhoneDisplay(n.phone_number),
        number_type: n.number_type,
        country_code: n.country_code,
        region_information: n.region_information,
        features: n.features,
        cost: {
          monthly_cost: n.cost?.monthly_cost?.amount ?? "1.00",
          upfront_cost: n.cost?.upfront_cost?.amount ?? "0.00",
          currency: n.cost?.monthly_cost?.currency ?? "USD",
        },
      }));

      return ok({ numbers });
    }

    // ── PURCHASE ────────────────────────────────────────────────────────────
    if (action === "purchase") {
      const { phone_number, label } = body;
      if (!phone_number) return err("phone_number required");

      // Ensure tenant doesn't already own this number
      const { data: existing } = await supabase
        .from("tenant_phone_numbers")
        .select("id")
        .eq("phone_number_e164", phone_number)
        .maybeSingle();
      if (existing) return err("You already own this phone number");

      // Get platform's Telnyx connection ID (if configured)
      const connectionId = Deno.env.get("TELNYX_CONNECTION_ID") || undefined;

      // Purchase from Telnyx
      const purchasePayload: any = { phone_number };
      if (connectionId) purchasePayload.connection_id = connectionId;

      const purchased = await telnyxRequest("/phone_numbers", "POST", purchasePayload);
      const telnyxId = purchased.data?.id;

      // Configure webhook on the number to point to our forwarding handler
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "")}/functions/v1/phone-forward-webhook`;
      if (telnyxId) {
        try {
          await telnyxRequest(`/phone_numbers/${telnyxId}`, "PATCH", {
            webhook_url: webhookUrl,
          });
        } catch (e) {
          console.warn("Failed to set webhook on phone number:", e);
        }
      }

      const e164 = purchased.data?.phone_number || phone_number;
      const numberType = purchased.data?.phone_number_type === "toll_free" ? "toll_free"
        : (purchased.data?.phone_number_type === "national" ? "international" : "local");
      const countryCode = purchased.data?.country_code || "US";

      // Store in database
      const nextRenewal = new Date();
      nextRenewal.setMonth(nextRenewal.getMonth() + 1);

      const { data: record, error: dbError } = await supabase
        .from("tenant_phone_numbers")
        .insert({
          tenant_id: tenantId,
          phone_number: formatPhoneDisplay(e164),
          phone_number_e164: e164,
          telnyx_phone_number_id: telnyxId,
          number_type: numberType,
          country_code: countryCode,
          area_code: extractAreaCode(e164),
          label: label || null,
          monthly_cost_usd: numberType === "toll_free" ? 2.00 : 1.00,
          next_renewal_date: nextRenewal.toISOString().split("T")[0],
          created_by: user.id,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return ok({ success: true, phone_number: record });
    }

    // ── UPDATE SETTINGS ─────────────────────────────────────────────────────
    if (action === "update") {
      const { id, ...updates } = body;
      if (!id) return err("id required");

      const allowed = [
        "label", "forward_to", "forward_to_secondary",
        "forward_whisper_enabled", "forward_ring_timeout_secs",
        "business_hours_enabled", "business_hours", "timezone",
        "after_hours_action", "voicemail_enabled", "voicemail_greeting_text",
        "recording_enabled",
      ];

      const safeUpdates: Record<string, unknown> = {};
      for (const k of allowed) {
        if (k in updates) safeUpdates[k] = updates[k];
      }

      const { data: record, error: dbError } = await supabase
        .from("tenant_phone_numbers")
        .update(safeUpdates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (dbError) throw dbError;
      return ok({ success: true, phone_number: record });
    }

    // ── RELEASE ─────────────────────────────────────────────────────────────
    if (action === "release") {
      const { id } = body;
      if (!id) return err("id required");

      const { data: record } = await supabase
        .from("tenant_phone_numbers")
        .select("telnyx_phone_number_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

      if (!record) return err("Phone number not found", 404);

      // Release from Telnyx
      if (record.telnyx_phone_number_id) {
        try {
          await telnyxRequest(`/phone_numbers/${record.telnyx_phone_number_id}`, "DELETE");
        } catch (e) {
          console.warn("Telnyx release failed (may already be released):", e);
        }
      }

      // Mark as released in DB
      await supabase
        .from("tenant_phone_numbers")
        .update({ status: "released", released_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      return ok({ success: true });
    }

    // ── OUTBOUND CALL ────────────────────────────────────────────────────────
    if (action === "call") {
      const { phone_number_id, destination } = body;
      if (!phone_number_id || !destination) return err("phone_number_id and destination required");

      const { data: ownNumber } = await supabase
        .from("tenant_phone_numbers")
        .select("*")
        .eq("id", phone_number_id)
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .single();

      if (!ownNumber) return err("Phone number not found", 404);
      if (!ownNumber.forward_to) return err("No forwarding number configured — set a forwarding number first");

      const connectionId = Deno.env.get("TELNYX_CONNECTION_ID");
      if (!connectionId) return err("Telnyx connection not configured", 503);

      const webhookUrl = `${Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "")}/functions/v1/phone-forward-webhook`;

      // Initiate: first call the tenant's mobile, then bridge to destination
      const callResult = await telnyxRequest("/calls", "POST", {
        connection_id: connectionId,
        to: ownNumber.forward_to,
        from: ownNumber.phone_number_e164,
        webhook_url: webhookUrl,
        client_state: Buffer.from(JSON.stringify({
          type: "outbound_bridge",
          destination,
          phone_number_id,
          tenant_id: tenantId,
        })).toString("base64"),
      });

      // Log the outbound call
      await supabase.from("phone_number_call_log").insert({
        tenant_id: tenantId,
        phone_number_id,
        telnyx_call_id: callResult.data?.call_control_id,
        direction: "outbound",
        from_number: ownNumber.phone_number_e164,
        to_number: destination,
        status: "initiated",
        started_at: new Date().toISOString(),
      });

      return ok({ success: true, call_control_id: callResult.data?.call_control_id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e: any) {
    console.error("phone-number-provision error:", e);
    return err(e.message || "Internal error", 500);
  }
});
