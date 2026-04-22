import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export default function LoginRoute() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400" />
      </div>
    }>
      <LoginPageClient />
    </Suspense>
  );
}
