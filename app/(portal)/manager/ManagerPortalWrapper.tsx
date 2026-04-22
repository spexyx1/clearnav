'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ManagerPortal = dynamic(() => import('@/components/ManagerPortal'), {
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function ManagerPortalWrapper() {
  const { user, loading, roleCategory } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (roleCategory === 'superadmin') { router.replace('/platform'); return; }
    if (roleCategory === 'client') { router.replace('/client'); return; }
  }, [user, loading, roleCategory, router]);

  if (loading || !user || (roleCategory !== 'tenant_admin' && roleCategory !== 'staff_user')) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <ManagerPortal />;
}
