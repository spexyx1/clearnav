import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Resend Inbound Email Webhook
 *
 * Resend POSTs a JSON payload to this endpoint for every email received at
 * a clearnav.cv address that matches the inbound routing rule configured in
 * the Resend dashboard.
 *
 * Resend inbound payload shape (simplified):
 * {
 *   "id": "evt_...",
 *   "type": "email.received",           // may also be present
 *   "data": {
 *     "id": "msg_...",
 *     "from": "Sender Name <sender@example.com>",
 *     "to": ["recipient@clearnav.cv"],
 *     "reply_to": ["reply@example.com"],
 *     "subject": "Hello",
 *     "html": "<p>...</p>",
 *     "text": "...",
 *     "headers": { ... },
 *     "created_at": "2026-04-26T12:00:00.000Z"
 *   }
 * }
 *
 * Resend does NOT sign inbound webhooks with a secret the same way outbound
 * webhooks work — it is authenticated by the URL being secret. We additionally
 * validate the RESEND_INBOUND_SECRET query-param if configured.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** Parse "Display Name <addr@example.com>" or bare "addr@example.com" */
function parseAddress(raw: string | undefined | null): { email: string; name: string } {
  if (!raw) return { email: "", name: "" };
  const match = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { email: match[2].trim().toLowerCase(), name: match[1].replace(/^["']|["']$/g, "").trim() };
  }
  return { email: raw.trim().toLowerCase(), name: "" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Optional shared-secret validation
    const inboundSecret = Deno.env.get("RESEND_INBOUND_SECRET");
    if (inboundSecret) {
      const url = new URL(req.url);
      const provided = url.searchParams.get("secret") || req.headers.get("x-resend-secret");
      if (provided !== inboundSecret) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let rawBody: string;
    try {
      rawBody = await req.text();
    } catch {
      return new Response(JSON.stringify({ error: "Failed to read request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resend wraps the email in a `data` key for webhook events
    const email = payload.data ?? payload;

    // Extract fields
    const providerId: string | null = email.id ?? payload.id ?? null;
    const rawFrom: string = Array.isArray(email.from) ? email.from[0] : (email.from ?? "");
    const rawTo: string = Array.isArray(email.to) ? email.to[0] : (email.to ?? "");
    const rawReplyTo: string | null = Array.isArray(email.reply_to)
      ? (email.reply_to[0] ?? null)
      : (email.reply_to ?? null);

    const from = parseAddress(rawFrom);
    const to   = parseAddress(rawTo);

    const subject: string  = email.subject ?? "(no subject)";
    const bodyHtml: string | null = email.html ?? null;
    const bodyText: string | null = email.text ?? null;
    const receivedAt: string      = email.created_at ?? new Date().toISOString();
    const headers: object         = email.headers ?? {};

    if (!to.email) {
      return new Response(JSON.stringify({ error: "Missing to address" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Write audit log ────────────────────────────────────────────────────
    const { data: logEntry, error: logError } = await supabase
      .from("inbound_email_log")
      .insert({
        provider_id:  providerId,
        to_address:   to.email,
        from_address: from.email,
        subject,
        raw_payload:  payload,
        status:       "pending",
      })
      .select("id")
      .maybeSingle();

    if (logError) {
      // If the error is a unique violation on provider_id, it is a duplicate delivery
      if (logError.code === "23505") {
        return new Response(JSON.stringify({ ok: true, status: "duplicate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Failed to write inbound log:", logError);
    }

    const logId: string | null = logEntry?.id ?? null;

    // ── 2. Route via stored procedure ─────────────────────────────────────────
    const { data: routeResult, error: routeError } = await supabase.rpc(
      "route_inbound_email",
      {
        p_to_address:   to.email,
        p_from_address: from.email,
        p_from_name:    from.name,
        p_subject:      subject,
        p_body_html:    bodyHtml,
        p_body_text:    bodyText,
        p_provider_id:  providerId,
        p_received_at:  receivedAt,
        p_reply_to:     rawReplyTo ? parseAddress(rawReplyTo).email : null,
        p_headers:      headers,
      }
    );

    // ── 3. Update audit log with outcome ──────────────────────────────────────
    if (logId) {
      const routed: boolean    = !routeError && routeResult?.routed === true;
      const reason: string     = routeResult?.reason ?? (routeError?.message ?? "");
      const messageId: string | null = routeResult?.message_id ?? null;

      let finalStatus: string;
      if (routed) {
        finalStatus = "routed";
      } else if (reason === "duplicate") {
        finalStatus = "duplicate";
      } else {
        finalStatus = "undeliverable";
      }

      await supabase
        .from("inbound_email_log")
        .update({
          status:       finalStatus,
          message_id:   messageId,
          error_detail: routeError?.message ?? (reason !== "routed" ? reason : null),
          processed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    if (routeError) {
      console.error("route_inbound_email error:", routeError);
      // Return 200 to Resend so it does not retry on application errors
      return new Response(
        JSON.stringify({ ok: false, error: routeError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, ...routeResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("resend-inbound unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
