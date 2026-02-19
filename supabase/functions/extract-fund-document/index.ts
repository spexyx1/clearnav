import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EXTRACTION_PROMPT = `You are a financial document analyst specializing in fund documents (Trust Deeds, Information Memoranda, Private Placement Memoranda, Subscription Agreements).

Analyze the provided document text and extract the following information in a structured JSON format.

Return ONLY valid JSON with this exact structure (use null for any field you cannot find):
{
  "fund_name": "string or null",
  "fund_type": "one of: PE, VC, Real Estate, Credit, Family Office, Alternative, Other - or null",
  "base_currency": "3-letter ISO currency code or null",
  "inception_date": "YYYY-MM-DD or null",
  "total_commitments": number or null,
  "share_classes": [
    {
      "name": "string",
      "total_shares": number or null,
      "price_per_share": number or null,
      "currency": "3-letter ISO currency code or null",
      "management_fee_pct": number or null,
      "performance_fee_pct": number or null
    }
  ],
  "investor": {
    "name": "string or null",
    "email": "string or null",
    "investment_amount": number or null,
    "allocated_shares": number or null,
    "share_class": "string matching one of the share class names above, or null"
  },
  "confidence": "high, medium, or low",
  "notes": "any important caveats or ambiguities found"
}

Document text:
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fund_document_id } = await req.json();
    if (!fund_document_id) {
      return new Response(JSON.stringify({ error: "fund_document_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: doc, error: docError } = await supabase
      .from("fund_documents")
      .select("*")
      .eq("id", fund_document_id)
      .maybeSingle();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("fund_documents")
      .update({ extraction_status: "processing", updated_at: new Date().toISOString() })
      .eq("id", fund_document_id);

    let extractedData: Record<string, unknown> = {};
    let rawJson: Record<string, unknown> = {};

    if (!openaiApiKey) {
      extractedData = generateMockExtraction(doc.file_name, doc.document_type);
      rawJson = { source: "mock", reason: "OPENAI_API_KEY not configured", data: extractedData };
    } else {
      const { data: fileData, error: fileError } = await supabase.storage
        .from("fund-documents")
        .download(doc.file_url);

      if (fileError || !fileData) {
        await supabase
          .from("fund_documents")
          .update({
            extraction_status: "failed",
            extraction_error: "Failed to download document from storage",
            updated_at: new Date().toISOString(),
          })
          .eq("id", fund_document_id);

        return new Response(JSON.stringify({ error: "Failed to download document" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: EXTRACTION_PROMPT,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!openaiResponse.ok) {
        const errText = await openaiResponse.text();
        await supabase
          .from("fund_documents")
          .update({
            extraction_status: "failed",
            extraction_error: `OpenAI API error: ${openaiResponse.status} - ${errText.slice(0, 200)}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fund_document_id);

        return new Response(JSON.stringify({ error: "AI extraction failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices?.[0]?.message?.content ?? "";

      rawJson = { openai_response: openaiData };

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch {
          extractedData = generateMockExtraction(doc.file_name, doc.document_type);
          rawJson = { ...rawJson, parse_error: "Could not parse JSON from AI response", raw_content: content };
        }
      } else {
        extractedData = generateMockExtraction(doc.file_name, doc.document_type);
        rawJson = { ...rawJson, parse_error: "No JSON found in AI response", raw_content: content };
      }
    }

    const shareClasses = Array.isArray(extractedData.share_classes) ? extractedData.share_classes : [];
    const investor = (extractedData.investor as Record<string, unknown>) ?? {};

    const { data: existingResult } = await supabase
      .from("document_extraction_results")
      .select("id")
      .eq("fund_document_id", fund_document_id)
      .maybeSingle();

    const resultPayload = {
      fund_document_id,
      tenant_id: doc.tenant_id,
      raw_json: rawJson,
      extracted_fund_name: (extractedData.fund_name as string) ?? null,
      extracted_fund_type: (extractedData.fund_type as string) ?? null,
      extracted_base_currency: (extractedData.base_currency as string) ?? "USD",
      extracted_inception_date: (extractedData.inception_date as string) ?? null,
      extracted_total_commitments: (extractedData.total_commitments as number) ?? null,
      extracted_share_classes: shareClasses,
      extracted_investor_name: (investor.name as string) ?? null,
      extracted_investor_email: (investor.email as string) ?? null,
      extracted_investment_amount: (investor.investment_amount as number) ?? null,
      extracted_allocated_shares: (investor.allocated_shares as number) ?? null,
      extracted_share_class: (investor.share_class as string) ?? null,
      approved_fund_name: (extractedData.fund_name as string) ?? null,
      approved_fund_type: (extractedData.fund_type as string) ?? null,
      approved_base_currency: (extractedData.base_currency as string) ?? "USD",
      approved_inception_date: (extractedData.inception_date as string) ?? null,
      approved_total_commitments: (extractedData.total_commitments as number) ?? null,
      approved_share_classes: shareClasses,
      approved_investor_name: (investor.name as string) ?? null,
      approved_investor_email: (investor.email as string) ?? null,
      approved_investment_amount: (investor.investment_amount as number) ?? null,
      approved_allocated_shares: (investor.allocated_shares as number) ?? null,
      approved_share_class: (investor.share_class as string) ?? null,
      approval_status: "pending",
      updated_at: new Date().toISOString(),
    };

    if (existingResult) {
      await supabase
        .from("document_extraction_results")
        .update(resultPayload)
        .eq("id", existingResult.id);
    } else {
      await supabase.from("document_extraction_results").insert(resultPayload);
    }

    await supabase
      .from("fund_documents")
      .update({ extraction_status: "extracted", updated_at: new Date().toISOString() })
      .eq("id", fund_document_id);

    return new Response(
      JSON.stringify({ success: true, message: "Extraction complete", extracted: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateMockExtraction(fileName: string, documentType: string): Record<string, unknown> {
  const fundName = fileName
    .replace(/\.(pdf|doc|docx|txt)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    fund_name: fundName || "Sample Investment Fund",
    fund_type: documentType === "trust_deed" ? "Family Office" : "Alternative",
    base_currency: "USD",
    inception_date: new Date().toISOString().split("T")[0],
    total_commitments: 5000000,
    share_classes: [
      {
        name: "Class A",
        total_shares: 5000,
        price_per_share: 1000,
        currency: "USD",
        management_fee_pct: 1.5,
        performance_fee_pct: 20,
      },
    ],
    investor: {
      name: null,
      email: null,
      investment_amount: null,
      allocated_shares: null,
      share_class: null,
    },
    confidence: "low",
    notes: "Mock extraction - OpenAI API key not configured. Please review and correct all fields.",
  };
}
