import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, Save, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { calculateNAV, NAVLineItem } from '../../lib/navCalculation';

interface NAVCalculatorProps {
  onClose: () => void;
  onSuccess: () => void;
  fundId?: string;
}

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface ShareClass {
  id: string;
  class_code: string;
  class_name: string;
  currency: string;
}

interface LineItem {
  id: string;
  lineType: 'asset' | 'liability' | 'adjustment' | 'fee';
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
}

const ASSET_CATEGORIES = [
  'Cash & Cash Equivalents',
  'Securities - Equities',
  'Securities - Fixed Income',
  'Securities - Derivatives',
  'Securities - Other',
  'Receivables',
  'Prepaid Expenses',
  'Other Assets',
];

const LIABILITY_CATEGORIES = [
  'Accounts Payable',
  'Accrued Expenses',
  'Management Fees Payable',
  'Performance Fees Payable',
  'Prime Broker Payable',
  'Short Positions',
  'Other Liabilities',
];

export default function NAVCalculator({ onClose, onSuccess, fundId: initialFundId }: NAVCalculatorProps) {
  const { user, currentTenant } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [selectedFund, setSelectedFund] = useState(initialFundId || '');
  const [selectedShareClass, setSelectedShareClass] = useState('');
  const [navDate, setNavDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalShares, setTotalShares] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadShareClasses();
      loadTotalShares();
    }
  }, [selectedFund, selectedShareClass]);

  const loadFunds = async () => {
    const { data } = await supabase
      .from('funds')
      .select('id, fund_code, fund_name, base_currency')
      .eq('tenant_id', currentTenant?.id)
      .eq('status', 'active')
      .order('fund_name');

    if (data) {
      setFunds(data);
      if (data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].id);
      }
    }
  };

  const loadShareClasses = async () => {
    const { data } = await supabase
      .from('share_classes')
      .select('id, class_code, class_name, currency')
      .eq('fund_id', selectedFund)
      .eq('status', 'active')
      .order('class_code');

    if (data) {
      setShareClasses(data);
    }
  };

  const loadTotalShares = async () => {
    const { data } = await supabase
      .from('capital_accounts')
      .select('shares_owned')
      .eq('fund_id', selectedFund)
      .eq('status', 'active');

    if (data) {
      const total = data.reduce((sum, account) => sum + (account.shares_owned || 0), 0);
      setTotalShares(total);
    }
  };

  const addLineItem = (type: 'asset' | 'liability') => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      lineType: type,
      category: type === 'asset' ? ASSET_CATEGORIES[0] : LIABILITY_CATEGORIES[0],
      description: '',
      quantity: 0,
      unitPrice: 0,
      amount: 0,
      currency: funds.find(f => f.id === selectedFund)?.base_currency || 'USD',
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const assets = lineItems
      .filter(item => item.lineType === 'asset')
      .reduce((sum, item) => sum + item.amount, 0);

    const liabilities = lineItems
      .filter(item => item.lineType === 'liability')
      .reduce((sum, item) => sum + item.amount, 0);

    const nav = assets - liabilities;
    const navPerShare = totalShares > 0 ? nav / totalShares : 0;

    return { assets, liabilities, nav, navPerShare };
  };

  const handleCalculate = async (status: 'draft' | 'pending_approval') => {
    if (!selectedFund || lineItems.length === 0) return;

    setCalculating(true);

    try {
      const totals = calculateTotals();
      const navLineItems: NAVLineItem[] = lineItems.map(item => ({
        lineType: item.lineType,
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        currency: item.currency,
        source: 'manual',
      }));

      await calculateNAV({
        fundId: selectedFund,
        shareClassId: selectedShareClass || undefined,
        navDate: new Date(navDate),
        totalAssets: totals.assets,
        totalLiabilities: totals.liabilities,
        totalShares,
        calculatedBy: user?.id || '',
        notes,
        details: navLineItems,
      });

      if (status === 'pending_approval') {
        const { data: calculation } = await supabase
          .from('nav_calculations')
          .select('id')
          .eq('fund_id', selectedFund)
          .eq('nav_date', navDate)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (calculation) {
          await supabase
            .from('nav_calculations')
            .update({ status: 'pending_approval' })
            .eq('id', calculation.id);
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error calculating NAV:', error);
      alert('Error calculating NAV. Please check your entries and try again.');
    } finally {
      setCalculating(false);
    }
  };

  const totals = calculateTotals();
  const selectedFundData = funds.find(f => f.id === selectedFund);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center">
              <Calculator className="w-6 h-6 mr-3 text-cyan-500" />
              NAV Calculator
            </h3>
            <p className="text-slate-400 mt-1">Calculate Net Asset Value for your fund</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fund
              </label>
              <select
                value={selectedFund}
                onChange={(e) => setSelectedFund(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
              >
                {funds.map(fund => (
                  <option key={fund.id} value={fund.id}>
                    {fund.fund_code} - {fund.fund_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Share Class (Optional)
              </label>
              <select
                value={selectedShareClass}
                onChange={(e) => setSelectedShareClass(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">All Classes (Fund Level)</option>
                {shareClasses.map(sc => (
                  <option key={sc.id} value={sc.id}>
                    Class {sc.class_code} - {sc.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                NAV Date
              </label>
              <input
                type="date"
                value={navDate}
                onChange={(e) => setNavDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div>
              <div className="text-sm text-slate-400">Total Shares Outstanding</div>
              <div className="text-2xl font-bold text-white mt-1">
                {totalShares.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Currency</div>
              <div className="text-2xl font-bold text-white mt-1">
                {selectedFundData?.base_currency || 'USD'}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400">Line Items</div>
              <div className="text-2xl font-bold text-white mt-1">
                {lineItems.length}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-white">Assets</h4>
              <button
                onClick={() => addLineItem('asset')}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Asset</span>
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.filter(item => item.lineType === 'asset').map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="col-span-3">
                    <select
                      value={item.category}
                      onChange={(e) => updateLineItem(item.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    >
                      {ASSET_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity || ''}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={item.amount.toLocaleString()}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm font-mono"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-white">Liabilities</h4>
              <button
                onClick={() => addLineItem('liability')}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Liability</span>
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.filter(item => item.lineType === 'liability').map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="col-span-3">
                    <select
                      value={item.category}
                      onChange={(e) => updateLineItem(item.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    >
                      {LIABILITY_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity || ''}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={item.amount.toLocaleString()}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm font-mono"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this NAV calculation..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="border-t border-slate-700 p-6 bg-slate-800/50">
          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-sm text-slate-400">Total Assets</div>
              <div className="text-2xl font-bold text-green-400 mt-1">
                {selectedFundData?.base_currency} {totals.assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">Total Liabilities</div>
              <div className="text-2xl font-bold text-red-400 mt-1">
                {selectedFundData?.base_currency} {totals.liabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">Net Asset Value</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">
                {selectedFundData?.base_currency} {totals.nav.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-400">NAV per Share</div>
              <div className="text-3xl font-bold text-white mt-1">
                {selectedFundData?.base_currency} {totals.navPerShare.toFixed(4)}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCalculate('draft')}
              disabled={calculating || lineItems.length === 0}
              className="px-6 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>Save as Draft</span>
            </button>
            <button
              onClick={() => handleCalculate('pending_approval')}
              disabled={calculating || lineItems.length === 0}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Submit for Approval</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
