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
const CCY_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SUFFIXES: Record<string, string[]> = {
  JPY: [".T"],
  CHF: [".SW"],
  CAD: [".TO", ".V", ".NE", ".CN"],
  AUD: [".AX"],
  GBP: [".L"],
  HKD: [".HK"],
  EUR: [".DE", ".PA", ".AS", ".MI", ".MC", ".BR", ".F"],
  SEK: [".ST"],
  NOK: [".OL"],
  DKK: [".CO"],
  SGD: [".SI"],
  NZD: [".NZ"],
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const OPTION_RE = /^([A-Z0-9.]+)\s+(\d{2})([A-Z]{3})(\d{2})\s+([\d.]+)\s+([CP])$/;

function occSymbol(s: string): string | null {
  const m = s.match(OPTION_RE);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[3]);
  if (mi < 0) return null;
  const strike = String(Math.round(parseFloat(m[5]) * 1000)).padStart(8, "0");
  return `${m[1].replace(/\./g, "")}${m[4]}${String(mi + 1).padStart(2, "0")}${m[2]}${m[6]}${strike}`;
}

function candidates(symbol: string, currency: string): string[] {
  const s = symbol.trim().toUpperCase();
  const occ = occSymbol(s);
  if (occ) return [occ];
  if (currency !== "USD" && /\.(T|SW|TO|V|AX|L|HK|DE|PA|AS|MI)$/.test(s)) return [s];
  const base = s.replace(/\s+/g, "-").replace(/\./g, "-");
  const list = SUFFIXES[currency];
  if (!list) return [base];
  const local = currency === "HKD" ? base.padStart(4, "0") : base;
  return list.map((x) => `${local}${x}`);
}

async function fetchDailyCloses(ticker: string, from: number, to: number) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${from}&period2=${to}&interval=1d&events=split`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ArklineFundPricing/1.0)" } });
  if (!res.ok) throw new Error(`price source returned ${res.status}`);
  const data = await res.json();
  const r = data?.chart?.result?.[0];
  const quoteCcy: string = r?.meta?.currency ?? "";
  const scale = quoteCcy === "GBp" || quoteCcy === "ZAc" || quoteCcy === "ILA" ? 0.01 : 1;
  const ts: number[] = r?.timestamp ?? [];
  const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
  // Closes are back-adjusted for later splits; undo that so prices match the share counts held on each date.
  const splits = Object.values((r?.events?.splits ?? {}) as Record<string, { date: number; numerator: number; denominator: number }>)
    .filter((s) => s.numerator > 0 && s.denominator > 0);
  const out: Array<[string, number]> = [];
  ts.forEach((t, i) => {
    const c = closes[i];
    if (typeof c !== "number" || !Number.isFinite(c)) return;
    const factor = splits.filter((s) => s.date > t).reduce((f, s) => f * (s.numerator / s.denominator), 1);
    out.push([new Date(t * 1000).toISOString().slice(0, 10), c * scale * factor]);
  });
  return out;
}

function pick(series: Array<[string, number]>, dates: string[]) {
  const out: Record<string, number> = {};
  for (const d of dates) {
    let last: number | null = null;
    for (const [day, close] of series) {
      if (day <= d) last = close; else break;
    }
    if (last !== null) out[d] = Math.round(last * 1e6) / 1e6;
  }
  return out;
}

async function inBatches<T>(list: T[], size: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < list.length; i += size) await Promise.all(list.slice(i, i + size).map(fn));
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
    const items: Array<{ symbol: string; currency: string }> = [];
    if (Array.isArray(body?.items)) {
      for (const it of body.items) {
        if (typeof it?.symbol === "string" && SYMBOL_RE.test(it.symbol)) {
          items.push({ symbol: it.symbol, currency: typeof it.currency === "string" && CCY_RE.test(it.currency) ? it.currency : "USD" });
        }
      }
    }
    if (Array.isArray(body?.symbols)) {
      for (const s of body.symbols) if (typeof s === "string" && SYMBOL_RE.test(s)) items.push({ symbol: s, currency: "USD" });
    }
    const fx: string[] = Array.isArray(body?.fx) ? body.fx.filter((c: unknown) => typeof c === "string" && CCY_RE.test(c) && c !== "USD").slice(0, 20) : [];
    const dates: string[] = Array.isArray(body?.dates) ? body.dates.filter((d: unknown) => typeof d === "string" && DATE_RE.test(d)).slice(0, 48) : [];
    const limited = items.slice(0, 200);
    if ((!limited.length && !fx.length) || !dates.length) return json({ error: "symbols and dates are required" }, 400);

    const sorted = [...dates].sort();
    const from = Math.floor(new Date(`${sorted[0]}T00:00:00Z`).getTime() / 1000) - 12 * 86400;
    const to = Math.floor(Date.now() / 1000);

    const prices: Record<string, Record<string, number>> = {};
    const tickers: Record<string, string> = {};
    const rates: Record<string, Record<string, number>> = {};
    const errors: Record<string, string> = {};

    await inBatches(limited, 10, async ({ symbol, currency }) => {
      for (const ticker of candidates(symbol, currency)) {
        try {
          const series = await fetchDailyCloses(ticker, from, to);
          if (!series.length) continue;
          prices[symbol] = pick(series, dates);
          tickers[symbol] = ticker;
          return;
        } catch {
          // try the next exchange
        }
      }
      errors[symbol] = "no prices found";
    });

    await inBatches(fx, 10, async (ccy) => {
      try {
        const series = await fetchDailyCloses(`${ccy}USD=X`, from, to);
        if (series.length) rates[ccy] = pick(series, dates);
        else errors[`FX:${ccy}`] = "no rate found";
      } catch {
        errors[`FX:${ccy}`] = "rate lookup failed";
      }
    });

    return json({ prices, tickers, rates, errors });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Price lookup failed" }, 500);
  }
});
