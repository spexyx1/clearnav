import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EvaluateRequest {
  tenantId: string;
  actionType: string;
  actionDescription: string;
  conversationContext?: string;
  actionData?: Record<string, any>;
  contactId?: string;
}

interface EvaluationResult {
  requiresApproval: boolean;
  approvalPriority: 'low' | 'medium' | 'high' | 'urgent';
  aiReasoning: string;
  riskFactors: string[];
  confidenceScore: number;
  timeoutMinutes: number;
  timeoutBehavior: 'hold' | 'auto_approve' | 'auto_reject' | 'escalate';
}

const PRICING_KEYWORDS = [
  'discount', 'custom pricing', 'negotiate', 'exception', 'price reduction',
  'special rate', 'lower price', 'better deal', 'price match', 'waive fee'
];

const ESCALATION_KEYWORDS = [
  'urgent', 'complaint', 'legal', 'refund', 'cancel', 'escalate',
  'manager', 'supervisor', 'dissatisfied', 'unhappy', 'frustrated',
  'unacceptable', 'breach', 'lawsuit', 'attorney'
];

const SENSITIVE_EMAIL_KEYWORDS = [
  'confidential', 'acquisition', 'merger', 'legal matter', 'lawsuit',
  'investigation', 'complaint', 'termination', 'security breach'
];

function evaluateActionType(
  actionType: string,
  description: string,
  context: string,
  settings: any
): EvaluationResult {
  const lowerDesc = description.toLowerCase();
  const lowerContext = context.toLowerCase();
  const combined = `${lowerDesc} ${lowerContext}`;

  if (actionType === 'meeting_booking' || actionType === 'schedule_meeting') {
    return {
      requiresApproval: false,
      approvalPriority: 'low',
      aiReasoning: 'Meeting bookings are auto-approved per configuration',
      riskFactors: [],
      confidenceScore: 1.0,
      timeoutMinutes: 0,
      timeoutBehavior: 'auto_approve'
    };
  }

  if (actionType === 'trial_activation' || actionType === 'start_trial') {
    return {
      requiresApproval: false,
      approvalPriority: 'low',
      aiReasoning: 'Trial activations are auto-approved per configuration',
      riskFactors: [],
      confidenceScore: 1.0,
      timeoutMinutes: 0,
      timeoutBehavior: 'auto_approve'
    };
  }

  if (actionType === 'pricing_discussion' || actionType === 'custom_pricing') {
    const pricingKeywordsFound = PRICING_KEYWORDS.filter(kw => combined.includes(kw));

    if (pricingKeywordsFound.length > 0) {
      return {
        requiresApproval: true,
        approvalPriority: 'high',
        aiReasoning: `Custom pricing request detected with keywords: ${pricingKeywordsFound.join(', ')}. Requires approval to protect margins.`,
        riskFactors: [
          'Custom pricing request',
          'Potential margin impact',
          ...pricingKeywordsFound.map(kw => `Contains "${kw}"`)
        ],
        confidenceScore: 0.9,
        timeoutMinutes: settings?.custom_pricing_timeout_minutes || 120,
        timeoutBehavior: settings?.custom_pricing_timeout_behavior || 'hold'
      };
    }
  }

  if (actionType === 'support_escalation' || actionType === 'escalate_ticket') {
    const escalationKeywordsFound = ESCALATION_KEYWORDS.filter(kw => combined.includes(kw));

    const isUrgent = escalationKeywordsFound.some(kw =>
      ['urgent', 'legal', 'lawsuit', 'attorney', 'breach'].includes(kw)
    );

    return {
      requiresApproval: true,
      approvalPriority: isUrgent ? 'urgent' : 'high',
      aiReasoning: `Support escalation detected with keywords: ${escalationKeywordsFound.join(', ')}. Requires human review for proper handling.`,
      riskFactors: [
        'Support escalation',
        'Customer satisfaction at risk',
        ...escalationKeywordsFound.map(kw => `Contains "${kw}"`)
      ],
      confidenceScore: 0.85,
      timeoutMinutes: settings?.escalation_timeout_minutes || 60,
      timeoutBehavior: settings?.escalation_timeout_behavior || 'escalate'
    };
  }

  if (actionType === 'email_sequence_enrollment' || actionType === 'send_email_sequence') {
    const sensitiveKeywordsFound = SENSITIVE_EMAIL_KEYWORDS.filter(kw => combined.includes(kw));

    if (sensitiveKeywordsFound.length > 0) {
      return {
        requiresApproval: true,
        approvalPriority: 'medium',
        aiReasoning: `Email contains sensitive content: ${sensitiveKeywordsFound.join(', ')}. Requires approval before sending.`,
        riskFactors: [
          'Sensitive email content',
          'Brand reputation risk',
          ...sensitiveKeywordsFound.map(kw => `Contains "${kw}"`)
        ],
        confidenceScore: 0.8,
        timeoutMinutes: settings?.email_exception_timeout_minutes || 240,
        timeoutBehavior: settings?.email_exception_timeout_behavior || 'auto_approve'
      };
    }

    if (combined.includes('custom') || combined.includes('off-script')) {
      return {
        requiresApproval: true,
        approvalPriority: 'medium',
        aiReasoning: 'Email contains custom or off-script content. Requires approval for quality control.',
        riskFactors: [
          'Custom email content',
          'Deviates from approved templates'
        ],
        confidenceScore: 0.75,
        timeoutMinutes: settings?.email_exception_timeout_minutes || 240,
        timeoutBehavior: settings?.email_exception_timeout_behavior || 'auto_approve'
      };
    }

    return {
      requiresApproval: false,
      approvalPriority: 'low',
      aiReasoning: 'Standard email sequence, no red flags detected',
      riskFactors: [],
      confidenceScore: 0.9,
      timeoutMinutes: 0,
      timeoutBehavior: 'auto_approve'
    };
  }

  return {
    requiresApproval: false,
    approvalPriority: 'low',
    aiReasoning: 'Action type does not require approval',
    riskFactors: [],
    confidenceScore: 0.95,
    timeoutMinutes: 0,
    timeoutBehavior: 'auto_approve'
  };
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      tenantId,
      actionType,
      actionDescription,
      conversationContext = '',
      actionData = {},
      contactId
    }: EvaluateRequest = await req.json();

    if (!tenantId || !actionType || !actionDescription) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: settings, error: settingsError } = await supabase
      .from('ai_agent_approval_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
    }

    const evaluation = evaluateActionType(
      actionType,
      actionDescription,
      conversationContext,
      settings
    );

    if (contactId) {
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('tags, lifetime_value')
        .eq('id', contactId)
        .maybeSingle();

      if (contact) {
        if (contact.tags?.includes('VIP') || contact.tags?.includes('High Value')) {
          evaluation.requiresApproval = true;
          evaluation.approvalPriority = 'high';
          evaluation.riskFactors.push('VIP or high-value contact');
          evaluation.aiReasoning += ' Contact is flagged as VIP/high-value, requiring extra care.';
        }

        if (contact.lifetime_value && contact.lifetime_value > 100000) {
          evaluation.approvalPriority = evaluation.approvalPriority === 'urgent' ? 'urgent' : 'high';
          evaluation.riskFactors.push(`High lifetime value: $${contact.lifetime_value}`);
        }
      }
    }

    return new Response(
      JSON.stringify(evaluation),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
