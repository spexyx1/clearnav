'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PlatformAdminPortal = dynamic(() => import('@/components/platform/PlatformAdminPortal'), {
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function PlatformPortalWrapper() {
  const { user, loading, roleCategory } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (roleCategory === 'tenant_admin' || roleCategory === 'staff_user') { router.replace('/manager'); return; }
    if (roleCategory === 'client') { router.replace('/client'); return; }
  }, [user, loading, roleCategory, router]);

  if (loading || !user || roleCategory !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <PlatformAdminPortal />;
}
