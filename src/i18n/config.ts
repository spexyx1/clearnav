import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import { SUPPORTED_LANGUAGES } from './languages';

function detectInitialLanguage(): string {
  try {
    const stored = localStorage.getItem('language');
    if (stored && SUPPORTED_LANGUAGES.includes(stored as any)) return stored;

    const browser = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES.includes(browser as any)) return browser;
  } catch {
    // localStorage may be unavailable
  }
  return 'en';
}

const initialLng = detectInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      zh: { translation: zh },
      ar: { translation: ar },
      pt: { translation: pt },
      ru: { translation: ru },
      ja: { translation: ja },
      ko: { translation: ko },
    },
    lng: initialLng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
