'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/LanguageContext';
import '@/lib/i18n/config';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </AuthProvider>
  );
}
