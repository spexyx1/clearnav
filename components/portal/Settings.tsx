import { Globe, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../shared/LanguageSelector';
import IBKRSettings from './IBKRSettings';

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('clientPortal.settings')}</h1>
        <p className="text-slate-400 mt-1">Manage your account preferences and integrations</p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <Globe className="w-6 h-6 text-cyan-500" />
          <div>
            <h2 className="text-xl font-semibold text-white">{t('settings.languagePreferences')}</h2>
            <p className="text-slate-400 text-sm">{t('settings.chooseLanguage')}</p>
          </div>
        </div>
        <LanguageSelector />
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <Link2 className="w-6 h-6 text-cyan-500" />
          <div>
            <h2 className="text-xl font-semibold text-white">IBKR Connection</h2>
            <p className="text-slate-400 text-sm">Manage your Interactive Brokers connection settings</p>
          </div>
        </div>
        <IBKRSettings />
      </div>
    </div>
  );
}
