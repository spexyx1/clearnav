'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const PlatformAdminPortal = dynamic(() => import('@/components/platform/PlatformAdminPortal'), {
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
    </div>
  ),
  ssr: false,
});

export default function PlatformPortalWrapper() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=/platform');
      return;
    }
    if (!isPlatformAdmin) {
      router.replace('/');
    }
  }, [user, loading, isPlatformAdmin, router]);

  if (loading || !user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
    </div>
  );

  return <PlatformAdminPortal />;
}
