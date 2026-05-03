import { HelpCircle } from 'lucide-react';
import { useTutorial } from '../../lib/tutorial/TutorialContext';

interface Props {
  variant?: 'dark' | 'light';
}

export function HelpButton({ variant = 'dark' }: Props) {
  const { openHelp } = useTutorial();

  const baseClasses = 'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors';
  const variantClasses =
    variant === 'dark'
      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100';

  return (
    <button
      onClick={openHelp}
      data-tour="help-button"
      className={`${baseClasses} ${variantClasses}`}
      title="Help & AI Assistant"
    >
      <HelpCircle size={16} />
      <span className="hidden sm:inline">Help</span>
    </button>
  );
}
