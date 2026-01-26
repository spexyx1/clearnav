import { useState, useEffect } from 'react';
import { FileText, Calendar, Send, Eye, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface Fund {
  id: string;
  fund_code: string;
  fund_name: string;
  base_currency: string;
}

interface InvestorStatement {
  id: string;
  statement_date: string;
  period_start: string;
  period_end: string;
  statement_type: string;
  beginning_balance: number;
  ending_balance: number;
  contributions: number;
  distributions: number;
  fees: number;
  return_amount: number;
  return_percent: number;
  shares_beginning: number;
  shares_ending: number;
  nav_per_share: number;
  status: string;
  capital_account: {
    account_number: string;
    investor: { full_name: string; email: string };
  };
}

export default function InvestorStatements() {
  const { currentTenant, user } = useAuth();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [statements, setStatements] = useState<InvestorStatement[]>([]);
  const [selectedFund, setSelectedFund] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  useEffect(() => {
    loadFunds();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedFund) {
      loadStatements();
    }
  }, [selectedFund, filterStatus]);

  const loadFunds = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const loadStatements = async () => {
    let query = supabase
      .from('investor_statements')
      .select(`
        *,
        capital_account:capital_accounts!capital_account_id(
          account_number,
          investor:client_profiles!investor_id(full_name, email)
        )
      `)
      .eq('fund_id', selectedFund)
      .order('statement_date', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query.limit(100);

    if (data) {
      setStatements(data as any);
    }
  };

  const generateStatements = async () => {
    if (!selectedPeriod) {
      alert('Please select a period');
      return;
    }

    setGenerating(true);

    const periodDate = new Date(selectedPeriod);
    const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);
    const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    const prevPeriodEnd = new Date(periodStart);
    prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);

    const { data: accounts } = await supabase
      .from('capital_accounts')
      .select('id, account_number, shares_owned')
      .eq('fund_id', selectedFund)
      .eq('status', 'active');

    if (!accounts || accounts.length === 0) {
      alert('No active capital accounts found');
      setGenerating(false);
      return;
    }

    const { data: latestNAV } = await supabase
      .from('nav_calculations')
      .select('nav_per_share')
      .eq('fund_id', selectedFund)
      .lte('calculation_date', periodEnd.toISOString().split('T')[0])
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: prevNAV } = await supabase
      .from('nav_calculations')
      .select('nav_per_share')
      .eq('fund_id', selectedFund)
      .lte('calculation_date', prevPeriodEnd.toISOString().split('T')[0])
      .order('calculation_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const navPerShare = latestNAV?.nav_per_share || 100;
    const prevNavPerShare = prevNAV?.nav_per_share || 100;

    for (const account of accounts) {
      const { data: transactions } = await supabase
        .from('capital_transactions')
        .select('transaction_type, amount, shares')
        .eq('capital_account_id', account.id)
        .gte('transaction_date', periodStart.toISOString().split('T')[0])
        .lte('transaction_date', periodEnd.toISOString().split('T')[0]);

      const contributions = transactions
        ?.filter(t => t.transaction_type === 'contribution')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const distributions = transactions
        ?.filter(t => t.transaction_type === 'distribution')
        .reduce((sum, t) => sum + t.amount, 0) || 0;

      const { data: fees } = await supabase
        .from('fee_transactions')
        .select('fee_amount')
        .eq('capital_account_id', account.id)
        .gte('period_start', periodStart.toISOString().split('T')[0])
        .lte('period_end', periodEnd.toISOString().split('T')[0]);

      const totalFees = fees?.reduce((sum, f) => sum + f.fee_amount, 0) || 0;

      const sharesBeginning = account.shares_owned -
        (transactions?.reduce((sum, t) => sum + (t.shares || 0), 0) || 0);

      const sharesEnding = account.shares_owned;

      const beginningBalance = sharesBeginning * prevNavPerShare;
      const endingBalance = sharesEnding * navPerShare;

      const returnAmount = endingBalance - beginningBalance - contributions + distributions + totalFees;
      const returnPercent = beginningBalance > 0 ? (returnAmount / beginningBalance) * 100 : 0;

      await supabase
        .from('investor_statements')
        .insert({
          tenant_id: currentTenant?.id,
          capital_account_id: account.id,
          fund_id: selectedFund,
          statement_date: periodEnd.toISOString().split('T')[0],
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          statement_type: 'monthly',
          beginning_balance: beginningBalance,
          ending_balance: endingBalance,
          contributions: contributions,
          distributions: distributions,
          fees: totalFees,
          return_amount: returnAmount,
          return_percent: returnPercent,
          shares_beginning: sharesBeginning,
          shares_ending: sharesEnding,
          nav_per_share: navPerShare,
          status: 'draft',
          created_by: user?.id,
        });
    }

    setGenerating(false);
    loadStatements();
    alert(`Generated ${accounts.length} statements`);
  };

  const finalizeStatement = async (statementId: string) => {
    const { error } = await supabase
      .from('investor_statements')
      .update({
        status: 'finalized',
        finalized_at: new Date().toISOString(),
      })
      .eq('id', statementId);

    if (!error) {
      loadStatements();
    }
  };

  const sendStatement = async (statementId: string) => {
    const { error } = await supabase
      .from('investor_statements')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', statementId);

    if (!error) {
      loadStatements();
      alert('Statement sent to investor');
    }
  };

  const calculateStats = () => {
    return statements.reduce((acc, stmt) => {
      if (stmt.status === 'draft') acc.draft++;
      if (stmt.status === 'finalized') acc.finalized++;
      if (stmt.status === 'sent') acc.sent++;
      return acc;
    }, { draft: 0, finalized: 0, sent: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  const stats = calculateStats();
  const selectedFundData = funds.find(f => f.id === selectedFund);

  const getDefaultPeriod = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return lastMonth.toISOString().slice(0, 7);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Investor Statements</h2>
          <p className="text-slate-400 mt-1">Generate and manage investor statements</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={selectedFund}
            onChange={(e) => setSelectedFund(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            {funds.map(fund => (
              <option key={fund.id} value={fund.id}>
                {fund.fund_code} - {fund.fund_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">Generate Statements</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Period
            </label>
            <input
              type="month"
              value={selectedPeriod}
              defaultValue={getDefaultPeriod()}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="pt-7">
            <button
              onClick={generateStatements}
              disabled={generating}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{generating ? 'Generating...' : 'Generate Statements'}</span>
            </button>
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-3">
          This will create statements for all active investors for the selected period
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Draft</span>
            <FileText className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.draft}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Finalized</span>
            <Calendar className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.finalized}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Sent</span>
            <Send className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.sent}</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Statements ({statements.length})</h3>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="finalized">Finalized</option>
            <option value="sent">Sent</option>
          </select>
        </div>

        {statements.length > 0 ? (
          <div className="space-y-3">
            {statements.map((stmt) => (
              <div
                key={stmt.id}
                className="bg-slate-800/80 rounded-lg p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="grid grid-cols-7 gap-4 items-start">
                  <div className="col-span-2">
                    <div className="font-medium text-white">{stmt.capital_account.investor.full_name}</div>
                    <div className="text-xs text-slate-400 mt-1">{stmt.capital_account.account_number}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Period</div>
                    <div className="text-white text-sm">
                      {new Date(stmt.period_end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Beginning</div>
                    <div className="text-white text-sm">
                      {selectedFundData?.base_currency} {(stmt.beginning_balance / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-slate-400">{stmt.shares_beginning.toFixed(2)} shares</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Ending</div>
                    <div className="text-white text-sm">
                      {selectedFundData?.base_currency} {(stmt.ending_balance / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-slate-400">{stmt.shares_ending.toFixed(2)} shares</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Return</div>
                    <div className={`text-sm font-semibold ${stmt.return_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stmt.return_percent >= 0 ? '+' : ''}{stmt.return_percent.toFixed(2)}%
                    </div>
                    <div className="text-xs text-slate-400">
                      {selectedFundData?.base_currency} {(stmt.return_amount / 1000).toFixed(1)}K
                    </div>
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      stmt.status === 'sent'
                        ? 'bg-green-500/20 text-green-400'
                        : stmt.status === 'finalized'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {stmt.status}
                    </span>
                    <div className="flex items-center space-x-2 mt-2">
                      {stmt.status === 'draft' && (
                        <button
                          onClick={() => finalizeStatement(stmt.id)}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          Finalize
                        </button>
                      )}
                      {stmt.status === 'finalized' && (
                        <button
                          onClick={() => sendStatement(stmt.id)}
                          className="text-xs text-green-400 hover:text-green-300 flex items-center space-x-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Send</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Contributions: </span>
                      <span className="text-green-400">
                        {selectedFundData?.base_currency} {(stmt.contributions / 1000).toFixed(1)}K
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Distributions: </span>
                      <span className="text-blue-400">
                        {selectedFundData?.base_currency} {(stmt.distributions / 1000).toFixed(1)}K
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Fees: </span>
                      <span className="text-yellow-400">
                        {selectedFundData?.base_currency} {(stmt.fees / 1000).toFixed(1)}K
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">NAV/Share: </span>
                      <span className="text-white">{stmt.nav_per_share.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No statements generated yet</p>
            <p className="text-slate-500 text-sm mt-2">Select a period and generate statements for all investors</p>
          </div>
        )}
      </div>
    </div>
  );
}
