import { useEffect, useState } from 'react';
import { KeyRound, Landmark, LogOut, LayoutDashboard, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import EmailClient from '../manager/EmailClient';
import MailSignIn from './MailSignIn';

const STAFF_ROLES = ['tenant_admin', 'staff_user', 'superadmin'];

interface MailAppProps {
  onExit: () => void;
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
    </div>
  );
}

export default function MailApp({ onExit }: MailAppProps) {
  const { user, loading, roleCategory, signOut, refetch } = useAuth();
  const [recovery, setRecovery] = useState(false);
  const [roleChecking, setRoleChecking] = useState(false);

  useEffect(() => {
    document.title = 'Mail | Arkline Trust';
  }, []);

  useEffect(() => {
    if (!user || roleCategory) return;
    setRoleChecking(true);
    refetch().finally(() => setRoleChecking(false));
  }, [user?.id]);

  if (loading || roleChecking) return <FullPageSpinner />;

  if (!user || recovery) {
    return <MailSignIn recovery={recovery} onPasswordUpdated={() => setRecovery(false)} onCancel={user ? () => setRecovery(false) : undefined} />;
  }

  if (!roleCategory || !STAFF_ROLES.includes(roleCategory)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Staff only</h1>
          <p className="text-sm text-slate-400 mb-6">
            Mail is available to Arkline Trust staff. You are signed in as {user.email}, which doesn't have staff access.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={onExit} className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              Go to homepage
            </button>
            <button onClick={signOut} className="px-4 py-2 text-sm text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors">
              Switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <header className="flex-shrink-0 h-14 px-3 sm:px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <Landmark className="h-4 w-4 text-cyan-300" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Arkline Trust</div>
            <div className="text-[11px] text-slate-500">Mail</div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden sm:inline text-xs text-slate-500 mr-2 truncate max-w-[220px]">{user.email}</span>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Staff portal"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Staff portal</span>
          </button>
          <button
            onClick={() => setRecovery(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Change password"
          >
            <KeyRound className="h-4 w-4" />
            <span className="hidden md:inline">Password</span>
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <EmailClient fullScreen />
      </main>
    </div>
  );
}
