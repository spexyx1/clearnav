import { useState, useEffect } from 'react';
import { Upload, Download, Eye, Trash2, Check, AlertCircle, FileText, ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface TradeUploadRecord {
  id: string;
  tenant_id: string;
  fund_id: string | null;
  upload_month: number;
  upload_year: number;
  status: string;
  filename: string;
  uploaded_by: string;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  item_count?: number;
}

interface TradeItem {
  id?: string;
  upload_id?: string;
  trade_date: string;
  instrument: string;
  direction: string;
  quantity: number;
  price: number;
  fees: number;
  total_value: number;
  notes: string;
  sort_order: number;
}

const CSV_COLUMNS = ['date', 'instrument', 'direction', 'quantity', 'price', 'fees', 'notes'];

const TEMPLATE_CSV = `date,instrument,direction,quantity,price,fees,notes
2024-01-15,AAPL,buy,100,185.50,9.99,Initial position
2024-01-16,MSFT,sell,50,390.25,9.99,Partial exit
2024-01-20,GOOGL,buy,25,142.75,4.99,Adding to position`;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function statusBadge(status: string) {
  const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
  switch (status) {
    case 'confirmed':
      return <span className={`${base} bg-green-500/20 text-green-400`}>Confirmed</span>;
    case 'draft':
      return <span className={`${base} bg-yellow-500/20 text-yellow-400`}>Draft</span>;
    default:
      return <span className={`${base} bg-slate-500/20 text-slate-400`}>{status}</span>;
  }
}

export default function TradeUpload() {
  const { currentTenant, user } = useAuth();

  const [view, setView] = useState<'history' | 'upload' | 'detail'>('history');
  const [uploads, setUploads] = useState<TradeUploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Upload form state
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [parsedTrades, setParsedTrades] = useState<TradeItem[]>([]);
  const [parseError, setParseError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail view state
  const [selectedUpload, setSelectedUpload] = useState<TradeUploadRecord | null>(null);
  const [detailItems, setDetailItems] = useState<TradeItem[]>([]);

  useEffect(() => {
    if (currentTenant) loadUploads();
  }, [currentTenant]);

  async function loadUploads() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('trade_uploads')
      .select('*, trade_upload_items(count)')
      .eq('tenant_id', currentTenant!.id)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setUploads(
        (data || []).map((u: any) => ({
          ...u,
          item_count: u.trade_upload_items?.[0]?.count ?? 0,
        }))
      );
    }
    setLoading(false);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trade_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function parseCSV() {
    if (!file) return;
    setParseError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          setParseError('CSV must have a header row and at least one data row.');
          return;
        }

        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const requiredCols = ['date', 'instrument', 'direction', 'quantity', 'price'];
        const missing = requiredCols.filter((c) => !header.includes(c));
        if (missing.length) {
          setParseError(`Missing required columns: ${missing.join(', ')}`);
          return;
        }

        const idx = (col: string) => header.indexOf(col);
        const items: TradeItem[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim());
          const qty = parseFloat(cols[idx('quantity')] || '0');
          const price = parseFloat(cols[idx('price')] || '0');
          const fees = parseFloat(cols[idx('fees')] || '0');
          const direction = (cols[idx('direction')] || '').toLowerCase();

          if (!cols[idx('date')] || !cols[idx('instrument')] || !direction) continue;

          items.push({
            trade_date: cols[idx('date')],
            instrument: cols[idx('instrument')],
            direction,
            quantity: qty,
            price,
            fees,
            total_value: qty * price + (direction === 'buy' ? fees : -fees),
            notes: cols[idx('notes')] || '',
            sort_order: i,
          });
        }

        if (!items.length) {
          setParseError('No valid trade rows found.');
          return;
        }
        setParsedTrades(items);
      } catch {
        setParseError('Failed to parse CSV. Check the file format.');
      }
    };
    reader.readAsText(file);
  }

  function updateTrade(index: number, field: keyof TradeItem, value: string | number) {
    setParsedTrades((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === 'quantity' || field === 'price' || field === 'fees' || field === 'direction') {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const fees = Number(item.fees) || 0;
        item.total_value = qty * price + (item.direction === 'buy' ? fees : -fees);
      }
      next[index] = item;
      return next;
    });
  }

  function removeTrade(index: number) {
    setParsedTrades((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmUpload() {
    if (!currentTenant || !user || !parsedTrades.length) return;
    setSubmitting(true);
    setError('');

    try {
      // 1. Create upload record as draft
      const { data: upload, error: uploadErr } = await supabase
        .from('trade_uploads')
        .insert({
          tenant_id: currentTenant.id,
          upload_month: month,
          upload_year: year,
          status: 'draft',
          filename: file?.name || 'manual_entry.csv',
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (uploadErr || !upload) throw uploadErr || new Error('Failed to create upload');

      // 2. Insert trade items
      const items = parsedTrades.map((t, i) => ({
        upload_id: upload.id,
        trade_date: t.trade_date,
        instrument: t.instrument,
        direction: t.direction,
        quantity: t.quantity,
        price: t.price,
        fees: t.fees,
        total_value: t.total_value,
        notes: t.notes,
        sort_order: i + 1,
      }));

      const { error: itemsErr } = await supabase.from('trade_upload_items').insert(items);
      if (itemsErr) throw itemsErr;

      // 3. Mark confirmed
      const { error: confirmErr } = await supabase
        .from('trade_uploads')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', upload.id);

      if (confirmErr) throw confirmErr;

      // Reset and go back
      setParsedTrades([]);
      setFile(null);
      setView('history');
      await loadUploads();
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function viewUpload(upload: TradeUploadRecord) {
    setSelectedUpload(upload);
    setView('detail');
    const { data } = await supabase
      .from('trade_upload_items')
      .select('*')
      .eq('upload_id', upload.id)
      .order('sort_order');
    setDetailItems(data || []);
  }

  // ── History View ──────────────────────────────────────────────────────
  if (view === 'history') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white mb-6">Trade Uploads</h2>
          <div className="flex gap-3">
            <button onClick={downloadTemplate} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm">
              <Download className="w-4 h-4" /> CSV Template
            </button>
            <button onClick={() => { setParsedTrades([]); setFile(null); setParseError(''); setView('upload'); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
              <Plus className="w-4 h-4" /> New Upload
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading uploads…</div>
          ) : uploads.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p>No trade uploads yet. Click "New Upload" to get started.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Period</th>
                  <th className="px-6 py-3">File</th>
                  <th className="px-6 py-3">Trades</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Uploaded</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {uploads.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30">
                    <td className="px-6 py-4 text-sm text-white font-medium">
                      {MONTHS[u.upload_month - 1]} {u.upload_year}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{u.filename}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{u.item_count}</td>
                    <td className="px-6 py-4">{statusBadge(u.status)}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => viewUpload(u)} className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ── Detail View ───────────────────────────────────────────────────────
  if (view === 'detail' && selectedUpload) {
    return (
      <div className="space-y-6">
        <button onClick={() => setView('history')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to uploads
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {MONTHS[selectedUpload.upload_month - 1]} {selectedUpload.upload_year}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {selectedUpload.filename} · {statusBadge(selectedUpload.status)}
            </p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Instrument</th>
                <th className="px-6 py-3">Direction</th>
                <th className="px-6 py-3 text-right">Qty</th>
                <th className="px-6 py-3 text-right">Price</th>
                <th className="px-6 py-3 text-right">Fees</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {detailItems.map((item, i) => (
                <tr key={item.id || i} className="hover:bg-slate-800/30">
                  <td className="px-6 py-3 text-sm text-slate-500">{i + 1}</td>
                  <td className="px-6 py-3 text-sm text-slate-300">{item.trade_date}</td>
                  <td className="px-6 py-3 text-sm text-white font-medium">{item.instrument}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium ${item.direction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                      {item.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-300 text-right">{item.quantity.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm text-slate-300 text-right">{item.price.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-slate-300 text-right">{item.fees.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-white text-right font-medium">{item.total_value.toFixed(2)}</td>
                  <td className="px-6 py-3 text-sm text-slate-400">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {detailItems.length === 0 && (
            <div className="p-8 text-center text-slate-400">No trade items found.</div>
          )}
        </div>
      </div>
    );
  }

  // ── Upload View ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <button onClick={() => setView('history')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to uploads
      </button>

      <h2 className="text-xl font-semibold text-white mb-6">Upload Monthly Trades</h2>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Period & file selector */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Month</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setParsedTrades([]); setParseError(''); }}
              className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-700 file:text-white file:text-sm file:cursor-pointer hover:file:bg-slate-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={parseCSV}
            disabled={!file}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm"
          >
            <Upload className="w-4 h-4" /> Parse CSV
          </button>
          <button onClick={downloadTemplate} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
            <Download className="w-4 h-4" /> Download template
          </button>
        </div>

        {parseError && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
          </div>
        )}
      </div>

      {/* Parsed preview table */}
      {parsedTrades.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <p className="text-sm text-slate-300">
              <span className="text-white font-medium">{parsedTrades.length}</span> trades parsed — review and edit before confirming.
            </p>
            <button
              onClick={confirmUpload}
              disabled={submitting}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
            >
              <Check className="w-4 h-4" /> {submitting ? 'Saving…' : 'Confirm Upload'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Instrument</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Fees</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {parsedTrades.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2">
                      <input type="date" value={t.trade_date} onChange={(e) => updateTrade(i, 'trade_date', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white w-36" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={t.instrument} onChange={(e) => updateTrade(i, 'instrument', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white w-24" />
                    </td>
                    <td className="px-4 py-2">
                      <select value={t.direction} onChange={(e) => updateTrade(i, 'direction', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white">
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" value={t.quantity} onChange={(e) => updateTrade(i, 'quantity', parseFloat(e.target.value) || 0)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white w-20 text-right" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={t.price} onChange={(e) => updateTrade(i, 'price', parseFloat(e.target.value) || 0)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white w-24 text-right" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" step="0.01" value={t.fees} onChange={(e) => updateTrade(i, 'fees', parseFloat(e.target.value) || 0)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white w-20 text-right" />
                    </td>
                    <td className="px-4 py-2 text-sm text-white text-right font-medium">
                      {t.total_value.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <input value={t.notes} onChange={(e) => updateTrade(i, 'notes', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white w-32" />
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeTrade(i)} className="text-red-400 hover:text-red-300 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
