'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ClientPortal = dynamic(() => import('@/components/ClientPortal'), {
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function ClientPortalWrapper() {
  const { user, loading, roleCategory } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (roleCategory && roleCategory !== 'client') {
      switch (roleCategory) {
        case 'superadmin': router.replace('/platform'); break;
        case 'tenant_admin': case 'staff_user': router.replace('/manager'); break;
        default: break;
      }
    }
  }, [user, loading, roleCategory, router]);

  if (loading || !user || roleCategory !== 'client') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <ClientPortal />;
}
