import { useState, useEffect } from 'react';
import { Shield, FileCheck, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ComplianceCenter() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [kycRecords, setKycRecords] = useState<any[]>([]);
  const [accreditations, setAccreditations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    const [docsRes, kycRes, accredRes] = await Promise.all([
      supabase.from('compliance_documents').select('*, crm_contacts(full_name)').order('uploaded_at', { ascending: false }).limit(50),
      supabase.from('kyc_aml_records').select('*, crm_contacts(full_name)').order('created_at', { ascending: false}).limit(50),
      supabase.from('accreditation_verification').select('*, crm_contacts(full_name)').order('created_at', { ascending: false }).limit(50),
    ]);

    setDocuments(docsRes.data || []);
    setKycRecords(kycRes.data || []);
    setAccreditations(accredRes.data || []);
    setLoading(false);
  };

  const getVerificationColor = (status: string) => {
    const colors: any = {
      pending: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      verified: 'bg-green-500/20 text-green-300 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
      expired: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const pendingDocs = documents.filter(d => d.verification_status === 'pending').length;
  const verifiedDocs = documents.filter(d => d.verification_status === 'verified').length;
  const pendingKyc = kycRecords.filter(k => k.id_verification_status === 'pending' || k.aml_screening_status === 'pending').length;
  const verifiedAccred = accreditations.filter(a => a.verified_accredited).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light text-white mb-1">
          Compliance <span className="font-semibold">Center</span>
        </h2>
        <p className="text-slate-400">Document verification, KYC/AML, and accreditation tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="text-2xl font-bold text-white">{pendingDocs}</span>
          </div>
          <div className="text-sm text-slate-400">Pending Documents</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-bold text-white">{verifiedDocs}</span>
          </div>
          <div className="text-sm text-slate-400">Verified Documents</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <span className="text-2xl font-bold text-white">{pendingKyc}</span>
          </div>
          <div className="text-sm text-slate-400">Pending KYC/AML</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold text-white">{verifiedAccred}</span>
          </div>
          <div className="text-sm text-slate-400">Accredited Investors</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Documents</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileCheck className="w-8 h-8 mx-auto mb-2" />
                No documents uploaded yet
              </div>
            ) : (
              documents.slice(0, 10).map((doc) => (
                <div key={doc.id} className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{doc.crm_contacts?.full_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{doc.document_type.replace('_', ' ')}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getVerificationColor(doc.verification_status)}`}>
                      {doc.verification_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Accreditation Status</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {accreditations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Shield className="w-8 h-8 mx-auto mb-2" />
                No accreditation verifications yet
              </div>
            ) : (
              accreditations.slice(0, 10).map((accred) => (
                <div key={accred.id} className="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{accred.crm_contacts?.full_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Method: {accred.verification_method}
                      </div>
                    </div>
                    {accred.verified_accredited ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-orange-400" />
                    )}
                  </div>
                  {accred.verified_at && (
                    <div className="text-xs text-slate-500">
                      Verified: {new Date(accred.verified_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
