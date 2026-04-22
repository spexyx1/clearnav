'use client';

import { useRouter } from 'next/navigation';
import InvestorPage from '@/components/InvestorPage';

export default function InvestorsPage() {
  const router = useRouter();
  return <InvestorPage onBack={() => router.push('/marketing')} />;
}
