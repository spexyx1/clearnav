'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const PrivacyPolicy = dynamic(() => import('@/components/legal/PrivacyPolicy'));

export default function PrivacyPage() {
  const router = useRouter();
  const { currentTenant } = useAuth();
  return <PrivacyPolicy tenantId={currentTenant?.id ?? null} onBack={() => router.back()} />;
}
