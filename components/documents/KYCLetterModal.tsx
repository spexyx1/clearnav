import { useState, useRef, useEffect } from 'react';
import { X, FileText, Printer, Loader2, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth';
import KYCVerificationLetter, { type KYCLetterData } from './KYCVerificationLetter';

interface KYCRecord {
  id: string;
  contact_id: string | null;
  full_legal_name: string | null;
  didit_session_id: string | null;
  didit_session_status: string | null;
  id_verification_status: string | null;
  aml_screening_status: string | null;
  verification_completed_at: string | null;
  crm_contacts: { full_name: string; email: string } | null;
}

interface KYCLetterModalProps {
  record: KYCRecord;
  onClose: () => void;
}

interface ComplianceOfficerSignature {
  id: string;
  officer_name: string;
  officer_title: string;
  signature_image_url: string | null;
}

interface TenantBillingDetails {
  billing_address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  } | null;
  billing_email: string | null;
}

function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `KYC-${year}-${rand}`;
}

function formatAddress(addr: TenantBillingDetails['billing_address']): string | null {
  if (!addr) return null;
  const parts = [addr.street, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function KYCLetterModal({ record, onClose }: KYCLetterModalProps) {
  const { currentTenant, user } = useAuth();
  const letterRef = useRef<HTMLDivElement>(null);

  const [recipientName, setRecipientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [complianceOfficer, setComplianceOfficer] = useState<ComplianceOfficerSignature | null>(null);
  const [tenantBilling, setTenantBilling] = useState<TenantBillingDetails | null>(null);
  const [referenceNumber] = useState(generateReferenceNumber);

  useEffect(() => {
    const load = async () => {
      const [officerRes, billingRes] = await Promise.all([
        supabase
          .from('compliance_officer_signatures')
          .select('id, officer_name, officer_title, signature_image_url')
          .eq('is_active', true)
          .maybeSingle(),
        currentTenant
          ? supabase
              .from('tenant_billing_details')
              .select('billing_address, billing_email')
              .eq('tenant_id', currentTenant.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setComplianceOfficer((officerRes.data as ComplianceOfficerSignature) || null);
      setTenantBilling((billingRes.data as TenantBillingDetails) || null);
      setLoading(false);
    };
    load();
  }, [currentTenant]);

  const clientName =
    record.crm_contacts?.full_name || record.full_legal_name || 'Unknown';

  const letterData: KYCLetterData = {
    referenceNumber,
    issuedAt: new Date().toISOString(),
    recipientName: recipientName || '___________________________',
    tenantName: currentTenant?.name || '',
    tenantEmail: (currentTenant?.tenant_email_address as string | null) || null,
    tenantAddress: formatAddress(tenantBilling?.billing_address || null),
    clientName,
    verificationDate: record.verification_completed_at,
    idVerificationStatus: record.id_verification_status,
    amlScreeningStatus: record.aml_screening_status,
    diditSessionId: record.didit_session_id,
    complianceOfficerName: complianceOfficer?.officer_name || null,
    complianceOfficerTitle: complianceOfficer?.officer_title || null,
    signatureImageUrl: complianceOfficer?.signature_image_url || null,
  };

  const handlePrint = async () => {
    if (!recipientName.trim()) {
      setError('Please enter a recipient name or institution before printing.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (currentTenant && user) {
        await supabase.from('kyc_verification_letter_logs').insert({
          reference_number: referenceNumber,
          tenant_id: currentTenant.id,
          kyc_record_id: record.id,
          client_name: clientName,
          recipient_name: recipientName.trim(),
          issued_by_user_id: user.id,
          compliance_officer_signature_id: complianceOfficer?.id || null,
        });
      }

      setSaved(true);

      setTimeout(() => {
        window.print();
      }, 100);
    } catch {
      setError('Failed to log the letter. You may still print by trying again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-slate-900 rounded-xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading letter data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#kyc-print-root) { display: none !important; }
          #kyc-print-root { display: block !important; }
          #kyc-print-root .kyc-no-print { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div id="kyc-print-root" className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="kyc-no-print min-h-screen py-6 px-4 flex flex-col items-center">
          <div className="w-full max-w-4xl">
            <div className="bg-slate-900 border border-slate-700 rounded-xl mb-4 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-cyan-500/15 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">KYC Verification Letter</h2>
                    <p className="text-xs text-slate-400">{clientName} &mdash; Ref: {referenceNumber}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {!complianceOfficer && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    No compliance officer has been designated on the platform. The signature block will appear as a blank
                    line for physical signing. To add a digital signature, a Platform Administrator must designate a
                    Compliance Officer via the Platform Admin Portal.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Recipient Name / Institution <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={recipientName}
                      onChange={e => { setRecipientName(e.target.value); setError(null); }}
                      placeholder="e.g. XYZ Bank Compliance Department"
                      className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Who this letter is addressed to</p>
                </div>

                {complianceOfficer && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-500/8 border border-emerald-500/20 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-emerald-300">Signature on file</p>
                      <p className="text-xs text-slate-400 mt-0.5">{complianceOfficer.officer_name}</p>
                      <p className="text-xs text-slate-500">{complianceOfficer.officer_title}</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 mt-3 p-2.5 bg-red-500/10 border border-red-500/25 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrint}
                  disabled={saving || !recipientName.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Preparing...</>
                  ) : (
                    <><Printer className="w-4 h-4" /> Print / Save as PDF</>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-100 rounded-xl overflow-hidden shadow-inner p-4 flex justify-center">
              <div className="shadow-xl">
                <KYCVerificationLetter ref={letterRef} data={letterData} />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden print:block">
          <KYCVerificationLetter data={letterData} />
        </div>
      </div>
    </>
  );
}
