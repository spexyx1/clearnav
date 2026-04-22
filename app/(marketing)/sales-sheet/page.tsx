'use client';

import { useRouter } from 'next/navigation';
import SalesSheet from '@/components/SalesSheet';

export default function SalesSheetPage() {
  const router = useRouter();
  return <SalesSheet onBack={() => router.push('/marketing')} />;
}
