import { useState } from 'react';
import { Scale, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LegalAcceptanceModalProps {
  userId: string;
  tenantId: string | null;
  termsDocumentId: string;
  privacyDocumentId: string;
  termsVersion: string;
  privacyVersion: string;
  onAccepted: () => void;
}

export default function LegalAcceptanceModal({
  userId,
  tenantId,
  termsDocumentId,
  privacyDocumentId,
  termsVersion,
  privacyVersion,
  onAccepted
}: LegalAcceptanceModalProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!termsAccepted || !privacyAccepted) {
      setError('You must accept both the Terms of Service and Privacy Policy to continue.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userAgent = navigator.userAgent;
      const ipAddress = null;

      const acceptances = [
        {
          user_id: userId,
          tenant_id: tenantId,
          document_id: termsDocumentId,
          document_type: 'terms',
          document_version: termsVersion,
          ip_address: ipAddress,
          user_agent: userAgent
        },
        {
          user_id: userId,
          tenant_id: tenantId,
          document_id: privacyDocumentId,
          document_type: 'privacy',
          document_version: privacyVersion,
          ip_address: ipAddress,
          user_agent: userAgent
        }
      ];

      const { error: insertError } = await supabase
        .from('legal_document_acceptances')
        .insert(acceptances);

      if (insertError) throw insertError;

      onAccepted();
    } catch (err) {
      console.error('Error recording acceptance:', err);
      setError('Failed to record acceptance. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6">
          <div className="flex items-center space-x-3">
            <Scale className="w-8 h-8 text-white" />
            <h2 className="text-2xl font-bold text-white">Legal Agreement Required</h2>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-300 mb-6">
            Before you can continue, you must review and accept our legal agreements. Please take a moment to read through these important documents.
          </p>

          <div className="space-y-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <label className="flex items-start space-x-3 cursor-pointer group">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">Terms of Service</div>
                  <p className="text-sm text-slate-400 mb-2">
                    I have read and agree to the Terms of Service, including all limitations of liability and indemnification provisions.
                  </p>
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>Read Terms of Service</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </label>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <label className="flex items-start space-x-3 cursor-pointer group">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium mb-1">Privacy Policy</div>
                  <p className="text-sm text-slate-400 mb-2">
                    I have read and agree to the Privacy Policy and understand how my personal information will be collected, used, and protected.
                  </p>
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>Read Privacy Policy</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              By clicking Accept, you agree to be bound by these terms.
            </p>
            <button
              onClick={handleAccept}
              disabled={!termsAccepted || !privacyAccepted || loading}
              className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Accept and Continue</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
