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

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
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

  const { createClient } = await import("jsr:@supabase/supabase-js@2");
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { mode } = body;

  // ── guest_create: new username → create pre-confirmed user + magic link token ──
  if (mode === "guest_create") {
    const { username } = body;
    if (!username || !/^[a-zA-Z0-9_-]{2,30}$/.test(username.trim())) {
      return jsonResponse({ error: "Invalid username. Use 2-30 letters, numbers, underscores or hyphens." }, 400);
    }

    const trimmed = username.trim().toLowerCase();
    const email = guestEmail(trimmed);

    // Check uniqueness before creating (race-condition safe via DB unique index)
    const { data: existing } = await adminClient
      .from("invoice_app_profiles")
      .select("user_id")
      .ilike("username", trimmed)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: "Username already taken. Try a different one." }, 409);
    }

    // Create pre-confirmed user (no password — guest only signs in via token)
    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        return jsonResponse({ error: "Username already taken. Try a different one." }, 409);
      }
      return jsonResponse({ error: createErr.message }, 400);
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
      // Roll back user creation on profile failure
      await adminClient.auth.admin.deleteUser(userId);
      return jsonResponse({ error: "Failed to create profile: " + profileErr.message }, 500);
    }

    // Generate a magic-link token the client can exchange for a session
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkErr) {
      return jsonResponse({ error: linkErr.message }, 500);
    }

    return jsonResponse({
      token_hash: linkData.properties.hashed_token,
      email,
    });
  }

  // ── email_signup: create real account with instant confirmation ──
  if (mode === "email_signup") {
    const { email, password, name } = body;

    if (!email || !password || password.length < 6) {
      return jsonResponse({ error: "Email and password (min 6 chars) are required." }, 400);
    }

    const { data: userData, error: createErr } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name || null },
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        return jsonResponse({ error: "An account with this email already exists." }, 409);
      }
      return jsonResponse({ error: createErr.message }, 400);
    }

    // Create profile (onboarding_complete: false → goes through onboarding flow)
    await adminClient.from("invoice_app_profiles").insert({
      user_id: userData.user.id,
      display_name: name?.trim() || null,
      is_guest: false,
      onboarding_complete: false,
    });

    return jsonResponse({ success: true });
  }

  // ── secure_guest: convert anonymous session → password-protected account ──
  // Called with the user's valid JWT in the Authorization header
  if (mode === "secure_guest") {
    const { password } = body;
    if (!password || password.length < 8) {
      return jsonResponse({ error: "Password must be at least 8 characters." }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authorization header required." }, 401);
    }

    // Verify caller's session
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return jsonResponse({ error: "Invalid session." }, 401);
    }

    // Get the guest username from their profile
    const { data: profile } = await adminClient
      .from("invoice_app_profiles")
      .select("username, is_guest")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.is_guest || !profile.username) {
      return jsonResponse({ error: "Not a guest account." }, 400);
    }

    const email = guestEmail(profile.username);

    // Update user: set email + password, keep confirmed
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
      password,
    });

    if (updateErr) {
      return jsonResponse({ error: updateErr.message }, 500);
    }

    // Mark profile as non-guest
    const { data: updatedProfile, error: profileErr } = await adminClient
      .from("invoice_app_profiles")
      .update({ is_guest: false })
      .eq("user_id", user.id)
      .select()
      .single();

    if (profileErr) {
      return jsonResponse({ error: profileErr.message }, 500);
    }

    return jsonResponse({ success: true, profile: updatedProfile });
  }

  return jsonResponse({ error: "Invalid mode." }, 400);
});
