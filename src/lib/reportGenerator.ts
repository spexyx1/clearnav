import { supabase } from './supabase';

export interface ReportParams {
  reportType: string;
  reportName: string;
  periodStart: string;
  periodEnd: string;
  fundIds: string[];
  capitalAccountIds: string[];
  tenantId: string;
  generatedBy: string;
}

export interface GeneratedReportContent {
  type: string;
  generatedAt: string;
  period: { start: string; end: string };
  sections: ReportSection[];
  summary: Record<string, number | string>;
}

export interface ReportSection {
  title: string;
  type: 'metrics' | 'table' | 'text';
  data: any;
}

export async function generateReport(params: ReportParams): Promise<{ reportId: string | null; error: string | null }> {
  try {
    const content = await buildReportContent(params);
    if (!content) return { reportId: null, error: 'Failed to generate report data' };

    const { data, error } = await supabase
      .from('reports')
      .insert({
        tenant_id: params.tenantId,
        report_type: params.reportType,
        report_name: params.reportName,
        period_start: params.periodStart,
        period_end: params.periodEnd,
        fund_id: params.fundIds.length === 1 ? params.fundIds[0] : null,
        capital_account_id: params.capitalAccountIds.length === 1 ? params.capitalAccountIds[0] : null,
        generated_by: params.generatedBy,
        status: 'generated',
        report_content: content,
        parameters: {
          fundIds: params.fundIds,
          capitalAccountIds: params.capitalAccountIds,
        },
      })
      .select('id')
      .maybeSingle();

    if (error) return { reportId: null, error: error.message };
    return { reportId: data?.id || null, error: null };
  } catch (err: any) {
    return { reportId: null, error: err.message };
  }
}

async function buildReportContent(params: ReportParams): Promise<GeneratedReportContent | null> {
  const sections: ReportSection[] = [];
  const summary: Record<string, number | string> = {};

  switch (params.reportType) {
    case 'investor_statement':
      return await buildInvestorStatement(params);
    case 'performance_report':
      return await buildPerformanceReport(params);
    case 'fee_report':
      return await buildFeeReport(params);
    case 'transaction_report':
      return await buildTransactionReport(params);
    case 'capital_account_report':
      return await buildCapitalAccountReport(params);
    default:
      return await buildCustomReport(params);
  }
}

async function buildInvestorStatement(params: ReportParams): Promise<GeneratedReportContent> {
  const sections: ReportSection[] = [];
  const summary: Record<string, number | string> = {};

  const accountFilter = params.capitalAccountIds.length > 0
    ? params.capitalAccountIds
    : undefined;

  let accountsQuery = supabase
    .from('capital_accounts')
    .select('*, fund:funds(fund_code, fund_name, base_currency), investor:client_profiles!investor_id(full_name, email)')
    .eq('tenant_id', params.tenantId);

  if (accountFilter) {
    accountsQuery = accountsQuery.in('id', accountFilter);
  } else if (params.fundIds.length > 0) {
    accountsQuery = accountsQuery.in('fund_id', params.fundIds);
  }

  const { data: accounts } = await accountsQuery;

  const accountIds = (accounts || []).map(a => a.id);
  let transactions: any[] = [];

  if (accountIds.length > 0) {
    const { data: txns } = await supabase
      .from('capital_transactions')
      .select('*')
      .in('capital_account_id', accountIds)
      .gte('transaction_date', params.periodStart)
      .lte('transaction_date', params.periodEnd)
      .order('transaction_date');
    transactions = txns || [];
  }

  const contributions = transactions.filter(t => t.transaction_type === 'contribution').reduce((s, t) => s + (t.amount || 0), 0);
  const distributions = transactions.filter(t => t.transaction_type === 'distribution').reduce((s, t) => s + (t.amount || 0), 0);
  const redemptions = transactions.filter(t => t.transaction_type === 'redemption').reduce((s, t) => s + (t.amount || 0), 0);
  const totalShares = (accounts || []).reduce((s, a) => s + (a.shares_owned || 0), 0);

  sections.push({
    title: 'Account Summary',
    type: 'metrics',
    data: {
      totalAccounts: (accounts || []).length,
      totalShares,
      contributions,
      distributions,
      redemptions,
      netActivity: contributions - distributions - redemptions,
    },
  });

  sections.push({
    title: 'Transaction Activity',
    type: 'table',
    data: {
      headers: ['Date', 'Account', 'Type', 'Amount', 'Shares', 'Status'],
      rows: transactions.map(t => [
        t.transaction_date,
        (accounts || []).find(a => a.id === t.capital_account_id)?.account_number || '-',
        t.transaction_type,
        t.amount,
        t.shares || 0,
        t.status,
      ]),
    },
  });

  summary.totalAccounts = (accounts || []).length;
  summary.contributions = contributions;
  summary.distributions = distributions;
  summary.netActivity = contributions - distributions - redemptions;

  return {
    type: 'investor_statement',
    generatedAt: new Date().toISOString(),
    period: { start: params.periodStart, end: params.periodEnd },
    sections,
    summary,
  };
}

async function buildPerformanceReport(params: ReportParams): Promise<GeneratedReportContent> {
  const sections: ReportSection[] = [];
  const summary: Record<string, number | string> = {};

  let navQuery = supabase
    .from('nav_records')
    .select('*, fund:funds(fund_code, fund_name)')
    .eq('tenant_id', params.tenantId)
    .gte('calculation_date', params.periodStart)
    .lte('calculation_date', params.periodEnd)
    .order('calculation_date');

  if (params.fundIds.length > 0) {
    navQuery = navQuery.in('fund_id', params.fundIds);
  }

  const { data: navRecords } = await navQuery;

  const { data: txns } = await supabase
    .from('capital_transactions')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .gte('transaction_date', params.periodStart)
    .lte('transaction_date', params.periodEnd);

  const totalContributions = (txns || []).filter(t => t.transaction_type === 'contribution').reduce((s, t) => s + (t.amount || 0), 0);
  const totalDistributions = (txns || []).filter(t => t.transaction_type === 'distribution').reduce((s, t) => s + (t.amount || 0), 0);

  const latestNav = (navRecords || []).length > 0 ? navRecords![navRecords!.length - 1] : null;
  const firstNav = (navRecords || []).length > 0 ? navRecords![0] : null;
  const endingNAV = latestNav?.total_nav || 0;
  const beginningNAV = firstNav?.total_nav || 0;

  const dpi = totalContributions > 0 ? totalDistributions / totalContributions : 0;
  const rvpi = totalContributions > 0 ? endingNAV / totalContributions : 0;
  const tvpi = dpi + rvpi;
  const periodReturn = beginningNAV > 0 ? ((endingNAV - beginningNAV + totalDistributions - totalContributions) / beginningNAV * 100) : 0;

  sections.push({
    title: 'Performance Metrics',
    type: 'metrics',
    data: { beginningNAV, endingNAV, totalContributions, totalDistributions, dpi: dpi.toFixed(2), rvpi: rvpi.toFixed(2), tvpi: tvpi.toFixed(2), periodReturn: periodReturn.toFixed(2) + '%' },
  });

  sections.push({
    title: 'NAV History',
    type: 'table',
    data: {
      headers: ['Date', 'Fund', 'Total NAV', 'NAV/Share', 'Total Shares'],
      rows: (navRecords || []).map(n => [n.calculation_date, n.fund?.fund_code || '-', n.total_nav, n.nav_per_share, n.total_shares]),
    },
  });

  summary.tvpi = tvpi.toFixed(2);
  summary.dpi = dpi.toFixed(2);
  summary.periodReturn = periodReturn.toFixed(2) + '%';
  summary.endingNAV = endingNAV;

  return {
    type: 'performance_report',
    generatedAt: new Date().toISOString(),
    period: { start: params.periodStart, end: params.periodEnd },
    sections,
    summary,
  };
}

async function buildFeeReport(params: ReportParams): Promise<GeneratedReportContent> {
  const sections: ReportSection[] = [];

  let query = supabase
    .from('fee_calculations')
    .select('*, fund:funds(fund_code, fund_name)')
    .eq('tenant_id', params.tenantId)
    .gte('calculation_date', params.periodStart)
    .lte('calculation_date', params.periodEnd)
    .order('calculation_date');

  if (params.fundIds.length > 0) {
    query = query.in('fund_id', params.fundIds);
  }

  const { data: fees } = await query;

  const mgmtFees = (fees || []).filter(f => f.fee_type === 'management').reduce((s, f) => s + (f.fee_amount || 0), 0);
  const perfFees = (fees || []).filter(f => f.fee_type === 'performance').reduce((s, f) => s + (f.fee_amount || 0), 0);
  const totalFees = mgmtFees + perfFees;

  sections.push({
    title: 'Fee Summary',
    type: 'metrics',
    data: { managementFees: mgmtFees, performanceFees: perfFees, totalFees, feeCount: (fees || []).length },
  });

  sections.push({
    title: 'Fee Details',
    type: 'table',
    data: {
      headers: ['Date', 'Fund', 'Type', 'Amount', 'Status'],
      rows: (fees || []).map(f => [f.calculation_date, f.fund?.fund_code || '-', f.fee_type, f.fee_amount, f.status]),
    },
  });

  return {
    type: 'fee_report',
    generatedAt: new Date().toISOString(),
    period: { start: params.periodStart, end: params.periodEnd },
    sections,
    summary: { managementFees: mgmtFees, performanceFees: perfFees, totalFees },
  };
}

async function buildTransactionReport(params: ReportParams): Promise<GeneratedReportContent> {
  const sections: ReportSection[] = [];

  let query = supabase
    .from('capital_transactions')
    .select('*, capital_account:capital_accounts(account_number, investor:client_profiles!investor_id(full_name))')
    .eq('tenant_id', params.tenantId)
    .gte('transaction_date', params.periodStart)
    .lte('transaction_date', params.periodEnd)
    .order('transaction_date');

  if (params.fundIds.length > 0) {
    query = query.in('fund_id', params.fundIds);
  }

  const { data: txns } = await query;

  const byType = (txns || []).reduce((acc: Record<string, { count: number; total: number }>, t: any) => {
    const type = t.transaction_type || 'other';
    if (!acc[type]) acc[type] = { count: 0, total: 0 };
    acc[type].count++;
    acc[type].total += t.amount || 0;
    return acc;
  }, {});

  sections.push({
    title: 'Transaction Summary by Type',
    type: 'metrics',
    data: byType,
  });

  sections.push({
    title: 'All Transactions',
    type: 'table',
    data: {
      headers: ['Date', 'Investor', 'Account', 'Type', 'Amount', 'Shares', 'Status'],
      rows: (txns || []).map(t => [
        t.transaction_date,
        t.capital_account?.investor?.full_name || '-',
        t.capital_account?.account_number || '-',
        t.transaction_type,
        t.amount,
        t.shares || 0,
        t.status,
      ]),
    },
  });

  const totalAmount = (txns || []).reduce((s, t) => s + (t.amount || 0), 0);
  return {
    type: 'transaction_report',
    generatedAt: new Date().toISOString(),
    period: { start: params.periodStart, end: params.periodEnd },
    sections,
    summary: { totalTransactions: (txns || []).length, totalAmount },
  };
}

async function buildCapitalAccountReport(params: ReportParams): Promise<GeneratedReportContent> {
  const sections: ReportSection[] = [];

  let query = supabase
    .from('capital_accounts')
    .select('*, fund:funds(fund_code, fund_name), investor:client_profiles!investor_id(full_name, email)')
    .eq('tenant_id', params.tenantId);

  if (params.fundIds.length > 0) {
    query = query.in('fund_id', params.fundIds);
  }

  const { data: accounts } = await query;

  const totalShares = (accounts || []).reduce((s, a) => s + (a.shares_owned || 0), 0);
  const totalCommitment = (accounts || []).reduce((s, a) => s + (a.commitment_amount || 0), 0);

  sections.push({
    title: 'Capital Account Overview',
    type: 'metrics',
    data: { totalAccounts: (accounts || []).length, totalShares, totalCommitment },
  });

  sections.push({
    title: 'Account Details',
    type: 'table',
    data: {
      headers: ['Investor', 'Account #', 'Fund', 'Shares Owned', 'Commitment', 'Status'],
      rows: (accounts || []).map(a => [
        a.investor?.full_name || '-',
        a.account_number,
        a.fund?.fund_code || '-',
        a.shares_owned || 0,
        a.commitment_amount || 0,
        a.status,
      ]),
    },
  });

  return {
    type: 'capital_account_report',
    generatedAt: new Date().toISOString(),
    period: { start: params.periodStart, end: params.periodEnd },
    sections,
    summary: { totalAccounts: (accounts || []).length, totalShares, totalCommitment },
  };
}

async function buildCustomReport(params: ReportParams): Promise<GeneratedReportContent> {
  const sections: ReportSection[] = [];
  sections.push({
    title: 'Custom Report',
    type: 'text',
    data: { text: `Custom report generated for period ${params.periodStart} to ${params.periodEnd}.` },
  });

  return {
    type: 'custom',
    generatedAt: new Date().toISOString(),
    period: { start: params.periodStart, end: params.periodEnd },
    sections,
    summary: {},
  };
}
