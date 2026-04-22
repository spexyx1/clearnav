import LegalDocumentViewer from './LegalDocumentViewer';

interface PrivacyPolicyProps {
  tenantId?: string | null;
  onBack?: () => void;
}

export default function PrivacyPolicy({ tenantId, onBack }: PrivacyPolicyProps) {
  return (
    <div>
      {onBack && (
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      )}
      <LegalDocumentViewer documentType="privacy" tenantId={tenantId} />
    </div>
  );
}
