import { useState, useEffect, useRef } from 'react';
import { Check, Search, Globe, ChevronDown, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  variant?: 'full' | 'compact';
  theme?: 'dark' | 'light';
}

export default function LanguageSelector({ variant = 'full', theme = 'dark' }: LanguageSelectorProps) {
  const { language: currentLanguage, setLanguage, languages } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filteredLanguages = languages.filter(lang =>
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLanguageSelect = async (code: string) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await setLanguage(code);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : t('settings.languageError'));
    } finally {
      setSaving(false);
    }
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage);
  const isDark = theme === 'dark';

  if (variant === 'compact') {
    const buttonClasses = isDark
      ? 'flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700/30 hover:border-slate-600'
      : 'flex items-center gap-2 px-3 py-2 rounded-lg bg-transparent hover:bg-slate-100 transition-colors border border-slate-300 hover:border-slate-400';

    const dropdownClasses = isDark
      ? 'absolute right-0 bottom-full mb-2 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden'
      : 'absolute right-0 bottom-full mb-2 w-72 bg-white border border-slate-300 rounded-lg shadow-xl z-50 overflow-hidden';

    const searchInputClasses = isDark
      ? 'w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500'
      : 'w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500';

    const itemBaseClasses = isDark
      ? 'w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors'
      : 'w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors';

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={() => { setIsOpen(!isOpen); setErrorMsg(null); }}
          className={buttonClasses}
          title={t('settings.selectLanguage')}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Globe className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'} hidden sm:inline`}>
            {currentLang?.nativeName ?? currentLanguage.toUpperCase()}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {errorMsg && (
          <div className={`absolute right-0 bottom-full mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs whitespace-nowrap ${isDark ? 'bg-red-900/80 text-red-300' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        {isOpen && (
          <div className={dropdownClasses} role="listbox">
            <div className={`p-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('settings.searchLanguages')}
                  className={searchInputClasses}
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {filteredLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  disabled={saving}
                  role="option"
                  aria-selected={lang.code === currentLanguage}
                  className={`${itemBaseClasses} ${lang.code === currentLanguage ? (isDark ? 'bg-slate-800/60' : 'bg-slate-100') : ''}`}
                >
                  <div className="flex flex-col items-start">
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{lang.nativeName}</span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lang.name}</span>
                  </div>
                  {lang.code === currentLanguage && (
                    <Check className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                  )}
                </button>
              ))}
              {filteredLanguages.length === 0 && (
                <div className={`px-4 py-6 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="space-y-4">
      <div>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {t('settings.currentLanguage')}
        </label>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
          <Globe className="w-5 h-5 text-cyan-500" />
          <div>
            <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentLang?.nativeName}</div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{currentLang?.name}</div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${isDark ? 'bg-red-900/30 text-red-300 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="relative" ref={dropdownRef}>
        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {t('settings.selectLanguage')}
        </label>

        <button
          ref={triggerRef}
          onClick={() => { setIsOpen(!isOpen); setErrorMsg(null); }}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isDark ? 'bg-slate-800 border border-slate-700 hover:border-slate-600 text-white' : 'bg-white border border-slate-300 hover:border-slate-400 text-slate-900'}`}
        >
          <span>{t('settings.chooseLanguage')}</span>
          <Globe className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
        </button>

        {isOpen && (
          <div className={`absolute left-0 top-full mt-2 w-full rounded-lg shadow-xl z-50 overflow-hidden ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`} role="listbox">
            <div className={`p-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('settings.searchLanguages')}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:border-cyan-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {filteredLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  disabled={saving}
                  role="option"
                  aria-selected={lang.code === currentLanguage}
                  className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} ${lang.code === currentLanguage ? (isDark ? 'bg-slate-800/50' : 'bg-slate-100') : ''}`}
                >
                  <div className="flex flex-col items-start">
                    <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{lang.nativeName}</span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lang.name}</span>
                  </div>
                  {lang.code === currentLanguage && (
                    <Check className="w-5 h-5 text-cyan-500" />
                  )}
                </button>
              ))}

              {filteredLanguages.length === 0 && (
                <div className={`px-4 py-8 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('common.noData')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
