import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SYMBOL_RE = /^[A-Za-z0-9.\- ]{1,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toYahoo(symbol: string) {
  return symbol.trim().toUpperCase().replace(/\s+/g, "-").replace(/\./g, "-");
}

async function fetchDailyCloses(symbol: string, from: number, to: number): Promise<Array<[string, number]>> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahoo(symbol))}?period1=${from}&period2=${to}&interval=1d&events=div,split`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ArklineFundPricing/1.0)" } });
  if (!res.ok) throw new Error(`price source returned ${res.status}`);
  const data = await res.json();
  const r = data?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
  const out: Array<[string, number]> = [];
  ts.forEach((t, i) => {
    const c = closes[i];
    if (typeof c === "number" && Number.isFinite(c)) out.push([new Date(t * 1000).toISOString().slice(0, 10), c]);
  });
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const symbols: string[] = Array.isArray(body?.symbols) ? body.symbols.filter((s: unknown) => typeof s === "string" && SYMBOL_RE.test(s)).slice(0, 60) : [];
    const dates: string[] = Array.isArray(body?.dates) ? body.dates.filter((d: unknown) => typeof d === "string" && DATE_RE.test(d)).slice(0, 36) : [];
    if (!symbols.length || !dates.length) return json({ error: "symbols and dates are required" }, 400);

    const sorted = [...dates].sort();
    const from = Math.floor(new Date(`${sorted[0]}T00:00:00Z`).getTime() / 1000) - 12 * 86400;
    const to = Math.floor(new Date(`${sorted[sorted.length - 1]}T23:59:59Z`).getTime() / 1000) + 86400;

    const prices: Record<string, Record<string, number>> = {};
    const errors: Record<string, string> = {};
    await Promise.all(symbols.map(async (symbol) => {
      try {
        const series = await fetchDailyCloses(symbol, from, to);
        if (!series.length) { errors[symbol] = "no prices found"; return; }
        prices[symbol] = {};
        for (const d of dates) {
          let last: number | null = null;
          for (const [day, close] of series) {
            if (day <= d) last = close; else break;
          }
          if (last !== null) prices[symbol][d] = Math.round(last * 10000) / 10000;
        }
      } catch (e) {
        errors[symbol] = e instanceof Error ? e.message : "lookup failed";
      }
    }));

    return json({ prices, errors });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Price lookup failed" }, 500);
  }
});
