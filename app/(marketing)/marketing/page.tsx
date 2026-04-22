'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import ClearNavLandingPage from '@/components/ClearNavLandingPage';

function MarketingContent() {
  const router = useRouter();
  return <ClearNavLandingPage onLoginClick={() => router.push('/login')} />;
}

export default function MarketingPage() {
  return (
    <Suspense>
      <MarketingContent />
    </Suspense>
  );
}
