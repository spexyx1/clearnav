import { useState, useEffect, useRef } from 'react';
import { Check, Search, Globe } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  variant?: 'full' | 'compact';
}

export default function LanguageSelector({ variant = 'full' }: LanguageSelectorProps) {
  const { language: currentLanguage, setLanguage, languages } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredLanguages = languages.filter(lang =>
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageSelect = async (code: string) => {
    setSaving(true);
    try {
      await setLanguage(code);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to update language:', error);
    } finally {
      setSaving(false);
    }
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  if (variant === 'compact') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors text-slate-300 hover:text-white"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-medium uppercase">{currentLanguage}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('settings.searchLanguages')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {filteredLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  disabled={saving}
                  className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors ${
                    lang.code === currentLanguage ? 'bg-slate-800/50' : ''
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-white font-medium">{lang.nativeName}</span>
                    <span className="text-xs text-slate-400">{lang.name}</span>
                  </div>
                  {lang.code === currentLanguage && (
                    <Check className="w-5 h-5 text-cyan-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t('settings.currentLanguage')}
        </label>
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <Globe className="w-5 h-5 text-cyan-500" />
          <div>
            <div className="text-white font-medium">{currentLang?.nativeName}</div>
            <div className="text-xs text-slate-400">{currentLang?.name}</div>
          </div>
        </div>
      </div>

      <div className="relative" ref={dropdownRef}>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {t('settings.selectLanguage')}
        </label>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors text-white"
        >
          <span>{t('settings.chooseLanguage')}</span>
          <Globe className="w-5 h-5 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('settings.searchLanguages')}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
                  className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors ${
                    lang.code === currentLanguage ? 'bg-slate-800/50' : ''
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-white font-medium">{lang.nativeName}</span>
                    <span className="text-xs text-slate-400">{lang.name}</span>
                  </div>
                  {lang.code === currentLanguage && (
                    <Check className="w-5 h-5 text-cyan-500" />
                  )}
                </button>
              ))}

              {filteredLanguages.length === 0 && (
                <div className="px-4 py-8 text-center text-slate-400">
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
