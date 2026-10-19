import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TERM_KEYS = [
  "dealing_frequency",
  "valuation_point",
  "application_cutoff_business_days",
  "redemption_notice_days",
  "redemption_gate_pct",
  "launch_unit_price",
  "minimum_initial_investment",
  "minimum_additional_investment",
  "management_fee_pct",
  "performance_fee_pct",
  "fee_frequency",
  "hurdle_rate_pct",
  "high_water_mark",
  "application_money_handling",
  "units_issued_when",
];

const EXTRACTION_PROMPT = `You are reading a unit trust's Trust Deed or Information Memorandum.
Extract ONLY what the document states. Never guess. If a term is not stated, set it to null.
For every term return { "value": ..., "clause": "clause/section number or heading", "page": number or null, "quote": "short verbatim quote (max 200 chars)" }.

Return ONLY JSON:
{
  "fund_name": term,
  "base_currency": term,
  "terms": {
    "dealing_frequency": term (value one of "daily","weekly","monthly","quarterly"),
    "valuation_point": term (text, e.g. "close of business on the last business day of each month"),
    "application_cutoff_business_days": term (number of business days before the dealing day),
    "redemption_notice_days": term (number of days notice for withdrawals),
    "redemption_gate_pct": term (number or null),
    "launch_unit_price": term (number),
    "minimum_initial_investment": term (number),
    "minimum_additional_investment": term (number),
    "management_fee_pct": term (annual %, number),
    "performance_fee_pct": term (%, number),
    "fee_frequency": term (value one of "monthly","quarterly","semi_annual","annual"),
    "hurdle_rate_pct": term (number or null),
    "high_water_mark": term (boolean),
    "application_money_handling": term (text),
    "units_issued_when": term (text)
  },
  "share_classes": [ { "name": string, "management_fee_pct": term, "performance_fee_pct": term, "hurdle_rate_pct": term, "minimum_investment": term } ],
  "notes": "ambiguities, conflicts between documents, anything needing a human decision"
}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function termValue(t: unknown): unknown {
  if (t && typeof t === "object" && "value" in (t as Record<string, unknown>)) {
    return (t as Record<string, unknown>).value;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { fund_document_id } = await req.json();
    if (!fund_document_id) return json({ error: "fund_document_id is required" }, 400);

    const { data: doc } = await supabase
      .from("fund_documents")
      .select("*")
      .eq("id", fund_document_id)
      .maybeSingle();
    if (!doc) return json({ error: "Document not found" }, 404);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("tenant_id, role_category")
      .eq("user_id", user.id)
      .in("role_category", ["tenant_admin", "staff_user", "superadmin"]);
    const allowed = (roles ?? []).some(
      (r) => r.role_category === "superadmin" || r.tenant_id === doc.tenant_id,
    );
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const setStatus = (extraction_status: string, extraction_error: string | null) =>
      supabase
        .from("fund_documents")
        .update({ extraction_status, extraction_error, updated_at: new Date().toISOString() })
        .eq("id", fund_document_id);

    if (!openaiApiKey) {
      await setStatus("awaiting_review", "Stored safely. Terms will be filled in by a reviewer for your approval.");
      return json({ success: true, status: "awaiting_review" });
    }

    await setStatus("processing", null);

    const { data: fileData, error: fileError } = await supabase.storage
      .from("fund-documents")
      .download(doc.file_url);
    if (fileError || !fileData) {
      await setStatus("failed", "The document could not be opened from storage.");
      return json({ error: "Failed to download document" }, 500);
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const lowerName = String(doc.file_name).toLowerCase();
    let documentPart: Record<string, unknown>;
    if (lowerName.endsWith(".pdf")) {
      documentPart = {
        type: "file",
        file: { filename: doc.file_name, file_data: `data:application/pdf;base64,${encodeBase64(bytes)}` },
      };
    } else if (lowerName.endsWith(".txt")) {
      documentPart = { type: "text", text: new TextDecoder().decode(bytes).slice(0, 400_000) };
    } else {
      await setStatus("awaiting_review", "Word files can't be read automatically. Upload a PDF, or a reviewer will fill in the terms.");
      return json({ success: true, status: "awaiting_review" });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 6000,
        messages: [{ role: "user", content: [{ type: "text", text: EXTRACTION_PROMPT }, documentPart] }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      await setStatus("failed", `The document reader returned an error (${aiResponse.status}). ${errText.slice(0, 160)}`);
      return json({ error: "AI extraction failed" }, 502);
    }

    const aiData = await aiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content ?? "";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      await setStatus("failed", "The document reader's answer could not be understood. Try again.");
      return json({ error: "Unparseable AI response" }, 502);
    }

    const rawTerms = (parsed.terms ?? {}) as Record<string, unknown>;
    const terms: Record<string, unknown> = {};
    for (const key of TERM_KEYS) terms[key] = rawTerms[key] ?? null;
    const shareClasses = Array.isArray(parsed.share_classes) ? parsed.share_classes : [];

    const payload = {
      fund_document_id,
      tenant_id: doc.tenant_id,
      raw_json: { source: "ai", notes: parsed.notes ?? null },
      extraction_source: "ai",
      extracted_fund_name: (termValue(parsed.fund_name) as string) ?? null,
      extracted_base_currency: (termValue(parsed.base_currency) as string) ?? null,
      extracted_share_classes: shareClasses,
      extracted_terms: terms,
      approved_terms: terms,
      approved_share_classes: shareClasses,
      approval_status: "pending",
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("document_extraction_results")
      .select("id")
      .eq("fund_document_id", fund_document_id)
      .maybeSingle();
    const write = existing
      ? await supabase.from("document_extraction_results").update(payload).eq("id", existing.id)
      : await supabase.from("document_extraction_results").insert(payload);
    if (write.error) {
      await setStatus("failed", "The results could not be saved.");
      return json({ error: write.error.message }, 500);
    }

    await setStatus("extracted", null);
    return json({ success: true, status: "extracted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
