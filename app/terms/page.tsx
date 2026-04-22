'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const TermsOfService = dynamic(() => import('@/components/legal/TermsOfService'));

export default function TermsPage() {
  const router = useRouter();
  const { currentTenant } = useAuth();
  return <TermsOfService tenantId={currentTenant?.id ?? null} onBack={() => router.back()} />;
}
