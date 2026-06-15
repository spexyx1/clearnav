import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GUEST_DOMAIN = "guest.clearnav.cv";

function guestEmail(username: string) {
  return `${username.toLowerCase().trim()}@${GUEST_DOMAIN}`;
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

  const { createClient } = await import("jsr:@supabase/supabase-js@2");

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

  // ── guest_create ──────────────────────────────────────────────────────────────
  // Creates a new pre-confirmed guest user identified by username.
  // Returns { email, temp_password } for immediate signInWithPassword on client.
  if (mode === "guest_create") {
    const { username } = body;
    if (!username || !/^[a-zA-Z0-9_-]{2,30}$/.test(username.trim())) {
      return err("Invalid username. Use 2–30 letters, numbers, underscores or hyphens.");
    }

    const trimmed = username.trim().toLowerCase();
    const email = guestEmail(trimmed);

    // Check uniqueness first (DB unique index is the final guard)
    const { data: existing } = await adminClient
      .from("invoice_app_profiles")
      .select("user_id")
      .ilike("username", trimmed)
      .maybeSingle();

    if (existing) {
      return err("Username already taken. Please choose a different one.", 409);
    }

    // Random temp password — user never sees this; replaced via Secure Account
    const tempPassword = `${crypto.randomUUID()}-${crypto.randomUUID()}`;

    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createErr) {
      if (createErr.message?.toLowerCase().includes("already been registered")) {
        return err("Username already taken. Please choose a different one.", 409);
      }
      return err(createErr.message);
    }

    const userId = userData.user.id;

    // Create profile
    const { error: profileErr } = await adminClient.from("invoice_app_profiles").insert({
      user_id: userId,
      username: trimmed,
      display_name: trimmed,
      is_guest: true,
      onboarding_complete: true,
    });

    if (profileErr) {
      // Roll back auth user on profile failure
      await adminClient.auth.admin.deleteUser(userId);
      return err("Failed to create profile: " + profileErr.message, 500);
    }

    return ok({ email, temp_password: tempPassword });
  }

  // ── email_signup ──────────────────────────────────────────────────────────────
  // Creates a pre-confirmed real account. Client calls signInWithPassword after.
  if (mode === "email_signup") {
    const { email, password, name } = body;

    if (!email || !password || password.length < 6) {
      return err("Email and password (min 6 characters) are required.");
    }

    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name?.trim() || null },
    });

    if (createErr) {
      if (createErr.message?.toLowerCase().includes("already been registered")) {
        return err("An account with this email already exists.", 409);
      }
      return err(createErr.message);
    }

    // Create profile (onboarding_complete: false → goes through onboarding)
    await adminClient.from("invoice_app_profiles").insert({
      user_id: userData.user.id,
      display_name: name?.trim() || null,
      is_guest: false,
      onboarding_complete: false,
    });

    return ok({ success: true });
  }

  // ── secure_guest ──────────────────────────────────────────────────────────────
  // Sets a real password on an existing guest account so it can be accessed
  // from any device. Requires a valid session (Authorization header).
  if (mode === "secure_guest") {
    const { password } = body;
    if (!password || password.length < 8) {
      return err("Password must be at least 8 characters.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return err("Authorization header required.", 401);
    }

    // Verify caller's session
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return err("Invalid or expired session.", 401);
    }

    // Confirm this is a guest account
    const { data: profile } = await adminClient
      .from("invoice_app_profiles")
      .select("username, is_guest")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.is_guest) {
      return err("Not a guest account.");
    }

    // Set email + password via admin API (bypasses email confirmation)
    const email = profile.username ? guestEmail(profile.username) : user.email!;
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
      password,
    });

    if (updateErr) {
      return err(updateErr.message, 500);
    }

    // Mark profile as non-guest (secured)
    const { data: updatedProfile, error: profileErr } = await adminClient
      .from("invoice_app_profiles")
      .update({ is_guest: false })
      .eq("user_id", user.id)
      .select()
      .single();

    if (profileErr) {
      return err(profileErr.message, 500);
    }

    return ok({ success: true, profile: updatedProfile });
  }

  return err("Unknown mode.");
});
