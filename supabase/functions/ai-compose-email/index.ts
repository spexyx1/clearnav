import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead_id, template, personalization_data } = await req.json();

    if (!lead_id) {
      throw new Error('lead_id is required');
    }

    const { data: lead, error: leadError } = await supabase
      .from('ai_lead_queue')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError) throw leadError;

    let subject = template?.subject || 'Quick question about {{company}}';
    let body = template?.body || `Hi {{first_name}},\n\nI noticed {{company}} is in the {{industry}} space and thought you might be interested in...\n\nBest regards`;

    const replacements: Record<string, string> = {
      '{{first_name}}': personalization_data?.first_name || lead.contact_name?.split(' ')[0] || 'there',
      '{{last_name}}': personalization_data?.last_name || lead.contact_name?.split(' ')[1] || '',
      '{{company}}': personalization_data?.company || lead.contact_company || 'your company',
      '{{email}}': lead.contact_email,
      '{{job_title}}': personalization_data?.job_title || '',
      '{{industry}}': personalization_data?.industry || '',
    };

    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replace(new RegExp(key, 'g'), value);
      body = body.replace(new RegExp(key, 'g'), value);
    }

    const aiPrompt = `
You are a professional sales development representative.
Improve the following email to be more engaging and personalized while maintaining professionalism.

Original Subject: ${subject}
Original Body: ${body}

Return ONLY a JSON object with "subject" and "body" fields containing the improved versions.
Keep it concise and focused on value.
`;

    const composedEmail = {
      subject: subject,
      body: body,
      personalized: true,
      lead_id: lead_id,
      contact_email: lead.contact_email,
    };

    await supabase.from('ai_agent_actions').insert({
      tenant_id: lead.tenant_id,
      action_type: 'email_sent',
      action_description: `Composed personalized email for ${lead.contact_email}`,
      requires_approval: false,
      approval_status: 'auto_approved',
      action_result: 'success',
      action_data: composedEmail,
    });

    return new Response(
      JSON.stringify({
        success: true,
        email: composedEmail,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error composing email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});