'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import LoginPage from '@/components/LoginPage';

export default function LoginPageClient() {
  const { user, loading, roleCategory } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  useEffect(() => {
    if (loading) return;
    if (user) {
      switch (roleCategory) {
        case 'superadmin': router.replace('/platform'); break;
        case 'tenant_admin':
        case 'staff_user': router.replace('/manager'); break;
        case 'client': router.replace('/client'); break;
        default: router.replace(next);
      }
    }
  }, [user, loading, roleCategory, router, next]);

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
    </div>
  );

  return <LoginPage onBack={() => router.push('/')} />;
}
