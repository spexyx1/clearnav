import { supabase } from './supabase';

export interface NAVCalculationInput {
  fundId: string;
  shareClassId?: string;
  navDate: Date;
  totalAssets: number;
  totalLiabilities: number;
  totalShares: number;
  calculatedBy: string;
  notes?: string;
  details: NAVLineItem[];
}

export interface NAVLineItem {
  lineType: 'asset' | 'liability' | 'adjustment' | 'fee';
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
  fxRate?: number;
  source?: string;
}

export interface FeeCalculationParams {
  fundId: string;
  shareClassId: string;
  navDate: Date;
  currentNAV: number;
  previousNAV: number;
  totalShares: number;
}

export async function calculateNAV(input: NAVCalculationInput) {
  const netAssetValue = input.totalAssets - input.totalLiabilities;
  const navPerShare = input.totalShares > 0 ? netAssetValue / input.totalShares : 0;

  const fees = await calculateFees({
    fundId: input.fundId,
    shareClassId: input.shareClassId || '',
    navDate: input.navDate,
    currentNAV: netAssetValue,
    previousNAV: 0,
    totalShares: input.totalShares,
  });

  const { data: navCalc, error: navError } = await supabase
    .from('nav_calculations')
    .insert({
      fund_id: input.fundId,
      share_class_id: input.shareClassId || null,
      nav_date: input.navDate.toISOString().split('T')[0],
      version: 1,
      status: 'draft',
      total_assets: input.totalAssets,
      total_liabilities: input.totalLiabilities,
      net_asset_value: netAssetValue,
      total_shares: input.totalShares,
      nav_per_share: navPerShare,
      management_fees_accrued: fees.managementFee,
      performance_fees_accrued: fees.performanceFee,
      total_fees: fees.totalFees,
      calculated_by: input.calculatedBy,
      notes: input.notes,
      calculation_data: {
        fees,
        timestamp: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (navError) throw navError;

  const detailsToInsert = input.details.map((detail, index) => ({
    nav_calculation_id: navCalc.id,
    line_type: detail.lineType,
    category: detail.category,
    description: detail.description,
    quantity: detail.quantity,
    unit_price: detail.unitPrice,
    amount: detail.amount,
    currency: detail.currency,
    fx_rate: detail.fxRate || 1.0,
    base_currency_amount: detail.amount * (detail.fxRate || 1.0),
    source: detail.source || 'manual',
    sort_order: index,
  }));

  const { error: detailsError } = await supabase
    .from('nav_calculation_details')
    .insert(detailsToInsert);

  if (detailsError) throw detailsError;

  return { navCalculation: navCalc, details: detailsToInsert };
}

export async function calculateFees(params: FeeCalculationParams) {
  const { data: feeStructures } = await supabase
    .from('fee_structures')
    .select('*')
    .eq('fund_id', params.fundId)
    .eq('share_class_id', params.shareClassId)
    .eq('status', 'active')
    .lte('effective_from', params.navDate.toISOString().split('T')[0])
    .or(`effective_to.is.null,effective_to.gte.${params.navDate.toISOString().split('T')[0]}`);

  let managementFee = 0;
  let performanceFee = 0;

  if (feeStructures) {
    for (const fee of feeStructures) {
      if (fee.fee_type === 'management') {
        managementFee += calculateManagementFee(params.currentNAV, fee.rate_pct, fee.frequency);
      } else if (fee.fee_type === 'performance') {
        const gain = params.currentNAV - params.previousNAV;
        if (gain > 0) {
          const hurdle = params.previousNAV * (fee.hurdle_rate_pct / 100);
          const excessReturn = Math.max(0, gain - hurdle);
          performanceFee += excessReturn * (fee.rate_pct / 100);
        }
      }
    }
  }

  return {
    managementFee,
    performanceFee,
    totalFees: managementFee + performanceFee,
  };
}

function calculateManagementFee(nav: number, ratePct: number, frequency: string): number {
  const annualFee = nav * (ratePct / 100);

  switch (frequency) {
    case 'monthly':
      return annualFee / 12;
    case 'quarterly':
      return annualFee / 4;
    case 'annual':
      return annualFee;
    default:
      return annualFee / 12;
  }
}

export async function approveNAV(navCalculationId: string, approvedBy: string) {
  const { data: existingCalc } = await supabase
    .from('nav_calculations')
    .select('fund_id, share_class_id, nav_date')
    .eq('id', navCalculationId)
    .single();

  if (!existingCalc) throw new Error('NAV calculation not found');

  await supabase
    .from('nav_calculations')
    .update({ status: 'superseded' })
    .eq('fund_id', existingCalc.fund_id)
    .eq('nav_date', existingCalc.nav_date)
    .eq('status', 'approved')
    .match({ share_class_id: existingCalc.share_class_id });

  const { data, error } = await supabase
    .from('nav_calculations')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', navCalculationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestNAV(fundId: string, shareClassId?: string) {
  let query = supabase
    .from('nav_calculations')
    .select('*')
    .eq('fund_id', fundId)
    .eq('status', 'approved')
    .order('nav_date', { ascending: false })
    .order('version', { ascending: false })
    .limit(1);

  if (shareClassId) {
    query = query.eq('share_class_id', shareClassId);
  } else {
    query = query.is('share_class_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

export async function getNAVHistory(fundId: string, shareClassId?: string, startDate?: Date, endDate?: Date) {
  let query = supabase
    .from('nav_calculations')
    .select('*')
    .eq('fund_id', fundId)
    .eq('status', 'approved')
    .order('nav_date', { ascending: true });

  if (shareClassId) {
    query = query.eq('share_class_id', shareClassId);
  } else {
    query = query.is('share_class_id', null);
  }

  if (startDate) {
    query = query.gte('nav_date', startDate.toISOString().split('T')[0]);
  }

  if (endDate) {
    query = query.lte('nav_date', endDate.toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createTransaction(transaction: {
  fundId: string;
  capitalAccountId: string;
  transactionType: 'subscription' | 'redemption' | 'distribution' | 'transfer';
  transactionDate: Date;
  amount: number;
  shares?: number;
  pricePerShare?: number;
  currency?: string;
  description?: string;
  createdBy: string;
}) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      fund_id: transaction.fundId,
      capital_account_id: transaction.capitalAccountId,
      transaction_type: transaction.transactionType,
      transaction_date: transaction.transactionDate.toISOString().split('T')[0],
      settlement_date: transaction.transactionDate.toISOString().split('T')[0],
      amount: transaction.amount,
      shares: transaction.shares || 0,
      price_per_share: transaction.pricePerShare || 0,
      currency: transaction.currency || 'USD',
      status: 'pending',
      description: transaction.description,
      created_by: transaction.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  if (transaction.transactionType === 'subscription' && transaction.shares) {
    await updateCapitalAccount(transaction.capitalAccountId, {
      sharesOwned: transaction.shares,
      capitalContributed: transaction.amount,
    });
  } else if (transaction.transactionType === 'redemption' && transaction.shares) {
    await updateCapitalAccount(transaction.capitalAccountId, {
      sharesOwned: -transaction.shares,
      capitalReturned: transaction.amount,
    });
  } else if (transaction.transactionType === 'distribution') {
    await updateCapitalAccount(transaction.capitalAccountId, {
      capitalReturned: transaction.amount,
    });
  }

  return data;
}

async function updateCapitalAccount(accountId: string, updates: {
  sharesOwned?: number;
  capitalContributed?: number;
  capitalReturned?: number;
}) {
  const { data: account } = await supabase
    .from('capital_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (!account) throw new Error('Capital account not found');

  const newShares = account.shares_owned + (updates.sharesOwned || 0);
  const newContributed = account.capital_contributed + (updates.capitalContributed || 0);
  const newReturned = account.capital_returned + (updates.capitalReturned || 0);

  await supabase
    .from('capital_accounts')
    .update({
      shares_owned: newShares,
      capital_contributed: newContributed,
      capital_returned: newReturned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId);
}

export async function getExchangeRate(fromCurrency: string, toCurrency: string, date: Date) {
  if (fromCurrency === toCurrency) return 1.0;

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .lte('rate_date', date.toISOString().split('T')[0])
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.rate || 1.0;
}
