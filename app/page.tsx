'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function RootPage() {
  const { user, loading, roleCategory } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/marketing');
      return;
    }
    switch (roleCategory) {
      case 'superadmin':
        router.replace('/platform');
        break;
      case 'tenant_admin':
      case 'staff_user':
        router.replace('/manager');
        break;
      case 'client':
        router.replace('/client');
        break;
      default:
        router.replace('/login');
    }
  }, [user, loading, roleCategory, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
    </div>
  );
}
