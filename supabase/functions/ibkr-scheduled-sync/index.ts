const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isMarketHours = (hours === 9 && minutes >= 30) || (hours >= 10 && hours < 16);
    
    if (!isWeekday || !isMarketHours) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Outside market hours, sync skipped',
          timestamp: now.toISOString(),
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const syncResponse = await fetch(
      `${supabaseUrl}/functions/v1/ibkr-sync-portfolio`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const syncResult = await syncResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        syncResult,
        timestamp: now.toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Scheduled sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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