'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth';
import { createClient } from '@/lib/supabase/client';
import { languages, Language, SUPPORTED_LANGUAGES } from './i18n/languages';
import '@/lib/i18n/config';
import i18n from 'i18next';

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => Promise<void>;
  isRTL: boolean;
  languages: Language[];
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [language, setLanguageState] = useState<string>('en');
  const [loading, setLoading] = useState(true);

  const currentLanguage = languages.find((l) => l.code === language);
  const isRTL = currentLanguage?.direction === 'rtl' || false;

  useEffect(() => {
    if (authLoading) return;
    const supabase = createClient();
    (async () => {
      try {
        if (user) {
          const { data } = await supabase.from('user_preferences').select('language').eq('user_id', user.id).maybeSingle();
          if (data?.language) {
            setLanguageState(data.language);
            i18n.changeLanguage(data.language);
          } else {
            const local = localStorage.getItem('language');
            if (local) { setLanguageState(local); i18n.changeLanguage(local); }
          }
        } else {
          const local = localStorage.getItem('language');
          if (local) { setLanguageState(local); i18n.changeLanguage(local); }
        }
      } catch (err) {
        console.error('loadLanguagePreference error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  const setLanguage = async (code: string) => {
    if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(code)) throw new Error(`Unsupported language: ${code}`);
    setLanguageState(code);
    await i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    if (user) {
      const supabase = createClient();
      await supabase.from('user_preferences').upsert({ user_id: user.id, language: code }, { onConflict: 'user_id' });
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  }, [isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, languages, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
