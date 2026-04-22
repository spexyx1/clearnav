'use client';

import dynamic from 'next/dynamic';

const ClientSignup = dynamic(() => import('@/components/ClientSignup'), {
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function SignupPage() {
  return <ClientSignup onBack={() => { window.location.href = '/'; }} />;
}
