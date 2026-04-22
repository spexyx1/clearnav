'use client';

import { useRouter } from 'next/navigation';
import ClientSignup from '@/components/ClientSignup';

export default function SignupPage() {
  const router = useRouter();
  return <ClientSignup onBack={() => router.push('/marketing')} />;
}
