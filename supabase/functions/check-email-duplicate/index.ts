import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckDuplicateRequest {
  tenantId: string;
  contactEmail: string;
  emailSubject: string;
  emailBody: string;
  templateType?: string;
  cooldownDays?: number;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  lastSentAt?: string;
  daysSinceLastSend?: number;
  similarSendsCount?: number;
  recommendation: string;
  contentHash: string;
}

function generateContentHash(subject: string, body: string): string {
  const normalizedSubject = subject.toLowerCase().trim();
  const normalizedBody = body
    .toLowerCase()
    .replace(/\{\{.*?\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const combined = `${normalizedSubject}|||${normalizedBody}`;
  return createHash('sha256').update(combined).digest('hex');
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
      contactEmail,
      emailSubject,
      emailBody,
      templateType,
      cooldownDays = 7
    }: CheckDuplicateRequest = await req.json();

    if (!tenantId || !contactEmail || !emailSubject || !emailBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentHash = generateContentHash(emailSubject, emailBody);

    const { data, error } = await supabase.rpc('check_email_duplicate', {
      p_tenant_id: tenantId,
      p_contact_email: contactEmail,
      p_content_hash: contentHash,
      p_template_type: templateType || null,
      p_cooldown_days: cooldownDays
    });

    if (error) {
      console.error("Error checking duplicate:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const duplicateInfo = data[0];

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let recommendation = 'Safe to send';

    if (duplicateInfo.is_duplicate) {
      const daysSince = duplicateInfo.days_since_last_send || 0;
      const count = duplicateInfo.similar_sends_count || 0;

      if (daysSince < 2) {
        riskLevel = 'high';
        recommendation = 'Very high risk - similar email sent within 48 hours. Recommend blocking.';
      } else if (daysSince < 5) {
        riskLevel = 'medium';
        recommendation = 'Medium risk - similar email sent recently. Consider delaying or requiring approval.';
      } else if (count > 3) {
        riskLevel = 'high';
        recommendation = `High risk - ${count} similar emails sent in cooldown period. Contact may be over-contacted.`;
      } else {
        riskLevel = 'low';
        recommendation = 'Low risk - similar content sent but outside critical window.';
      }
    }

    const result: DuplicateCheckResult = {
      isDuplicate: duplicateInfo.is_duplicate,
      riskLevel,
      lastSentAt: duplicateInfo.last_sent_at,
      daysSinceLastSend: duplicateInfo.days_since_last_send,
      similarSendsCount: duplicateInfo.similar_sends_count,
      recommendation,
      contentHash
    };

    return new Response(
      JSON.stringify(result),
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
