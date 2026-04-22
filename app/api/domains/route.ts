import { NextRequest, NextResponse } from 'next/server';
import { Vercel } from '@vercel/sdk';
import { supabaseAdmin } from '@/lib/supabase';

const vercel = new Vercel({ bearerToken: process.env.VERCEL_API_TOKEN! });

export async function POST(req: NextRequest) {
  const { domain, tenantId } = (await req.json()) as { domain: string; tenantId: string };

  if (!domain || !tenantId) {
    return NextResponse.json({ error: 'domain and tenantId are required' }, { status: 400 });
  }

  const result = await vercel.projects.addProjectDomain({
    idOrName: process.env.VERCEL_PROJECT_ID!,
    teamId: process.env.VERCEL_TEAM_ID,
    requestBody: { name: domain },
  });

  const verified = result.verified ?? false;

  await supabaseAdmin
    .from('tenant_domains')
    .upsert(
      {
        tenant_id: tenantId,
        domain,
        is_verified: verified,
        vercel_project_id: process.env.VERCEL_PROJECT_ID,
      },
      { onConflict: 'domain' }
    );

  return NextResponse.json({ success: true, verified });
}
