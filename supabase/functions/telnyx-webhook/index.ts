import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TelnyxWebhookEvent {
  data: {
    event_type: string;
    id: string;
    occurred_at: string;
    payload: {
      call_control_id: string;
      call_session_id: string;
      call_leg_id: string;
      direction: string;
      from: string;
      to: string;
      state: string;
      start_time?: string;
      answer_time?: string;
      end_time?: string;
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const event: TelnyxWebhookEvent = await req.json();
    const { event_type, payload } = event.data;

    console.log('Received Telnyx webhook:', event_type, payload.call_control_id);

    const { data: existingSession } = await supabase
      .from('voice_call_sessions')
      .select('id, tenant_id')
      .eq('call_control_id', payload.call_control_id)
      .maybeSingle();

    switch (event_type) {
      case 'call.initiated':
        if (!existingSession) {
          const { data: phoneNumber } = await supabase
            .from('telnyx_phone_numbers')
            .select('tenant_id, agent_config_id, id')
            .eq('phone_number', payload.direction === 'incoming' ? payload.to : payload.from)
            .maybeSingle();

          if (phoneNumber) {
            await supabase.from('voice_call_sessions').insert({
              tenant_id: phoneNumber.tenant_id,
              agent_config_id: phoneNumber.agent_config_id,
              phone_number_id: phoneNumber.id,
              call_control_id: payload.call_control_id,
              call_session_id: payload.call_session_id,
              call_leg_id: payload.call_leg_id,
              direction: payload.direction === 'incoming' ? 'inbound' : 'outbound',
              from_number: payload.from,
              to_number: payload.to,
              status: 'initiated',
              initiated_at: payload.start_time || new Date().toISOString(),
            });
          }
        }
        break;

      case 'call.answered':
        if (existingSession) {
          await supabase
            .from('voice_call_sessions')
            .update({
              status: 'answered',
              answered_at: payload.answer_time || new Date().toISOString(),
            })
            .eq('call_control_id', payload.call_control_id);
        }
        break;

      case 'call.hangup':
        if (existingSession) {
          const endTime = new Date(payload.end_time || new Date().toISOString());
          const { data: session } = await supabase
            .from('voice_call_sessions')
            .select('answered_at')
            .eq('call_control_id', payload.call_control_id)
            .single();

          let durationSeconds = 0;
          if (session?.answered_at) {
            const answerTime = new Date(session.answered_at);
            durationSeconds = Math.floor((endTime.getTime() - answerTime.getTime()) / 1000);
          }

          await supabase
            .from('voice_call_sessions')
            .update({
              status: 'completed',
              ended_at: endTime.toISOString(),
              duration_seconds: durationSeconds,
            })
            .eq('call_control_id', payload.call_control_id);

          const today = new Date().toISOString().split('T')[0];
          const hour = new Date().getHours();

          await supabase.rpc('increment_voice_analytics', {
            p_tenant_id: existingSession.tenant_id,
            p_date: today,
            p_hour: hour,
            p_total_calls: 1,
            p_total_duration: durationSeconds,
          }).catch(() => {
          });
        }
        break;

      case 'call.speak.ended':
      case 'call.playback.ended':
        break;

      default:
        console.log('Unhandled event type:', event_type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
