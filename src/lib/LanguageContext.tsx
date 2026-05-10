import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';
import { languages, Language, SUPPORTED_LANGUAGES } from '../i18n/languages';
import i18n from '../i18n/config';

interface LanguageContextType {
  language: string;
  setLanguage: (code: string) => Promise<void>;
  isRTL: boolean;
  languages: Language[];
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function resolveLocalLanguage(): string {
  try {
    const stored = localStorage.getItem('language');
    if (stored && SUPPORTED_LANGUAGES.includes(stored as any)) return stored;
    const browser = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(browser as any)) return browser;
  } catch { /* ignore */ }
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  // Initialise from localStorage/browser so the state matches what i18n already set at module load time
  const [language, setLanguageState] = useState<string>(() => resolveLocalLanguage());
  const [loading, setLoading] = useState(true);

  const currentLanguage = languages.find(lang => lang.code === language);
  const isRTL = currentLanguage?.direction === 'rtl' || false;

  // Sync document direction whenever language changes
  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [isRTL, language]);

  // On auth resolve, reconcile language preference from server
  useEffect(() => {
    if (authLoading) return;

    async function loadLanguagePreference() {
      try {
        if (user) {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('language')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            // non-fatal, fall through to localStorage
          }

          const serverLang = data?.language;
          const localLang = resolveLocalLanguage();

          if (serverLang && SUPPORTED_LANGUAGES.includes(serverLang as any)) {
            // Server is source of truth for signed-in users
            if (serverLang !== language) {
              setLanguageState(serverLang);
              await i18n.changeLanguage(serverLang);
              try { localStorage.setItem('language', serverLang); } catch { /* ignore */ }
            }
          } else if (localLang !== 'en') {
            // No server preference yet — persist the local preference
            setLanguageState(localLang);
            await i18n.changeLanguage(localLang);
            await supabase
              .from('user_preferences')
              .upsert({ user_id: user.id, language: localLang }, { onConflict: 'user_id' });
          }
        } else {
          const localLang = resolveLocalLanguage();
          if (localLang !== language) {
            setLanguageState(localLang);
            await i18n.changeLanguage(localLang);
          }
        }
      } catch (err) {
        // Non-fatal — UI already rendered in the detected language
      } finally {
        setLoading(false);
      }
    }

    loadLanguagePreference();
  }, [user, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLanguage = async (code: string) => {
    if (!SUPPORTED_LANGUAGES.includes(code as any)) {
      throw new Error(`Language "${code}" is not supported`);
    }

    setLanguageState(code);
    await i18n.changeLanguage(code);

    try {
      localStorage.setItem('language', code);
    } catch { /* ignore */ }

    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, language: code }, { onConflict: 'user_id' });
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, languages, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
