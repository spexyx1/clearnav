'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const InvestorPage = dynamic(() => import('@/components/InvestorPage'));

export default function InvestorsPage() {
  const router = useRouter();
  return <InvestorPage onBack={() => router.back()} />;
}
