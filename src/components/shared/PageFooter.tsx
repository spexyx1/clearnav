import { Globe } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { languages } from '../../i18n/languages';
import { useState, useRef, useEffect } from 'react';

interface FooterLink {
  label: string;
  href: string;
}

const FOOTER_LINKS: FooterLink[] = [
  { label: 'Investors', href: '/investors' },
];

interface PageFooterProps {
  companyName?: string;
  copyright?: string;
  theme?: 'dark' | 'light';
  showOperatorDetails?: boolean;
}

export default function PageFooter({
  companyName = 'ClearNAV',
  copyright,
  theme = 'dark',
  showOperatorDetails = false,
}: PageFooterProps) {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const copyrightText = copyright || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`;

  const containerClasses = theme === 'dark'
    ? 'border-t border-slate-800 bg-slate-950/50'
    : 'border-t border-slate-200 bg-slate-50';

  const textClasses = theme === 'dark'
    ? 'text-slate-500'
    : 'text-slate-600';

  const buttonClasses = theme === 'dark'
    ? 'flex items-center gap-1 px-2 py-1 rounded text-xs uppercase font-medium text-slate-500 hover:text-slate-300 transition-colors'
    : 'flex items-center gap-1 px-2 py-1 rounded text-xs uppercase font-medium text-slate-600 hover:text-slate-900 transition-colors';

  const dropdownClasses = theme === 'dark'
    ? 'absolute bottom-full right-0 mb-1 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden'
    : 'absolute bottom-full right-0 mb-1 w-40 bg-white border border-slate-300 rounded-lg shadow-xl z-50 overflow-hidden';

  const itemClasses = theme === 'dark'
    ? 'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-800 transition-colors'
    : 'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors';

  const itemTextClasses = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const itemSubtextClasses = theme === 'dark' ? 'text-slate-400 text-xs' : 'text-slate-600 text-xs';

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const linkClasses = theme === 'dark'
    ? 'text-xs text-slate-600 hover:text-slate-400 transition-colors'
    : 'text-xs text-slate-500 hover:text-slate-700 transition-colors';

  const operatorTextClass = theme === 'dark' ? 'text-slate-600' : 'text-slate-400';

  return (
    <footer className={`${containerClasses} py-3 mt-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {showOperatorDetails && (
          <p className={`text-xs text-center pb-2 ${operatorTextClass}`}>
            ClearNAV is operated by Grey Alpha LLC, a Wyoming LLC &mdash; 640 South Broadway Suite 40, Los Angeles, CA 90014
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <p className={`text-xs sm:text-sm ${textClasses}`}>
              {copyrightText}
            </p>
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={linkClasses}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={buttonClasses}
              title="Select Language"
            >
              <Globe className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`} />
              <span className="hidden sm:inline">{(currentLanguage ?? 'en').toUpperCase()}</span>
            </button>

            {isOpen && (
              <div className={dropdownClasses}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={itemClasses}
                  >
                    <span className={itemTextClasses}>{lang.name}</span>
                    <span className={itemSubtextClasses}>{lang.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
