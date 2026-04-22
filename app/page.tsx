'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function RootPage() {
  const { user, loading, roleCategory } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user && roleCategory) {
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
    } else if (!user) {
      router.replace('/marketing');
    }
  }, [user, loading, roleCategory, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
    </div>
  );
}
