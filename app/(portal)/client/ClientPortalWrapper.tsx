'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const ClientPortal = dynamic(() => import('@/components/ClientPortal'), {
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
    </div>
  ),
  ssr: false,
});

export default function ClientPortalWrapper() {
  const { user, loading, isClient, isTenantAdmin, isStaff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/client');
      return;
    }
    if (!isClient && !isTenantAdmin && !isStaff) {
      router.replace('/');
    }
  }, [user, loading, isClient, isTenantAdmin, isStaff, router]);

  if (loading || !user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
    </div>
  );

  return <ClientPortal />;
}
