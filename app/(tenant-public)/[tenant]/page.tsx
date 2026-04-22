import { createClient } from '@/lib/supabase/server';
import { PublicWebsiteServer } from './PublicWebsiteServer';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function TenantPublicPage({ params }: Props) {
  const { tenant: slug } = await params;
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from('platform_tenants')
    .select('id, slug, name')
    .eq('slug', slug)
    .in('status', ['active', 'trial'])
    .maybeSingle();

  if (!tenant) notFound();

  return <PublicWebsiteServer tenantId={tenant.id} tenantSlug={tenant.slug} />;
}
