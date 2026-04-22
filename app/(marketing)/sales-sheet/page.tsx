'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const SalesSheet = dynamic(() => import('@/components/SalesSheet'));

export default function SalesSheetPage() {
  const router = useRouter();
  return <SalesSheet onBack={() => router.back()} />;
}
