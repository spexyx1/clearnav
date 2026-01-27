import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UpdatePasswordRequest {
  email?: string;
  userId?: string;
  newPassword: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { email, userId, newPassword }: UpdatePasswordRequest = await req.json();

    if (!newPassword) {
      return new Response(
        JSON.stringify({ error: "newPassword is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!email && !userId) {
      return new Response(
        JSON.stringify({ error: "Either email or userId is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let targetUserId = userId;

    if (email && !userId) {
      const { createClient } = await import("jsr:@supabase/supabase-js@2");
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

      if (userError) {
        return new Response(
          JSON.stringify({
            error: "Error listing users",
            details: userError.message,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const user = userData.users.find((u: any) => u.email === email);

      if (!user) {
        return new Response(
          JSON.stringify({
            error: `User with email ${email} not found`,
            checkedEmail: email,
            totalUsers: userData.users.length
          }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      targetUserId = user.id;
    }

    const updateResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${targetUserId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return new Response(
        JSON.stringify({
          error: "Failed to update password",
          details: errorText,
          userId: targetUserId,
          status: updateResponse.status
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const userData = await updateResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password updated successfully`,
        email: email || userData.email,
        userId: userData.id
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error updating password:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        stack: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
