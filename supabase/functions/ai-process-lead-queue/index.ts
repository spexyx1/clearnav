import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface Lead {
  id: string;
  contact_email: string;
  contact_name: string;
  contact_company: string;
  queue_status: string;
  next_action_type: string;
  next_action_scheduled_at: string;
  assigned_sequence_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tenant_id } = await req.json();

    if (!tenant_id) {
      throw new Error('tenant_id is required');
    }

    const now = new Date().toISOString();

    const { data: leads, error: leadsError } = await supabase
      .from('ai_lead_queue')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('queue_status', 'ready')
      .lte('next_action_scheduled_at', now)
      .limit(10);

    if (leadsError) throw leadsError;

    const results = [];

    for (const lead of leads || []) {
      try {
        if (lead.next_action_type === 'email') {
          await supabase.from('ai_touchpoint_schedule').insert({
            tenant_id: tenant_id,
            lead_queue_id: lead.id,
            touchpoint_type: 'email',
            scheduled_for: now,
            status: 'scheduled',
          });

          await supabase
            .from('ai_lead_queue')
            .update({
              queue_status: 'in_progress',
              last_action_taken_at: now,
              emails_sent: (lead.emails_sent || 0) + 1,
            })
            .eq('id', lead.id);

          await supabase.from('ai_lead_lifecycle_events').insert({
            tenant_id: tenant_id,
            lead_queue_id: lead.id,
            event_type: 'email_sent',
            event_description: `AI agent scheduled email to ${lead.contact_email}`,
            new_status: 'in_progress',
            triggered_by_type: 'ai_agent',
          });

          results.push({ lead_id: lead.id, action: 'email_scheduled', success: true });
        } else if (lead.next_action_type === 'call') {
          await supabase
            .from('ai_lead_queue')
            .update({
              queue_status: 'in_progress',
              last_action_taken_at: now,
              calls_attempted: (lead.calls_attempted || 0) + 1,
            })
            .eq('id', lead.id);

          await supabase.from('ai_lead_lifecycle_events').insert({
            tenant_id: tenant_id,
            lead_queue_id: lead.id,
            event_type: 'call_attempted',
            event_description: `AI agent initiated call to ${lead.contact_email}`,
            new_status: 'in_progress',
            triggered_by_type: 'ai_agent',
          });

          results.push({ lead_id: lead.id, action: 'call_initiated', success: true });
        }
      } catch (error) {
        console.error(`Error processing lead ${lead.id}:`, error);
        results.push({ lead_id: lead.id, error: error.message, success: false });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing lead queue:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});