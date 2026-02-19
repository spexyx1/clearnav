import { useState, useEffect } from 'react';
import {
  ArrowLeft, CheckCircle, XCircle, Edit3, Plus, Trash2,
  Loader2, AlertTriangle, Sparkles, User, Building2,
  DollarSign, LayersIcon, Send, TrendingUp, ChevronRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

interface ShareClass {
  name: string;
  total_shares: number | null;
  price_per_share: number | null;
  currency: string | null;
  management_fee_pct: number | null;
  performance_fee_pct: number | null;
}

interface ExtractionResult {
  id: string;
  fund_document_id: string;
  tenant_id: string;
  raw_json: Record<string, unknown>;
  extracted_fund_name: string | null;
  extracted_fund_type: string | null;
  extracted_base_currency: string | null;
  extracted_inception_date: string | null;
  extracted_total_commitments: number | null;
  extracted_share_classes: ShareClass[];
  extracted_investor_name: string | null;
  extracted_investor_email: string | null;
  extracted_investment_amount: number | null;
  extracted_allocated_shares: number | null;
  extracted_share_class: string | null;
  approved_fund_name: string | null;
  approved_fund_type: string | null;
  approved_base_currency: string | null;
  approved_inception_date: string | null;
  approved_total_commitments: number | null;
  approved_share_classes: ShareClass[];
  approved_investor_name: string | null;
  approved_investor_email: string | null;
  approved_investment_amount: number | null;
  approved_allocated_shares: number | null;
  approved_share_class: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_fund_id: string | null;
  created_invitation_id: string | null;
}

interface FundDocument {
  id: string;
  file_name: string;
  document_type: string;
  extraction_status: string;
}

interface DocumentExtractionReviewProps {
  documentId: string;
  onBack: () => void;
  onApproved: (resultId: string, createdFundId: string | null, createdInvitationId: string | null) => void;
}

const FUND_TYPES = ['PE', 'VC', 'Real Estate', 'Credit', 'Family Office', 'Alternative', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SGD', 'HKD'];

export default function DocumentExtractionReview({
  documentId,
  onBack,
  onApproved,
}: DocumentExtractionReviewProps) {
  const { currentTenant, user } = useAuth();
  const [document, setDocument] = useState<FundDocument | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const [editedFundName, setEditedFundName] = useState('');
  const [editedFundType, setEditedFundType] = useState('');
  const [editedCurrency, setEditedCurrency] = useState('USD');
  const [editedInceptionDate, setEditedInceptionDate] = useState('');
  const [editedTotalCommitments, setEditedTotalCommitments] = useState('');
  const [editedShareClasses, setEditedShareClasses] = useState<ShareClass[]>([]);
  const [editedInvestorName, setEditedInvestorName] = useState('');
  const [editedInvestorEmail, setEditedInvestorEmail] = useState('');
  const [editedInvestmentAmount, setEditedInvestmentAmount] = useState('');
  const [editedAllocatedShares, setEditedAllocatedShares] = useState('');
  const [editedShareClass, setEditedShareClass] = useState('');

  useEffect(() => {
    if (documentId) loadData();
  }, [documentId]);

  const loadData = async () => {
    setLoading(true);
    const [docRes, resultRes] = await Promise.all([
      supabase.from('fund_documents').select('*').eq('id', documentId).maybeSingle(),
      supabase.from('document_extraction_results').select('*').eq('fund_document_id', documentId).maybeSingle(),
    ]);

    if (docRes.data) setDocument(docRes.data as FundDocument);

    if (resultRes.data) {
      const r = resultRes.data as ExtractionResult;
      setResult(r);
      setEditedFundName(r.approved_fund_name ?? r.extracted_fund_name ?? '');
      setEditedFundType(r.approved_fund_type ?? r.extracted_fund_type ?? 'Other');
      setEditedCurrency(r.approved_base_currency ?? r.extracted_base_currency ?? 'USD');
      setEditedInceptionDate(r.approved_inception_date ?? r.extracted_inception_date ?? '');
      setEditedTotalCommitments(String(r.approved_total_commitments ?? r.extracted_total_commitments ?? ''));
      setEditedShareClasses(
        (r.approved_share_classes?.length ? r.approved_share_classes : r.extracted_share_classes) ?? []
      );
      setEditedInvestorName(r.approved_investor_name ?? r.extracted_investor_name ?? '');
      setEditedInvestorEmail(r.approved_investor_email ?? r.extracted_investor_email ?? '');
      setEditedInvestmentAmount(String(r.approved_investment_amount ?? r.extracted_investment_amount ?? ''));
      setEditedAllocatedShares(String(r.approved_allocated_shares ?? r.extracted_allocated_shares ?? ''));
      setEditedShareClass(r.approved_share_class ?? r.extracted_share_class ?? '');
    }
    setLoading(false);
  };

  const buildApprovedPayload = () => ({
    approved_fund_name: editedFundName,
    approved_fund_type: editedFundType,
    approved_base_currency: editedCurrency,
    approved_inception_date: editedInceptionDate || null,
    approved_total_commitments: parseFloat(editedTotalCommitments) || null,
    approved_share_classes: editedShareClasses,
    approved_investor_name: editedInvestorName || null,
    approved_investor_email: editedInvestorEmail || null,
    approved_investment_amount: parseFloat(editedInvestmentAmount) || null,
    approved_allocated_shares: parseFloat(editedAllocatedShares) || null,
    approved_share_class: editedShareClass || null,
  });

  const handleSaveDraft = async () => {
    if (!result) return;
    setSaving(true);
    await supabase
      .from('document_extraction_results')
      .update({ ...buildApprovedPayload(), updated_at: new Date().toISOString() })
      .eq('id', result.id);
    setSaving(false);
  };

  const handleApprove = async () => {
    if (!result || !currentTenant?.id) return;
    setApproving(true);
    setError(null);

    try {
      await supabase
        .from('document_extraction_results')
        .update({ ...buildApprovedPayload(), updated_at: new Date().toISOString() })
        .eq('id', result.id);

      let createdFundId: string | null = null;

      const fundCode = (editedFundName || 'FUND')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8) + '-' + Date.now().toString().slice(-4);

      const { data: newFund, error: fundError } = await supabase
        .from('funds')
        .insert({
          tenant_id: currentTenant.id,
          fund_code: fundCode,
          fund_name: editedFundName,
          fund_type: (editedFundType || 'other').toLowerCase().replace(/\s+/g, '_'),
          base_currency: editedCurrency || 'USD',
          inception_date: editedInceptionDate || new Date().toISOString().split('T')[0],
          accounting_standard: 'GAAP',
          nav_frequency: 'monthly',
          total_commitments: parseFloat(editedTotalCommitments) || 0,
          status: 'active',
        })
        .select()
        .single();

      if (fundError) throw new Error(`Failed to create fund: ${fundError.message}`);
      createdFundId = newFund.id;

      for (const sc of editedShareClasses) {
        if (!sc.name) continue;
        const classCode = sc.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'A';
        await supabase.from('share_classes').insert({
          fund_id: createdFundId,
          class_code: classCode,
          class_name: sc.name,
          currency: sc.currency || editedCurrency || 'USD',
          management_fee_pct: sc.management_fee_pct ?? 1.5,
          performance_fee_pct: sc.performance_fee_pct ?? 20,
          hurdle_rate_pct: 8,
          high_water_mark: true,
          share_price_precision: 4,
          minimum_investment: sc.price_per_share ?? 1000,
          status: 'active',
        });

        if (sc.total_shares && sc.price_per_share) {
          const totalNAV = sc.total_shares * sc.price_per_share;
          await supabase.from('nav_calculations').insert({
            tenant_id: currentTenant.id,
            fund_id: createdFundId,
            calculation_date: editedInceptionDate || new Date().toISOString().split('T')[0],
            nav_per_share: sc.price_per_share,
            total_nav: totalNAV,
            total_shares_outstanding: sc.total_shares,
            status: 'draft',
            notes: `Initial NAV from document extraction: ${document?.file_name}`,
            version: 1,
          });
        }
      }

      let createdInvitationId: string | null = null;

      if (editedInvestorEmail) {
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data: invitation } = await supabase
          .from('client_invitations')
          .insert({
            tenant_id: currentTenant.id,
            email: editedInvestorEmail,
            first_name: editedInvestorName?.split(' ')[0] ?? '',
            last_name: editedInvestorName?.split(' ').slice(1).join(' ') ?? '',
            invitation_token: token,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
            reminder_count: 0,
            invited_by: user?.id ?? null,
            pre_populated_fund_id: createdFundId,
            pre_populated_share_class: editedShareClass || null,
            pre_populated_shares: parseFloat(editedAllocatedShares) || null,
            pre_populated_investment_amount: parseFloat(editedInvestmentAmount) || null,
            source_document_id: documentId,
            custom_message: `You have been invited to access your investment in ${editedFundName}.`,
          })
          .select()
          .single();

        if (invitation) {
          createdInvitationId = invitation.id;

          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invitation-email`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ invitation_id: invitation.id }),
            }).catch(() => {});
          }
        }
      }

      await supabase
        .from('document_extraction_results')
        .update({
          approval_status: 'approved',
          approved_by: user?.id ?? null,
          approved_at: new Date().toISOString(),
          created_fund_id: createdFundId,
          created_invitation_id: createdInvitationId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', result.id);

      await supabase
        .from('fund_documents')
        .update({ extraction_status: 'approved', fund_id: createdFundId, updated_at: new Date().toISOString() })
        .eq('id', documentId);

      onApproved(result.id, createdFundId, createdInvitationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!result) return;
    setSaving(true);
    await supabase
      .from('document_extraction_results')
      .update({
        approval_status: 'rejected',
        rejection_notes: rejectionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', result.id);
    await supabase
      .from('fund_documents')
      .update({ extraction_status: 'failed', extraction_error: rejectionNotes, updated_at: new Date().toISOString() })
      .eq('id', documentId);
    setSaving(false);
    onBack();
  };

  const updateShareClass = (index: number, field: keyof ShareClass, value: string | number | null) => {
    setEditedShareClasses((prev) => prev.map((sc, i) => i === index ? { ...sc, [field]: value } : sc));
  };

  const addShareClass = () => {
    setEditedShareClasses((prev) => [...prev, {
      name: `Class ${String.fromCharCode(65 + prev.length)}`,
      total_shares: null,
      price_per_share: null,
      currency: editedCurrency,
      management_fee_pct: 1.5,
      performance_fee_pct: 20,
    }]);
  };

  const removeShareClass = (index: number) => {
    setEditedShareClasses((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <p className="text-white font-semibold">Extraction results not found</p>
        <p className="text-slate-400 text-sm mt-1">The document may still be processing.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const isApproved = result.approval_status === 'approved';

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-xl font-bold text-white">Review Extraction</h3>
          <p className="text-slate-400 text-sm mt-0.5">{document?.file_name}</p>
        </div>
        {isApproved && (
          <span className="ml-auto flex items-center space-x-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Approved</span>
          </span>
        )}
      </div>

      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex items-start space-x-3">
        <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-cyan-300 font-medium text-sm">AI-extracted data — please review before approving</p>
          <p className="text-cyan-400/70 text-xs mt-0.5">
            All fields are editable. Approving will create the fund, share classes, initial NAV, and send an investor invitation if an email was found.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start space-x-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-white">Fund Details</h4>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Fund Name</label>
              <input
                type="text"
                value={editedFundName}
                onChange={(e) => setEditedFundName(e.target.value)}
                disabled={isApproved}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Fund Type</label>
                <select
                  value={editedFundType}
                  onChange={(e) => setEditedFundType(e.target.value)}
                  disabled={isApproved}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                >
                  {FUND_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Base Currency</label>
                <select
                  value={editedCurrency}
                  onChange={(e) => setEditedCurrency(e.target.value)}
                  disabled={isApproved}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Inception Date</label>
                <input
                  type="date"
                  value={editedInceptionDate}
                  onChange={(e) => setEditedInceptionDate(e.target.value)}
                  disabled={isApproved}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Total Commitments</label>
                <input
                  type="number"
                  value={editedTotalCommitments}
                  onChange={(e) => setEditedTotalCommitments(e.target.value)}
                  disabled={isApproved}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center space-x-2">
            <User className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-white">Investor Details</h4>
            <span className="ml-auto text-xs text-slate-500">Optional — triggers invitation email</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Investor Name</label>
                <input
                  type="text"
                  value={editedInvestorName}
                  onChange={(e) => setEditedInvestorName(e.target.value)}
                  disabled={isApproved}
                  placeholder="Full name"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={editedInvestorEmail}
                  onChange={(e) => setEditedInvestorEmail(e.target.value)}
                  disabled={isApproved}
                  placeholder="investor@email.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Investment Amount</label>
                <input
                  type="number"
                  value={editedInvestmentAmount}
                  onChange={(e) => setEditedInvestmentAmount(e.target.value)}
                  disabled={isApproved}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Allocated Shares</label>
                <input
                  type="number"
                  value={editedAllocatedShares}
                  onChange={(e) => setEditedAllocatedShares(e.target.value)}
                  disabled={isApproved}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Share Class</label>
              <select
                value={editedShareClass}
                onChange={(e) => setEditedShareClass(e.target.value)}
                disabled={isApproved}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
              >
                <option value="">— Select share class —</option>
                {editedShareClasses.map((sc) => (
                  <option key={sc.name} value={sc.name}>{sc.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LayersIcon className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-white">Share Classes</h4>
            <span className="text-xs text-slate-500">— initial NAV will be set from price per share</span>
          </div>
          {!isApproved && (
            <button
              onClick={addShareClass}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          )}
        </div>

        {editedShareClasses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">No share classes extracted. Add one manually.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Class Name</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Total Shares</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Price / Share</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Mgmt Fee %</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Perf Fee %</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">Initial NAV</th>
                  {!isApproved && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {editedShareClasses.map((sc, i) => (
                  <tr key={i} className="border-b border-slate-700/50 last:border-0">
                    <td className="px-5 py-3">
                      <input
                        type="text"
                        value={sc.name}
                        onChange={(e) => updateShareClass(i, 'name', e.target.value)}
                        disabled={isApproved}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:ring-1 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={sc.total_shares ?? ''}
                        onChange={(e) => updateShareClass(i, 'total_shares', parseFloat(e.target.value) || null)}
                        disabled={isApproved}
                        placeholder="—"
                        className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm text-right focus:ring-1 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={sc.price_per_share ?? ''}
                        onChange={(e) => updateShareClass(i, 'price_per_share', parseFloat(e.target.value) || null)}
                        disabled={isApproved}
                        placeholder="—"
                        className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm text-right focus:ring-1 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={sc.management_fee_pct ?? ''}
                        onChange={(e) => updateShareClass(i, 'management_fee_pct', parseFloat(e.target.value) || null)}
                        disabled={isApproved}
                        placeholder="—"
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm text-right focus:ring-1 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={sc.performance_fee_pct ?? ''}
                        onChange={(e) => updateShareClass(i, 'performance_fee_pct', parseFloat(e.target.value) || null)}
                        disabled={isApproved}
                        placeholder="—"
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-sm text-right focus:ring-1 focus:ring-cyan-500 focus:outline-none disabled:opacity-60"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sc.total_shares && sc.price_per_share ? (
                        <span className="text-cyan-400 font-medium">
                          {(sc.total_shares * sc.price_per_share).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    {!isApproved && (
                      <td className="px-3 py-3">
                        <button
                          onClick={() => removeShareClass(i)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isApproved && result.created_fund_id && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-semibold">Successfully Approved</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-lg">
              <TrendingUp className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Fund &amp; NAV Draft Created</p>
                <p className="text-sm text-white font-medium">{editedFundName}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
            </div>
            {result.created_invitation_id && (
              <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-lg">
                <Send className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Invitation Sent</p>
                  <p className="text-sm text-white font-medium">{editedInvestorEmail}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
              </div>
            )}
          </div>
        </div>
      )}

      {!isApproved && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowRejectForm(!showRejectForm)}
              className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 rounded-lg text-sm transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
              <span>Save Draft</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={approving || !editedFundName || editedShareClasses.length === 0}
              className="flex items-center space-x-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>{approving ? 'Processing...' : 'Approve & Create'}</span>
            </button>
          </div>
        </div>
      )}

      {showRejectForm && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
          <p className="text-red-300 text-sm font-medium">Rejection notes (optional)</p>
          <textarea
            value={rejectionNotes}
            onChange={(e) => setRejectionNotes(e.target.value)}
            rows={3}
            placeholder="Describe why this extraction is being rejected..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowRejectForm(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              <span>Confirm Rejection</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
