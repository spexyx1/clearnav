import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyHmacSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = hexToBytes(signature);
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body));
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("DIDIT_WEBHOOK_SECRET");

    const rawBody = await req.text();

    if (webhookSecret) {
      const signature = req.headers.get("x-signature-v2") || req.headers.get("x-signature");
      if (!signature) {
        console.warn("Missing Didit webhook signature header");
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const valid = await verifyHmacSignature(rawBody, signature, webhookSecret);
      if (!valid) {
        console.warn("Invalid Didit webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const { session_id, status, vendor_data, decision } = payload;

    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: kycRecord } = await supabase
      .from("kyc_aml_records")
      .select("id, contact_id, tenant_id")
      .eq("didit_session_id", session_id)
      .maybeSingle();

    if (!kycRecord) {
      console.warn("No KYC record found for session_id:", session_id);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const diditStatus = status as string;
    const isFinal = ["Approved", "Declined", "Abandoned"].includes(diditStatus);
    const isInReview = diditStatus === "In Review";

    let idVerificationStatus = "pending";
    let amlScreeningStatus = "pending";

    if (diditStatus === "Approved") {
      idVerificationStatus = "verified";
      amlScreeningStatus = "verified";
    } else if (diditStatus === "Declined") {
      idVerificationStatus = "rejected";
      amlScreeningStatus = "rejected";
    } else if (isInReview) {
      idVerificationStatus = "in_review";
      amlScreeningStatus = "in_review";
    } else if (diditStatus === "Abandoned") {
      idVerificationStatus = "pending";
      amlScreeningStatus = "pending";
    }

    const amlHits = decision?.aml?.hits || decision?.aml_screening?.hits || null;
    const idData = decision?.kyc || decision?.id_verification || null;

    const updatePayload: Record<string, unknown> = {
      didit_session_status: diditStatus,
      id_verification_status: idVerificationStatus,
      aml_screening_status: amlScreeningStatus,
      updated_at: new Date().toISOString(),
    };

    if (isFinal || isInReview) {
      updatePayload.verification_completed_at = new Date().toISOString();
      updatePayload.didit_decision_data = decision || payload;
    }

    if (amlHits) {
      updatePayload.didit_aml_hits = amlHits;
    }

    if (idData) {
      updatePayload.didit_id_data = idData;
    }

    if (idData?.first_name || idData?.last_name) {
      const fullName = [idData.first_name, idData.last_name].filter(Boolean).join(" ");
      if (fullName) updatePayload.full_legal_name = fullName;
    }

    if (idData?.date_of_birth) {
      updatePayload.date_of_birth = idData.date_of_birth;
    }

    if (idData?.nationality) {
      updatePayload.citizenship = idData.nationality;
    }

    if (diditStatus === "Approved") {
      updatePayload.verified_at = new Date().toISOString();
    }

    await supabase
      .from("kyc_aml_records")
      .update(updatePayload)
      .eq("id", kycRecord.id);

    if (diditStatus === "Approved" && kycRecord.contact_id) {
      await supabase
        .from("onboarding_workflows")
        .update({ kyc_aml_completed: true })
        .eq("contact_id", kycRecord.contact_id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
