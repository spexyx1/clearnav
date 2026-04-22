'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const ClearNavLandingPage = dynamic(() => import('@/components/ClearNavLandingPage'));
const LandingPage = dynamic(() => import('@/components/LandingPage'));
const PublicWebsite = dynamic(() => import('@/components/public/PublicWebsite').then(m => ({ default: m.PublicWebsite })));

export default function MarketingPage() {
  const { user, loading, roleCategory, currentTenant } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [publicTenant, setPublicTenant] = useState<{ id: string; slug: string } | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);

  // Redirect authenticated users to their portal
  useEffect(() => {
    if (loading) return;
    if (user && roleCategory) {
      switch (roleCategory) {
        case 'superadmin': router.replace('/platform'); break;
        case 'tenant_admin': case 'staff_user': router.replace('/manager'); break;
        case 'client': router.replace('/client'); break;
        default: break;
      }
    }
  }, [user, loading, roleCategory, router]);

  // Resolve tenant from hostname for public site rendering
  useEffect(() => {
    if (loading) return;
    const tenantParam = searchParams.get('tenant');

    async function resolve() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const { resolveTenantFromRequest } = await import('@/lib/tenantResolver');
        const supabase = createClient();
        const hostname = window.location.hostname;
        const { tenant } = await resolveTenantFromRequest(hostname, tenantParam, supabase);
        if (tenant) setPublicTenant({ id: tenant.id, slug: tenant.slug });
      } catch (e) {
        console.error('Tenant resolve error:', e);
      } finally {
        setTenantLoading(false);
      }
    }

    if (!user) resolve();
    else setTenantLoading(false);
  }, [user, loading, searchParams]);

  if (loading || tenantLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Tenant public site
  if (publicTenant) {
    return <PublicWebsite tenantId={publicTenant.id} tenantSlug={publicTenant.slug} />;
  }

  // ClearNav landing or tenant-branded landing
  if (currentTenant) {
    return <LandingPage onLoginClick={() => router.push('/login')} />;
  }

  return <ClearNavLandingPage onLoginClick={() => router.push('/login')} />;
}
