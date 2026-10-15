import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are the ClearNAV AI Help Assistant — a friendly, knowledgeable guide embedded inside the ClearNAV platform, a white-label hedge fund and investment management SaaS.

Your job is to help users understand features, navigate the platform, and resolve questions quickly. You always know which portal the user is in and what screen they are currently viewing.

## Portals
- **Client Portal**: Investors access their dashboard, returns, risk metrics, documents, tax documents, KYC verification, redemptions, exchange, community, and settings.
- **Manager Portal**: Fund managers access portfolio management (funds, share classes, capital accounts, NAV, transactions), fund operations (capital calls, distributions, redemptions, fees, exchange, waterfall, carried interest, side pockets), reporting (investor statements, performance, reports, tax docs), CRM (contacts, onboarding, clients), communications (email, newsletters, campaigns, invitation templates), AI and voice agents, white-label website builder, and admin (users, compliance, tasks, analytics, account).
- **Platform Admin Portal**: Platform operators manage all tenants, platform users, billing and subscriptions, discounts, platform analytics, support conversations, tenant email oversight, platform financials, compliance officers, and platform settings.

## Tools you can use
- **navigate_to**: Tell the user to go to a specific route/tab. Call this when the user asks "where is X" or "how do I get to Y".
- **start_tutorial_chapter**: Suggest starting a specific tutorial chapter when the user wants a guided walkthrough.
- **create_support_ticket**: Escalate to human support when the issue is beyond your knowledge or the user is frustrated.

## Guidelines
- Be concise and friendly. Use markdown for formatting when helpful.
- Always tailor your answer to the user's current portal and screen.
- If you don't know, say so clearly and offer to create a support ticket.
- Never make up features that don't exist.
- When referencing navigation, use the exact sidebar/tab labels the user sees.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const PORTALS = ["client", "manager", "platform_admin"] as const;
const MAX_MESSAGE_LENGTH = 4000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clip(value: unknown, max = 120): string | undefined {
  return typeof value === "string" && value.trim() ? value.replace(/[\r\n]+/g, " ").slice(0, max) : undefined;
}

interface RequestBody {
  conversation_id?: string;
  message: string;
  portal_context: "client" | "manager" | "platform_admin";
  current_route?: string;
  user_role?: string;
  tenant_name?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json().catch(() => ({} as RequestBody));
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const portal_context = PORTALS.includes(body.portal_context) ? body.portal_context : "client";
    const current_route = clip(body.current_route);
    const user_role = clip(body.user_role, 60);
    const tenant_name = clip(body.tenant_name);
    let conversation_id = typeof body.conversation_id === "string" ? body.conversation_id : undefined;

    if (!message) return jsonResponse({ error: "Message is required" }, 400);
    if (message.length > MAX_MESSAGE_LENGTH) {
      return jsonResponse({ error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters` }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: allowed, error: limitError } = await supabaseAdmin.rpc("consume_rate_limit", {
      p_bucket: `ai-help-chat:${user.id}`,
      p_max: 30,
      p_window_seconds: 600,
    });
    if (limitError) throw limitError;
    if (!allowed) {
      return jsonResponse({ error: "You're sending messages too quickly. Please wait a few minutes." }, 429);
    }

    if (conversation_id) {
      const { data: owned } = await supabaseAdmin
        .from("support_conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!owned) return jsonResponse({ error: "Conversation not found" }, 404);
    }

    // Get or create conversation
    if (!conversation_id) {
      const { data: conv, error: convError } = await supabaseAdmin
        .from("support_conversations")
        .insert({
          user_id: user.id,
          portal: portal_context,
          title: message.slice(0, 80),
          status: "open",
          metadata: { current_route, user_role, tenant_name },
        })
        .select()
        .single();

      if (convError) throw convError;
      conversation_id = conv.id;
    }

    // Insert user message
    await supabaseAdmin.from("support_messages").insert({
      conversation_id,
      sender_type: "user",
      body_markdown: message,
    });

    // Load conversation history (last 20 messages)
    const { data: history } = await supabaseAdmin
      .from("support_messages")
      .select("sender_type, body_markdown")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const messages: Message[] = (history || []).reverse().map((m) => ({
      role: m.sender_type === "user" ? "user" : "assistant",
      content: m.body_markdown,
    }));

    while (messages.length > 0 && messages[0].role === "assistant") messages.shift();

    // Context-aware system prompt addition
    const contextNote = [
      current_route ? `Current screen/route: ${current_route}` : null,
      portal_context ? `Portal: ${portal_context}` : null,
      user_role ? `User role: ${user_role}` : null,
      tenant_name ? `Tenant: ${tenant_name}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const fullSystemPrompt = contextNote
      ? `${SYSTEM_PROMPT}\n\n## Current Context\n${contextNote}`
      : SYSTEM_PROMPT;

    // Tools definition for Anthropic
    const tools = [
      {
        name: "navigate_to",
        description:
          "Instruct the frontend to navigate to a specific portal route or tab. Use when the user asks where something is or how to get to a feature.",
        input_schema: {
          type: "object",
          properties: {
            route: {
              type: "string",
              description:
                "The route/tab key to navigate to (e.g. 'nav', 'crm', 'capital_calls', 'compliance', 'blog', 'dashboard')",
            },
            label: {
              type: "string",
              description: "Human-readable label for the button shown to the user",
            },
          },
          required: ["route", "label"],
        },
      },
      {
        name: "start_tutorial_chapter",
        description:
          "Suggest starting a specific tutorial chapter. Use when the user wants a guided walkthrough of a feature.",
        input_schema: {
          type: "object",
          properties: {
            tutorial_key: {
              type: "string",
              description:
                "One of: client_first_run, manager_first_run, platform_admin_first_run",
            },
            step_id: {
              type: "string",
              description: "Optional step id to jump to within the tutorial",
            },
            label: {
              type: "string",
              description: "Human-readable label for the button",
            },
          },
          required: ["tutorial_key", "label"],
        },
      },
      {
        name: "create_support_ticket",
        description:
          "Escalate the conversation to human support when the issue is complex or the user is requesting personal account assistance.",
        input_schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "Brief summary of the issue for the support team",
            },
          },
          required: ["summary"],
        },
      },
    ];

    // Call Anthropic API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        system: fullSystemPrompt,
        messages,
        tools,
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      throw new Error(`Anthropic API error: ${anthropicResponse.status} ${errText}`);
    }

    const aiResult = await anthropicResponse.json();

    // Extract text and tool calls
    let responseText = "";
    const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];

    for (const block of aiResult.content || []) {
      if (block.type === "text") {
        responseText += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({ name: block.name, input: block.input });
      }
    }

    // If tool_use with no text, add a friendly text response
    if (!responseText && toolCalls.length > 0) {
      const tc = toolCalls[0];
      if (tc.name === "navigate_to") {
        responseText = `I can take you directly to **${(tc.input as { label: string }).label}**.`;
      } else if (tc.name === "start_tutorial_chapter") {
        responseText = `I can start the guided tour for you — just click below.`;
      } else if (tc.name === "create_support_ticket") {
        responseText = `I have created a support ticket for your issue. A human agent will follow up with you shortly.`;
      }
    }

    const tokenUsage = aiResult.usage
      ? { input: aiResult.usage.input_tokens, output: aiResult.usage.output_tokens }
      : null;

    // If escalation tool was called, update conversation status
    if (toolCalls.some((tc) => tc.name === "create_support_ticket")) {
      await supabaseAdmin
        .from("support_conversations")
        .update({ status: "escalated", updated_at: new Date().toISOString() })
        .eq("id", conversation_id);
    }

    // Save AI response
    await supabaseAdmin.from("support_messages").insert({
      conversation_id,
      sender_type: "ai",
      body_markdown: responseText,
      tool_calls: toolCalls.length > 0 ? toolCalls : null,
      model: aiResult.model,
      token_usage: tokenUsage,
    });

    // Update conversation last_message_at
    await supabaseAdmin
      .from("support_conversations")
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return new Response(
      JSON.stringify({
        conversation_id,
        message: responseText,
        tool_calls: toolCalls,
        model: aiResult.model,
        token_usage: tokenUsage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("ai-help-chat error:", err);
    return jsonResponse({ error: "The assistant is unavailable right now. Please try again shortly." }, 500);
  }
});
