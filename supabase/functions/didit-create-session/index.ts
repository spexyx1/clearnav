import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const diditApiKey = Deno.env.get("DIDIT_API_KEY") || "eCXSpv0y-4BiP9jZeGcIJyIzQHZFeIZxYzLbr2SLOwY";
    const diditWorkflowId = Deno.env.get("DIDIT_WORKFLOW_ID") || "default";

    if (!diditApiKey) {
      return new Response(
        JSON.stringify({ error: "Didit API credentials not configured." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { contact_id, client_name, client_email, tenant_id, callback_url, client_user_id } = body;

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: tenantConfig } = await supabase
      .from("didit_kyc_configs")
      .select("workflow_id, enabled")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (tenantConfig && !tenantConfig.enabled) {
      return new Response(
        JSON.stringify({ error: "KYC verification is disabled for this tenant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workflowId = tenantConfig?.workflow_id || diditWorkflowId;

    const callbackBase = callback_url || `${supabaseUrl.replace(".supabase.co", ".supabase.co")}/functions/v1/didit-webhook`;
    const vendorData = contact_id || client_user_id || user.id;

    const sessionPayload: Record<string, unknown> = {
      workflow_id: workflowId,
      vendor_data: vendorData,
      callback: callback_url || undefined,
      callback_method: "both",
      metadata: JSON.stringify({
        tenant_id,
        contact_id: contact_id || null,
        client_user_id: client_user_id || null,
        initiated_by: user.id,
      }),
      language: "en",
    };

    if (client_email || client_name) {
      sessionPayload.contact_details = {
        email: client_email || "",
        send_notification_emails: false,
        email_lang: "en",
      };
    }

    if (client_name) {
      const nameParts = (client_name as string).trim().split(" ");
      sessionPayload.expected_details = {
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" ") || "",
      };
    }

    const diditResponse = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": diditApiKey,
      },
      body: JSON.stringify(sessionPayload),
    });

    if (!diditResponse.ok) {
      const errorText = await diditResponse.text();
      console.error("Didit API error:", diditResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create verification session", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const session = await diditResponse.json();

    const kycRecord: Record<string, unknown> = {
      tenant_id,
      didit_session_id: session.session_id,
      didit_session_url: session.url,
      didit_session_status: session.status || "Not Started",
      verification_initiated_at: new Date().toISOString(),
      id_verification_status: "pending",
      aml_screening_status: "pending",
    };

    if (contact_id) {
      kycRecord.contact_id = contact_id;

      const { data: existingRecord } = await supabase
        .from("kyc_aml_records")
        .select("id")
        .eq("contact_id", contact_id)
        .maybeSingle();

      if (existingRecord) {
        await supabase
          .from("kyc_aml_records")
          .update({
            didit_session_id: session.session_id,
            didit_session_url: session.url,
            didit_session_status: session.status || "Not Started",
            verification_initiated_at: new Date().toISOString(),
            id_verification_status: "pending",
            aml_screening_status: "pending",
            verification_completed_at: null,
            didit_decision_data: null,
          })
          .eq("id", existingRecord.id);
      } else {
        if (client_user_id) kycRecord.client_user_id = client_user_id;
        if (client_name) kycRecord.full_legal_name = client_name;
        await supabase.from("kyc_aml_records").insert(kycRecord);
      }
    } else if (client_user_id) {
      kycRecord.client_user_id = client_user_id;
      if (client_name) kycRecord.full_legal_name = client_name;

      const { data: existingRecord } = await supabase
        .from("kyc_aml_records")
        .select("id")
        .eq("client_user_id", client_user_id)
        .maybeSingle();

      if (existingRecord) {
        await supabase
          .from("kyc_aml_records")
          .update({
            didit_session_id: session.session_id,
            didit_session_url: session.url,
            didit_session_status: session.status || "Not Started",
            verification_initiated_at: new Date().toISOString(),
            id_verification_status: "pending",
            aml_screening_status: "pending",
            verification_completed_at: null,
            didit_decision_data: null,
          })
          .eq("id", existingRecord.id);
      } else {
        await supabase.from("kyc_aml_records").insert(kycRecord);
      }
    }

    return new Response(
      JSON.stringify({
        session_id: session.session_id,
        verification_url: session.url,
        status: session.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
