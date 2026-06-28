import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TELNYX_BASE = "https://api.telnyx.com/v2";

function isWithinBusinessHours(hours: any, timezone: string): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const day = parts.find(p => p.type === "weekday")?.value?.toLowerCase().slice(0, 3);
    const hour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0");
    const minute = parseInt(parts.find(p => p.type === "minute")?.value ?? "0");
    const current = hour * 60 + minute;

    const schedule = hours[day ?? ""];
    if (!schedule?.enabled) return false;

    const [startH, startM] = (schedule.start || "09:00").split(":").map(Number);
    const [endH, endM] = (schedule.end || "17:00").split(":").map(Number);
    return current >= startH * 60 + startM && current < endH * 60 + endM;
  } catch {
    return true;
  }
}

async function telnyxAction(apiKey: string, callControlId: string, action: string, payload?: unknown) {
  const res = await fetch(`${TELNYX_BASE}/calls/${callControlId}/actions/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    console.error(`Telnyx action ${action} failed:`, e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const telnyxApiKey = Deno.env.get("TELNYX_API_KEY") ?? "";

  let payload: any;
  try { payload = await req.json(); } catch {
    return new Response("ok", { headers: corsHeaders });
  }

  const eventType: string = payload.data?.event_type ?? payload.event_type ?? "";
  const callPayload = payload.data?.payload ?? payload.payload ?? {};
  const callControlId: string = callPayload.call_control_id ?? "";
  const fromNumber: string = callPayload.from ?? "";
  const toNumber: string = callPayload.to ?? "";
  const callerName: string = callPayload.caller_id_name ?? "";

  // Decode client_state if present
  let clientState: any = null;
  if (callPayload.client_state) {
    try {
      clientState = JSON.parse(atob(callPayload.client_state));
    } catch { /* ignore */ }
  }

  try {
    if (eventType === "call.initiated") {
      const direction: string = callPayload.direction ?? "inbound";

      if (direction === "inbound") {
        // Look up the phone number record by the dialed number
        const { data: phoneRecord } = await supabase
          .from("tenant_phone_numbers")
          .select("*")
          .eq("phone_number_e164", toNumber)
          .eq("status", "active")
          .maybeSingle();

        if (!phoneRecord) {
          // No mapping — hang up
          if (callControlId) await telnyxAction(telnyxApiKey, callControlId, "hangup");
          return new Response("ok", { headers: corsHeaders });
        }

        // Insert call log entry
        await supabase.from("phone_number_call_log").insert({
          tenant_id: phoneRecord.tenant_id,
          phone_number_id: phoneRecord.id,
          telnyx_call_id: callControlId,
          telnyx_call_session: callPayload.call_session_id,
          direction: "inbound",
          from_number: fromNumber,
          to_number: toNumber,
          caller_name: callerName || null,
          status: "ringing",
          started_at: new Date().toISOString(),
        });

        // Answer the call
        await telnyxAction(telnyxApiKey, callControlId, "answer");

        // Check business hours
        const withinHours = !phoneRecord.business_hours_enabled
          || isWithinBusinessHours(phoneRecord.business_hours, phoneRecord.timezone);

        if (!withinHours) {
          // After-hours routing
          if (phoneRecord.after_hours_action === "do_not_disturb") {
            await telnyxAction(telnyxApiKey, callControlId, "speak", {
              payload: "Our office is currently closed. Please call back during business hours.",
              voice: "female",
              language: "en-US",
            });
            return new Response("ok", { headers: corsHeaders });
          }

          if (phoneRecord.after_hours_action === "forward_secondary" && phoneRecord.forward_to_secondary) {
            await telnyxAction(telnyxApiKey, callControlId, "transfer", {
              to: phoneRecord.forward_to_secondary,
              from: phoneRecord.phone_number_e164,
              webhook_url: `${Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "")}/functions/v1/phone-forward-webhook`,
              client_state: btoa(JSON.stringify({ type: "transfer", phone_number_id: phoneRecord.id, tenant_id: phoneRecord.tenant_id })),
            });
            return new Response("ok", { headers: corsHeaders });
          }

          // Default after-hours: go to voicemail
          await telnyxAction(telnyxApiKey, callControlId, "speak", {
            payload: phoneRecord.voicemail_greeting_text,
            voice: "female",
            language: "en-US",
          });
          await telnyxAction(telnyxApiKey, callControlId, "record_start", {
            format: "mp3",
            channels: "single",
            play_beep: true,
          });
          return new Response("ok", { headers: corsHeaders });
        }

        if (!phoneRecord.forward_to) {
          // No forwarding configured — go to voicemail
          await telnyxAction(telnyxApiKey, callControlId, "speak", {
            payload: phoneRecord.voicemail_greeting_text,
            voice: "female",
            language: "en-US",
          });
          await telnyxAction(telnyxApiKey, callControlId, "record_start", {
            format: "mp3",
            channels: "single",
            play_beep: true,
          });
          return new Response("ok", { headers: corsHeaders });
        }

        // Whisper announcement before forwarding
        if (phoneRecord.forward_whisper_enabled) {
          await telnyxAction(telnyxApiKey, callControlId, "speak", {
            payload: "Incoming business call.",
            voice: "female",
            language: "en-US",
          });
        }

        // Transfer/forward the call
        await telnyxAction(telnyxApiKey, callControlId, "transfer", {
          to: phoneRecord.forward_to,
          from: phoneRecord.phone_number_e164,
          timeout_secs: phoneRecord.forward_ring_timeout_secs,
          webhook_url: `${Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "")}/functions/v1/phone-forward-webhook`,
          client_state: btoa(JSON.stringify({
            type: "forward",
            phone_number_id: phoneRecord.id,
            tenant_id: phoneRecord.tenant_id,
            voicemail_enabled: phoneRecord.voicemail_enabled,
            voicemail_greeting: phoneRecord.voicemail_greeting_text,
            recording_enabled: phoneRecord.recording_enabled,
          })),
        });
      }

      // Outbound bridge: tenant answered, now call the destination
      if (direction === "outbound" && clientState?.type === "outbound_bridge") {
        await telnyxAction(telnyxApiKey, callControlId, "answer");
        await telnyxAction(telnyxApiKey, callControlId, "speak", {
          payload: "Connecting your call. Please hold.",
          voice: "female",
          language: "en-US",
        });
        await telnyxAction(telnyxApiKey, callControlId, "transfer", {
          to: clientState.destination,
          from: clientState.from_number,
          webhook_url: `${Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "")}/functions/v1/phone-forward-webhook`,
          client_state: btoa(JSON.stringify({ type: "outbound_leg", phone_number_id: clientState.phone_number_id, tenant_id: clientState.tenant_id })),
        });
      }
    }

    if (eventType === "call.answered") {
      // Update call log to answered
      await supabase
        .from("phone_number_call_log")
        .update({ status: "answered", answered_at: new Date().toISOString() })
        .eq("telnyx_call_id", callControlId);
    }

    if (eventType === "call.hangup") {
      const duration = callPayload.sip_hangup_cause === "NORMAL_CLEARING"
        ? Math.round((Date.now() - (callPayload.start_time ? new Date(callPayload.start_time).getTime() : Date.now())) / 1000)
        : 0;

      const ended = new Date().toISOString();

      const { data: callRecord } = await supabase
        .from("phone_number_call_log")
        .select("id, status, tenant_id, phone_number_id")
        .eq("telnyx_call_id", callControlId)
        .maybeSingle();

      if (callRecord) {
        const finalStatus = callRecord.status === "answered" ? "answered"
          : (callPayload.hangup_cause === "ORIGINATOR_CANCEL" ? "missed" : "missed");

        await supabase
          .from("phone_number_call_log")
          .update({
            status: finalStatus,
            ended_at: ended,
            duration_seconds: Math.max(duration, 0),
            billable_seconds: callRecord.status === "answered" ? Math.max(duration, 0) : 0,
          })
          .eq("id", callRecord.id);
      }
    }

    // Recording finished — store as voicemail
    if (eventType === "call.recording.saved") {
      const recordingUrl: string = callPayload.recording_urls?.mp3 ?? callPayload.public_recording_urls?.mp3 ?? "";
      const durationMs: number = callPayload.recording_duration_millis ?? 0;

      if (!recordingUrl) return new Response("ok", { headers: corsHeaders });

      // Find the call log for this session
      const { data: callRecord } = await supabase
        .from("phone_number_call_log")
        .select("id, tenant_id, phone_number_id, from_number, caller_name")
        .eq("telnyx_call_session", callPayload.call_session_id)
        .maybeSingle();

      if (callRecord) {
        // Store voicemail
        await supabase.from("phone_number_voicemails").insert({
          tenant_id: callRecord.tenant_id,
          phone_number_id: callRecord.phone_number_id,
          call_log_id: callRecord.id,
          from_number: callRecord.from_number,
          caller_name: callRecord.caller_name,
          duration_seconds: Math.round(durationMs / 1000),
          recording_url: recordingUrl,
          received_at: new Date().toISOString(),
        });

        await supabase
          .from("phone_number_call_log")
          .update({ status: "voicemail", recording_url: recordingUrl })
          .eq("id", callRecord.id);
      }
    }

    // Transfer failed — fall back to voicemail if configured
    if (eventType === "call.speak.ended" && clientState?.type === "forward" && clientState?.voicemail_enabled) {
      // The whisper announcement finished — do nothing here (transfer handles it)
    }

  } catch (e: any) {
    console.error("phone-forward-webhook error:", e);
  }

  return new Response("ok", { headers: corsHeaders });
});
