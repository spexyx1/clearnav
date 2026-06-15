import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Invoice, InvoiceLineItem, InvoiceSettings } from './types';
import InvoicePrintLayout, { PrintInvoiceData } from './InvoicePrintLayout';
import { buildInvoicePrintHTML } from './buildInvoicePrintHTML';
import {
  Loader2, Download, PenLine, CheckCircle, AlertCircle, X,
  Pen, Type,
} from 'lucide-react';

interface Props {
  token: string;
}

interface TokenInvoiceData {
  invoice: Invoice;
  line_items: InvoiceLineItem[];
  settings: InvoiceSettings;
  tenant_name: string;
}

export default function InvoicePublicView({ token }: Props) {
  const [data, setData] = useState<TokenInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase.rpc('get_invoice_by_token', { p_token: token });
      if (err) throw err;
      if (!result) { setError('Invoice not found.'); return; }
      setData(result as TokenInvoiceData);
      // Mark viewed (non-blocking)
      void supabase.rpc('mark_invoice_viewed', { p_token: token });
    } catch (e: any) {
      setError(e.message || 'Could not load invoice.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function downloadPDF() {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(
      buildInvoicePrintHTML(data.invoice, data.line_items, data.settings, data.tenant_name)
    );
    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 mb-1">Invoice Not Found</h2>
          <p className="text-slate-500 text-sm">{error || 'This invoice link may be invalid or expired.'}</p>
        </div>
      </div>
    );
  }

  const printData: PrintInvoiceData = {
    invoice: data.invoice,
    items: data.line_items,
    settings: data.settings,
    tenantName: data.tenant_name,
  };

  const isSigned = !!data.invoice.signed_at;
  const needsSignature = data.invoice.signature_required && !isSigned;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Invoice <span className="font-semibold text-slate-800">{data.invoice.invoice_number}</span>
          <span className="mx-2 text-slate-300">·</span>
          from <span className="font-medium text-slate-700">{data.settings?.business_name || data.tenant_name}</span>
        </div>
        <button
          onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        {/* Invoice */}
        <InvoicePrintLayout data={printData} forScreen />

        {/* Signing panel */}
        {needsSignature && (
          <SigningPanel
            token={token}
            invoiceNumber={data.invoice.invoice_number}
            recipientName={data.invoice.to_name}
            onSigned={() => load()}
          />
        )}

        {isSigned && (
          <div className="bg-white rounded-xl shadow p-6 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="text-lg font-bold text-slate-800">Invoice Signed</div>
            <p className="text-sm text-slate-500">
              Signed by <strong>{data.invoice.signed_by_name}</strong>
              {data.invoice.signed_at && (
                <> on {new Date(data.invoice.signed_at).toLocaleString()}</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Hidden print target */}
      <div className="hidden" ref={printRef}>
        <InvoicePrintLayout data={printData} forScreen={false} />
      </div>
    </div>
  );
}

// ─── Signing Panel ─────────────────────────────────────────────────────────────

interface SigningPanelProps {
  token: string;
  invoiceNumber: string;
  recipientName: string;
  onSigned: () => void;
}

function SigningPanel({ token, invoiceNumber, recipientName, onSigned }: SigningPanelProps) {
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [signerName, setSignerName] = useState(recipientName || '');
  const [typedSig, setTypedSig] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Canvas drawing
  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDrawingRef.current = true;
    lastPos.current = getPos(e);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDrawingRef.current = false;
    lastPos.current = null;
  }

  function clearCanvas() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
  }

  async function handleSubmit() {
    if (!signerName.trim()) { setSubmitError('Please enter your full name.'); return; }
    if (!agreed) { setSubmitError('Please confirm the checkbox to proceed.'); return; }

    let signatureData = '';
    if (tab === 'draw') {
      if (!hasDrawn) { setSubmitError('Please draw your signature.'); return; }
      signatureData = canvasRef.current!.toDataURL('image/png');
    } else {
      if (!typedSig.trim()) { setSubmitError('Please type your signature.'); return; }
      signatureData = typedSig.trim();
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data: result, error: err } = await supabase.rpc('sign_invoice_by_token', {
        p_token: token,
        p_signed_by_name: signerName.trim(),
        p_signed_by_choice: tab,
        p_signature_data: signatureData,
      });
      if (err) throw err;
      if (result && !result.success) throw new Error(result.error || 'Signing failed');
      onSigned();
    } catch (e: any) {
      setSubmitError(e.message || 'Failed to sign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = signerName.trim() && agreed && (tab === 'draw' ? hasDrawn : typedSig.trim());

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <PenLine className="w-5 h-5 text-slate-600" />
          Sign Invoice {invoiceNumber}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Please review the invoice above, then sign below to confirm acceptance.
        </p>
      </div>

      {/* Full name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
        <input
          value={signerName}
          onChange={e => setSignerName(e.target.value)}
          placeholder="Your full legal name"
          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
        />
      </div>

      {/* Signature tabs */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Signature *</label>
        <div className="flex gap-1 mb-3 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab('draw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'draw' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            Draw
          </button>
          <button
            onClick={() => setTab('type')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'type' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Type
          </button>
        </div>

        {tab === 'draw' ? (
          <div className="space-y-2">
            <div className="relative border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <canvas
                ref={canvasRef}
                width={700}
                height={150}
                className="w-full touch-none cursor-crosshair"
                style={{ height: '150px' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-slate-300 text-sm">Sign here using your mouse or finger</span>
                </div>
              )}
            </div>
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        ) : (
          <div>
            <input
              value={typedSig}
              onChange={e => setTypedSig(e.target.value)}
              placeholder="Type your name as your signature"
              className="w-full px-4 py-4 border-2 border-slate-200 rounded-lg text-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              style={{ fontFamily: 'cursive' }}
            />
            {typedSig && (
              <p className="text-xs text-slate-400 mt-1">Your typed signature will appear in cursive on the invoice.</p>
            )}
          </div>
        )}
      </div>

      {/* Agreement checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => setAgreed(v => !v)}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            agreed ? 'bg-slate-800 border-slate-800' : 'border-slate-300 group-hover:border-slate-500'
          }`}
        >
          {agreed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
        </div>
        <span className="text-sm text-slate-600">
          I confirm that I have reviewed invoice <strong>{invoiceNumber}</strong> and agree to its terms.
          I understand that this electronic signature is legally binding.
        </span>
      </label>

      {submitError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {submitError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />}
        {submitting ? 'Signing...' : 'Sign Invoice'}
      </button>
    </div>
  );
}
