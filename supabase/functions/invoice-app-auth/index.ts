import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GUEST_DOMAIN = "guest.clearnav.cv";

function guestEmail(username: string) {
  return `${username.toLowerCase().trim()}@${GUEST_DOMAIN}`;
}

const MIN_PASSWORD_LENGTH = 10;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

function ok(data: object) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const { mode } = body;

  if (mode === "guest_create" || mode === "email_signup") {
    const { data: allowed, error: limitErr } = await adminClient.rpc("consume_rate_limit", {
      p_bucket: `invoice-signup:${clientIp(req)}`,
      p_max: 10,
      p_window_seconds: 3600,
    });
    if (limitErr) {
      console.error("rate limit error:", limitErr);
      return err("Sign-up is temporarily unavailable. Please try again shortly.", 503);
    }
    if (!allowed) return err("Too many sign-up attempts. Please try again later.", 429);
  }

  // ── guest_create ──────────────────────────────────────────────────────────────
  if (mode === "guest_create") {
    const { username } = body;
    if (!username || !/^[a-zA-Z0-9_-]{2,30}$/.test(username.trim())) {
      return err("Invalid username. Use 2–30 letters, numbers, underscores or hyphens.");
    }

    const trimmed = username.trim().toLowerCase();
    const email = guestEmail(trimmed);

    // Check uniqueness first
    const { data: existing } = await adminClient
      .from("invoice_app_profiles")
      .select("user_id")
      .ilike("username", trimmed)
      .maybeSingle();

    if (existing) {
      return err("Username already taken. Please choose a different one.", 409);
    }

    // 32-char hex password — well within bcrypt's 72-char limit, no email sent
    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createErr) {
      const msg = createErr.message ?? "";
      if (msg.toLowerCase().includes("already been registered") || msg.toLowerCase().includes("already exists")) {
        return err("Username already taken. Please choose a different one.", 409);
      }
      console.error("guest create error:", msg);
      return err("We couldn't create your account. Please try again.", 500);
    }

    await adminClient.from("invoice_app_profiles").insert({
      user_id: userData.user.id,
      username: trimmed,
      display_name: trimmed,
      is_guest: true,
      onboarding_complete: true,
    });

    return ok({ email, onboarding_complete: true });
  }

  // ── email_signup ──────────────────────────────────────────────────────────────
  if (mode === "email_signup") {
    const { email, password, name } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password || password.length < MIN_PASSWORD_LENGTH || password.length > 72) {
      return err(`A valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters are required.`);
    }

    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name?.trim() || null },
    });

    if (createErr) {
      const msg = createErr.message?.toLowerCase() ?? "";
      if (msg.includes("already been registered") || msg.includes("already exists")) {
        return ok({ success: true });
      }
      console.error("email signup error:", createErr.message);
      return err("We couldn't create your account. Please try again.", 500);
    }

    await adminClient.from("invoice_app_profiles").insert({
      user_id: userData.user.id,
      display_name: name?.trim() || null,
      is_guest: false,
      onboarding_complete: false,
    });

    return ok({ success: true });
  }

  // ── secure_guest ──────────────────────────────────────────────────────────────
  if (mode === "secure_guest") {
    const { password } = body;
    if (!password || password.length < MIN_PASSWORD_LENGTH || password.length > 72) {
      return err(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return err("Authorization header required.", 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return err("Invalid or expired session.", 401);
    }

    const { data: profile } = await adminClient
      .from("invoice_app_profiles")
      .select("username, is_guest")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.is_guest) {
      return err("Not a guest account.");
    }

    const email = profile.username ? guestEmail(profile.username) : user.email!;
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
      password,
    });

    if (updateErr) {
      console.error("secure guest error:", updateErr.message);
      return err("We couldn't secure your account. Please try again.", 500);
    }

    const { data: updatedProfile, error: profileErr } = await adminClient
      .from("invoice_app_profiles")
      .update({ is_guest: false })
      .eq("user_id", user.id)
      .select()
      .single();

    if (profileErr) {
      console.error("profile update error:", profileErr.message);
      return err("We couldn't secure your account. Please try again.", 500);
    }

    return ok({ success: true, profile: updatedProfile });
  }

  // ── upload_logo ───────────────────────────────────────────────────────────────
  if (mode === "upload_logo") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Authorization header required.", 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return err("Invalid or expired session.", 401);

    const { file_base64, content_type } = body;
    const ext = LOGO_TYPES[content_type ?? ""];
    if (!file_base64 || !ext) {
      return err("Logos must be PNG, JPEG or WebP images.");
    }
    if (file_base64.length > Math.ceil(MAX_LOGO_BYTES * 4 / 3) + 4) {
      return err("Logos must be 2 MB or smaller.");
    }

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(file_base64), (c) => c.charCodeAt(0));
    } catch {
      return err("The logo file could not be read.");
    }
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    if (!((ext === "png" && isPng) || (ext === "jpg" && isJpeg) || (ext === "webp" && isWebp))) {
      return err("The logo file does not match its image type.");
    }

    const path = `${user.id}/logo.${ext}`;

    // Use service-role client to bypass RLS
    const { error: upErr } = await adminClient.storage
      .from("invoice-logos")
      .upload(path, bytes, { contentType: content_type, upsert: true });

    if (upErr) {
      console.error("logo upload error:", upErr.message);
      return err("We couldn't upload your logo. Please try again.", 500);
    }

    const { data: urlData } = adminClient.storage.from("invoice-logos").getPublicUrl(path);
    return ok({ public_url: urlData.publicUrl });
  }

  return err("Unknown mode.");
});
