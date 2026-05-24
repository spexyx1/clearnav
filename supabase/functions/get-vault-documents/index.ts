import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { passphrase, tenant_slug } = body as { passphrase?: string; tenant_slug?: string };

    if (!passphrase || !tenant_slug) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve the stored passphrase from Supabase Vault (service role only)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const { data: secretRow } = await supabaseAdmin
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", "arkline_vault_passphrase")
      .maybeSingle();
    const storedPassphrase: string = secretRow?.decrypted_secret ?? "";

    // Validate passphrase using timing-safe comparison
    const isValid = timingSafeEqual(passphrase, storedPassphrase);

    if (!isValid) {
      // Artificial delay to slow brute-force attempts
      await new Promise((r) => setTimeout(r, 1200));
      return new Response(JSON.stringify({ error: "Invalid passphrase" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Passphrase is correct — fetch documents using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Resolve tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from("platform_tenants")
      .select("id")
      .eq("slug", tenant_slug)
      .maybeSingle();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active documents for this tenant
    const { data: documents, error: docsError } = await supabase
      .from("investor_vault_documents")
      .select("id, document_name, document_type, storage_path, description, sort_order")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (docsError) {
      throw docsError;
    }

    // Generate signed URLs (2-hour expiry) for file documents;
    // internal: paths are served as in-app routes, not storage files.
    const TWO_HOURS = 60 * 60 * 2;
    const documentsWithUrls = await Promise.all(
      (documents ?? []).map(async (doc) => {
        if (!doc.storage_path) return { ...doc, signed_url: null, internal_path: null };
        if (doc.storage_path.startsWith("internal:")) {
          const internalPath = doc.storage_path.replace("internal:", "");
          return { ...doc, signed_url: null, internal_path: internalPath };
        }
        const { data: signedData } = await supabase.storage
          .from("investor-documents")
          .createSignedUrl(doc.storage_path, TWO_HOURS);
        return { ...doc, signed_url: signedData?.signedUrl ?? null, internal_path: null };
      })
    );

    return new Response(JSON.stringify({ documents: documentsWithUrls }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-vault-documents error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
