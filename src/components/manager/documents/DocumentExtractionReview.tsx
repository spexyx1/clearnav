import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2, AlertTriangle, FileText, Sparkles, UserCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import {
  sanitizeTerms, hasValue, numberOf, loadDealingTerms,
  type DealingTerms, type DocumentClass, type TermEntry,
} from '../../../lib/dealingTerms';
import { TermsTable, ClassMappingTable, type ExistingClass } from './ReviewFields';

interface FundDocument {
  id: string;
  tenant_id: string;
  fund_id: string | null;
  file_name: string;
  document_type: string;
  extraction_status: string;
}

interface ResultRow {
  id: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  extraction_source: string;
  extracted_terms: unknown;
  approved_terms: unknown;
  approved_share_classes: unknown;
  extracted_share_classes: unknown;
  class_mapping: Record<string, string> | null;
  raw_json: { notes?: string } | null;
}

interface Props {
  documentId: string;
  onBack: () => void;
  onApproved: (fundId: string, classesUpdated: number) => void;
}

const DOC_LABELS: Record<string, string> = {
  trust_deed: 'Trust deed', im: 'Information memorandum', ppm: 'Offering memorandum',
  subscription_agreement: 'Subscription agreement', other: 'Document',
};

function toClasses(raw: unknown): DocumentClass[] {
  return Array.isArray(raw) ? raw.filter(c => c && typeof c.name === 'string') : [];
}

export default function DocumentExtractionReview({ documentId, onBack, onApproved }: Props) {
  const { user } = useAuth();
  const [doc, setDoc] = useState<FundDocument | null>(null);
  const [result, setResult] = useState<ResultRow | null>(null);
  const [funds, setFunds] = useState<{ id: string; fund_name: string }[]>([]);
  const [fundId, setFundId] = useState('');
  const [classes, setClasses] = useState<ExistingClass[]>([]);
  const [current, setCurrent] = useState<{ terms: DealingTerms; sourceDocumentIds: string[] } | null>(null);
  const [terms, setTerms] = useState<DealingTerms>({});
  const [docClasses, setDocClasses] = useState<DocumentClass[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: d, error: dErr } = await supabase
          .from('fund_documents')
          .select('id, tenant_id, fund_id, file_name, document_type, extraction_status')
          .eq('id', documentId)
          .maybeSingle();
        if (dErr || !d) throw new Error('This document could not be found.');
        setDoc(d);

        const cols = 'id, approval_status, extraction_source, extracted_terms, approved_terms, approved_share_classes, extracted_share_classes, class_mapping, raw_json';
        let { data: r, error: rErr } = await supabase
          .from('document_extraction_results').select(cols).eq('fund_document_id', documentId).maybeSingle();
        if (rErr) throw new Error(rErr.message);
        if (!r) {
          const ins = await supabase
            .from('document_extraction_results')
            .insert({ fund_document_id: documentId, tenant_id: d.tenant_id, extraction_source: 'reviewer', raw_json: {} })
            .select(cols).single();
          if (ins.error) throw new Error(ins.error.message);
          r = ins.data;
        }
        const row = r as ResultRow;
        setResult(row);
        const approved = sanitizeTerms(row.approved_terms);
        setTerms(Object.keys(approved).length ? approved : sanitizeTerms(row.extracted_terms));
        const ac = toClasses(row.approved_share_classes);
        setDocClasses(ac.length ? ac : toClasses(row.extracted_share_classes));
        setMapping(row.class_mapping ?? {});

        const { data: f, error: fErr } = await supabase
          .from('funds').select('id, fund_name').eq('tenant_id', d.tenant_id).order('created_at');
        if (fErr) throw new Error(fErr.message);
        setFunds(f ?? []);
        setFundId(d.fund_id ?? f?.[0]?.id ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load this document.');
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId]);

  const loadFundContext = useCallback(async (id: string) => {
    if (!id) { setClasses([]); setCurrent(null); return; }
    const [{ data, error: cErr }, dealing] = await Promise.all([
      supabase.from('share_classes')
        .select('id, class_code, class_name, management_fee_pct, performance_fee_pct, hurdle_rate_pct, minimum_investment')
        .eq('fund_id', id).order('class_code'),
      loadDealingTerms(id).catch(() => null),
    ]);
    if (cErr) setError(cErr.message);
    setClasses(data ?? []);
    setCurrent(dealing ? { terms: dealing.terms, sourceDocumentIds: dealing.sourceDocumentIds } : { terms: {}, sourceDocumentIds: [] });
  }, []);

  useEffect(() => { loadFundContext(fundId); }, [fundId, loadFundContext]);

  const filledCount = Object.values(terms).filter(hasValue).length;

  const handleApprove = async () => {
    if (!doc || !result || !fundId || !current) return;
    setSaving(true);
    setError(null);
    try {
      const filled = Object.fromEntries(Object.entries(terms).filter(([, t]) => hasValue(t))) as DealingTerms;
      const merged: DealingTerms = { ...current.terms, ...filled };
      const now = new Date().toISOString();

      const { error: tErr } = await supabase.from('fund_dealing_terms').upsert({
        tenant_id: doc.tenant_id,
        fund_id: fundId,
        terms: merged,
        source_document_ids: Array.from(new Set([...current.sourceDocumentIds, doc.id])),
        approved_by: user?.id ?? null,
        approved_at: now,
        updated_at: now,
      }, { onConflict: 'fund_id' });
      if (tErr) throw new Error(`Could not save dealing rules: ${tErr.message}`);

      const hwm = merged.high_water_mark;
      let updatedCount = 0;
      for (const dc of docClasses) {
        const target = classes.find(c => c.id === mapping[dc.name]);
        if (!target) continue;
        const pick = (own?: TermEntry | null, fundWide?: TermEntry) => numberOf(own) ?? numberOf(fundWide);
        const patch: Record<string, number | boolean> = {};
        const mgmt = pick(dc.management_fee_pct, filled.management_fee_pct);
        const perf = pick(dc.performance_fee_pct, filled.performance_fee_pct);
        const hurdle = pick(dc.hurdle_rate_pct, filled.hurdle_rate_pct);
        const min = pick(dc.minimum_investment, filled.minimum_initial_investment);
        if (mgmt !== null && mgmt !== target.management_fee_pct) patch.management_fee_pct = mgmt;
        if (perf !== null && perf !== target.performance_fee_pct) patch.performance_fee_pct = perf;
        if (hurdle !== null && hurdle !== target.hurdle_rate_pct) patch.hurdle_rate_pct = hurdle;
        if (min !== null && min !== target.minimum_investment) patch.minimum_investment = min;
        if (hasValue(hwm)) patch.high_water_mark = hwm.value === true || hwm.value === 'true';
        if (!Object.keys(patch).length) continue;
        const { error: sErr } = await supabase.from('share_classes').update(patch).eq('id', target.id);
        if (sErr) throw new Error(`Could not update ${target.class_name}: ${sErr.message}`);
        updatedCount++;
      }

      const { error: rErr } = await supabase.from('document_extraction_results').update({
        approved_terms: terms,
        approved_share_classes: docClasses,
        class_mapping: mapping,
        approval_status: 'approved',
        approved_by: user?.id ?? null,
        approved_at: now,
        updated_at: now,
      }).eq('id', result.id);
      if (rErr) throw new Error(rErr.message);

      const { error: dErr } = await supabase.from('fund_documents')
        .update({ extraction_status: 'approved', fund_id: fundId, updated_at: now }).eq('id', doc.id);
      if (dErr) throw new Error(dErr.message);

      onApproved(fundId, updatedCount);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!result) return;
    setSaving(true);
    const { error: rErr } = await supabase.from('document_extraction_results')
      .update({ approval_status: 'rejected', rejection_notes: rejectNotes || null, updated_at: new Date().toISOString() })
      .eq('id', result.id);
    setSaving(false);
    if (rErr) { setError(rErr.message); return; }
    onBack();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>;
  }

  if (!doc || !result) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
        <p className="text-red-300">{error ?? 'This document could not be loaded.'}</p>
      </div>
    );
  }

  const readByAi = result.extraction_source === 'ai';
  const card = 'rounded-xl border border-slate-700 bg-slate-800/30 p-5';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to documents
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10"><FileText className="w-5 h-5 text-cyan-300" /></div>
            <div>
              <h2 className="text-lg font-semibold text-white">{doc.file_name}</h2>
              <p className="text-sm text-slate-400">{DOC_LABELS[doc.document_type] ?? 'Document'} · {filledCount} terms filled</p>
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-xs border ${readByAi ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-sky-500/40 text-sky-300 bg-sky-500/10'}`}>
          {readByAi ? <Sparkles className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          {readByAi ? 'Read automatically, check each term' : 'Filled in by reviewer'}
        </span>
      </div>

      {result.approval_status === 'approved' && (
        <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-sm text-green-300">
          These terms were already approved. Approving again will save any changes you make.
        </div>
      )}
      {result.raw_json?.notes && <p className="text-sm text-slate-400 italic">{result.raw_json.notes}</p>}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <section className={card}>
        <h3 className="text-white font-medium mb-1">Which fund do these terms belong to?</h3>
        <p className="text-sm text-slate-400 mb-3">Approving updates this fund. No new fund is created.</p>
        {funds.length === 0 ? (
          <p className="text-sm text-amber-300">Create the fund first, then come back to approve these terms.</p>
        ) : (
          <select value={fundId} onChange={e => setFundId(e.target.value)}
            className="w-full sm:w-80 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            {funds.map(f => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
          </select>
        )}
      </section>

      <section className={card}>
        <h3 className="text-white font-medium mb-1">Dealing and fee terms</h3>
        <p className="text-sm text-slate-400 mb-4">Each value should point to the clause and page it came from. Blank terms keep the current setting.</p>
        <TermsTable terms={terms} current={current?.terms ?? {}} onChange={(k, entry) => setTerms(t => ({ ...t, [k]: entry }))} />
      </section>

      <section className={card}>
        <h3 className="text-white font-medium mb-1">Share classes</h3>
        <p className="text-sm text-slate-400 mb-4">Link each class named in the document to one of your existing classes.</p>
        <ClassMappingTable docClasses={docClasses} existing={classes} mapping={mapping}
          onClassesChange={setDocClasses} onMappingChange={setMapping} />
      </section>

      {rejecting && (
        <section className={card}>
          <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Why are these terms being rejected?"
            className="w-full h-20 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
        </section>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        {rejecting ? (
          <>
            <button onClick={() => setRejecting(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
            <button onClick={handleReject} disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50">
              <XCircle className="w-4 h-4" /> Confirm reject
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setRejecting(true)} className="px-4 py-2 rounded-lg border border-slate-600 text-sm text-slate-300 hover:border-red-500/50 hover:text-red-300 transition-colors">
              Reject
            </button>
            <button onClick={handleApprove} disabled={saving || !fundId || filledCount === 0}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve and apply to fund
            </button>
          </>
        )}
      </div>
    </div>
  );
}
