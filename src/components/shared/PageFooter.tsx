import LanguageSelector from './LanguageSelector';

interface PageFooterProps {
  companyName?: string;
  copyright?: string;
  theme?: 'dark' | 'light';
}

export default function PageFooter({
  companyName = 'ClearNav',
  copyright,
  theme = 'dark'
}: PageFooterProps) {
  const copyrightText = copyright || `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`;

  const containerClasses = theme === 'dark'
    ? 'border-t border-slate-800 bg-slate-950/50'
    : 'border-t border-slate-200 bg-slate-50';

  const textClasses = theme === 'dark'
    ? 'text-slate-500'
    : 'text-slate-600';

  return (
    <footer className={`${containerClasses} py-4 mt-8`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <p className={`text-sm ${textClasses} truncate`}>
            {copyrightText}
          </p>
          <div className="flex-shrink-0">
            <LanguageSelector variant="compact" theme={theme} />
          </div>
        </div>
      </div>
    </footer>
  );
}
