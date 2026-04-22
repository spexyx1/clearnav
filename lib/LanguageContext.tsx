'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth';
import { createClient } from '@/lib/supabase/client';
import { languages, Language, SUPPORTED_LANGUAGES } from '@/lib/i18n/languages';
import i18n from '@/lib/i18n/config';

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => Promise<void>;
  isRTL: boolean;
  languages: Language[];
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [language, setLanguageState] = useState<string>('en');
  const [loading, setLoading] = useState(true);

  const currentLanguage = languages.find(lang => lang.code === language);
  const isRTL = currentLanguage?.direction === 'rtl' || false;

  useEffect(() => {
    async function loadLanguagePreference() {
      try {
        if (user) {
          const { data } = await supabase
            .from('user_preferences')
            .select('language')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data?.language) {
            setLanguageState(data.language);
            i18n.changeLanguage(data.language);
          } else {
            const localStorageLang = localStorage.getItem('language');
            if (localStorageLang) {
              setLanguageState(localStorageLang);
              i18n.changeLanguage(localStorageLang);
              await supabase
                .from('user_preferences')
                .insert({ user_id: user.id, language: localStorageLang })
                .select()
                .maybeSingle();
            }
          }
        } else {
          const localStorageLang = localStorage.getItem('language');
          if (localStorageLang) {
            setLanguageState(localStorageLang);
            i18n.changeLanguage(localStorageLang);
          }
        }
      } catch (error) {
        console.error('Error in loadLanguagePreference:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadLanguagePreference();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const setLanguage = async (code: string) => {
    try {
      if (!SUPPORTED_LANGUAGES.includes(code as never)) {
        throw new Error(`Language "${code}" is not supported`);
      }
      setLanguageState(code);
      await i18n.changeLanguage(code);
      localStorage.setItem('language', code);
      if (user) {
        await supabase
          .from('user_preferences')
          .upsert({ user_id: user.id, language: code }, { onConflict: 'user_id' });
      }
    } catch (error) {
      console.error('Error setting language:', error);
      setLanguageState('en');
      await i18n.changeLanguage('en');
      throw error;
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
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}

export type { LanguageContextType };
