'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const ManagerPortal = dynamic(() => import('@/components/ManagerPortal'), {
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
    </div>
  ),
  ssr: false,
});

export default function ManagerPortalWrapper() {
  const { user, loading, isTenantAdmin, isStaff } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/manager');
      return;
    }
    if (!isTenantAdmin && !isStaff) {
      router.replace('/');
    }
  }, [user, loading, isTenantAdmin, isStaff, router]);

  if (loading || !user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
    </div>
  );

  return <ManagerPortal />;
}
