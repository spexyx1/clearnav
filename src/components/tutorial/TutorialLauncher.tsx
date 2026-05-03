import { useState } from 'react';
import { HelpCircle, BookOpen, RotateCcw, MessageSquare, X } from 'lucide-react';
import { useTutorial } from '../../lib/tutorial/TutorialContext';

export function TutorialLauncher() {
  const { status, restart, openHelp, isOpen } = useTutorial();
  const [menuOpen, setMenuOpen] = useState(false);

  // Only show after the user has interacted with the tutorial at least once
  if (!status || status === 'not_started' || isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9980] flex flex-col items-end gap-2">
      {/* Popover menu */}
      {menuOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 w-52 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => { restart(); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw size={15} className="text-blue-500 flex-shrink-0" />
            <span className="font-medium">Restart tour</span>
          </button>
          <button
            onClick={() => { openHelp(); setMenuOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <MessageSquare size={15} className="text-blue-500 flex-shrink-0" />
            <span className="font-medium">Ask AI assistant</span>
          </button>
        </div>
      )}

      {/* Launcher button */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        data-tour="help-launcher"
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          menuOpen
            ? 'bg-slate-700 text-white rotate-90'
            : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
        }`}
        title="Help & Tour"
      >
        {menuOpen ? <X size={20} /> : <HelpCircle size={22} />}
      </button>
    </div>
  );
}
