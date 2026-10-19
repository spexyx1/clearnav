import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BASE = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_RE = /^[0-9A-Za-z]{10,64}$/;
const QUERY_RE = /^[0-9]{3,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UA = { "User-Agent": "FundAdmin/1.0" };
const SECTION_TAGS = [
  "AccountInformation", "EquitySummaryByReportDateInBase", "ChangeInNAV", "PriorPeriodPosition", "OpenPosition",
  "Trade", "CashTransaction", "Transfer", "CashReportCurrency", "CorporateAction", "ConversionRate",
];

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? "";

function friendly(code: string, message: string) {
  if (code === "1012" || /expired/i.test(message)) return "The access code has expired. Create a new one in Interactive Brokers and reconnect.";
  if (code === "1015" || /invalid/i.test(message) && /token/i.test(message)) return "Interactive Brokers did not accept the access code. Check it was copied in full.";
  if (code === "1014" || /query/i.test(message)) return "Interactive Brokers could not find that report number. Check the Flex Query ID.";
  if (code === "1018" || /too many/i.test(message)) return "Interactive Brokers is limiting requests right now. Please try again in a few minutes.";
  if (code === "1013" || /ip/i.test(message)) return "Interactive Brokers rejected the request because of an address restriction on the access code. Remove the IP restriction in Flex Web Service settings.";
  return message || "Interactive Brokers could not produce the report.";
}

async function sendRequest(token: string, queryId: string) {
  const res = await fetch(`${BASE}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`, { headers: UA });
  const body = await res.text();
  if (tag(body, "Status") !== "Success") throw new Error(friendly(tag(body, "ErrorCode"), tag(body, "ErrorMessage")));
  const ref = tag(body, "ReferenceCode");
  if (!/^\d+$/.test(ref)) throw new Error("Interactive Brokers did not return a report reference.");
  let url = `${BASE}/GetStatement`;
  const given = tag(body, "Url");
  try {
    const u = new URL(given);
    if (u.protocol === "https:" && u.hostname.endsWith(".interactivebrokers.com")) url = `${u.origin}${u.pathname}`;
  } catch { /* keep default */ }
  return { ref, url };
}

async function getStatement(token: string, ref: string, url: string) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const res = await fetch(`${url}?t=${encodeURIComponent(token)}&q=${ref}&v=3`, { headers: UA });
    const body = await res.text();
    if (body.includes("<FlexQueryResponse")) return body;
    const code = tag(body, "ErrorCode");
    const status = tag(body, "Status");
    if (status === "Warn" || code === "1019" || code === "1001" || code === "1004") {
      await new Promise((r) => setTimeout(r, 4000));
      continue;
    }
    throw new Error(friendly(code, tag(body, "ErrorMessage")));
  }
  throw new Error("Interactive Brokers is still preparing the report. Please try again in a minute.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Please sign in again." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const fundId = String(body.fund_id ?? "");
    if (!UUID_RE.test(fundId)) return json({ error: "Unknown fund." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: fund } = await admin.from("funds").select("id, tenant_id").eq("id", fundId).maybeSingle();
    if (!fund) return json({ error: "Unknown fund." }, 404);

    const [{ data: isAdmin }, { data: isStaff }] = await Promise.all([
      userClient.rpc("user_is_tenant_admin", { user_id: u.user.id, tenant_id: fund.tenant_id }),
      userClient.rpc("is_investor_app_staff", { p_tenant_id: fund.tenant_id }),
    ]);
    if (!isAdmin && !isStaff) return json({ error: "You do not have permission to manage this fund's broker connection." }, 403);

    if (action === "connect") {
      const token = String(body.token ?? "").trim();
      const queryId = String(body.query_id ?? "").trim();
      const expires = body.token_expires_on ? String(body.token_expires_on) : null;
      if (!TOKEN_RE.test(token)) return json({ error: "The access code should be the long number shown in Interactive Brokers." }, 400);
      if (!QUERY_RE.test(queryId)) return json({ error: "The Flex Query ID should be a number." }, 400);
      if (expires && !DATE_RE.test(expires)) return json({ error: "Enter the expiry date as a date." }, 400);
      try {
        await sendRequest(token, queryId);
      } catch (e) {
        return json({ error: (e as Error).message }, 422);
      }
      const { error } = await admin.from("ibkr_flex_connections").upsert({
        tenant_id: fund.tenant_id, fund_id: fundId, query_id: queryId, token, token_expires_on: expires,
        last_status: "connected", last_error: null, created_by: u.user.id, updated_at: new Date().toISOString(),
      }, { onConflict: "fund_id" });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "disconnect") {
      const { error } = await admin.from("ibkr_flex_connections").delete().eq("fund_id", fundId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "fetch") {
      const { data: conn } = await admin.from("ibkr_flex_connections").select("id, token, query_id").eq("fund_id", fundId).maybeSingle();
      if (!conn) return json({ error: "Interactive Brokers is not connected for this fund." }, 404);
      try {
        const { ref, url } = await sendRequest(conn.token, conn.query_id);
        const xml = await getStatement(conn.token, ref, url);
        const sections_found = SECTION_TAGS.filter((t) => xml.includes(`<${t} `) || xml.includes(`<${t}>`) || xml.includes(`<${t}/`));
        await admin.from("ibkr_flex_connections").update({ last_sync_at: new Date().toISOString(), last_status: "ok", last_error: null, sections_found, updated_at: new Date().toISOString() }).eq("id", conn.id);
        return json({ xml });
      } catch (e) {
        const message = (e as Error).message;
        await admin.from("ibkr_flex_connections").update({ last_status: "error", last_error: message, updated_at: new Date().toISOString() }).eq("id", conn.id);
        return json({ error: message }, 422);
      }
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    console.error("ibkr-flex-sync failed", e);
    return json({ error: "Something went wrong talking to Interactive Brokers. Please try again." }, 500);
  }
});
