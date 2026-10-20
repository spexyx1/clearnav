import { supabase } from './supabase';
import { parseFlexXml } from './flexStatement';
import { buildMonthlyBatches, saveStatementBatches, storeSourceFile } from './statementImport';
import { describeResult, runFundAutomation } from './fundAutomation';

export async function callFlex(payload: Record<string, unknown>) {
  const { data: s } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ibkr-flex-sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s.session?.access_token ?? ''}`, 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null) as { error?: string; xml?: string; ok?: boolean } | null;
  if (!res.ok || !body || body.error) throw new Error(body?.error ?? 'Interactive Brokers could not be reached. Please try again.');
  return body;
}

export async function hasIbkrConnection(fundId: string) {
  const { data, error } = await supabase.from('ibkr_flex_connections').select('fund_id').eq('fund_id', fundId).maybeSingle();
  if (error) throw new Error('Could not check the Interactive Brokers connection. Please try again.');
  return !!data;
}

export async function pullFromIbkr(tenantId: string, fundId: string, userId: string) {
  const { xml } = await callFlex({ action: 'fetch', fund_id: fundId });
  if (!xml) throw new Error('Interactive Brokers returned an empty report.');
  const statement = parseFlexXml(xml);
  const { data: maps, error: mErr } = await supabase.from('fund_broker_accounts').select('account_id, share_class_id').eq('fund_id', fundId);
  if (mErr) throw new Error('Could not load which accounts belong to which class.');
  const accountToClass = Object.fromEntries((maps ?? []).filter((m) => statement.accounts.includes(m.account_id)).map((m) => [m.account_id, m.share_class_id]));
  if (!Object.keys(accountToClass).length) throw new Error('None of the accounts in the Interactive Brokers report are matched to a share class yet. Upload one statement by hand first so the accounts are matched.');
  const batches = buildMonthlyBatches(statement, accountToClass);
  const filename = `IBKR automatic update ${new Date().toISOString().slice(0, 10)}.xml`;
  const sourcePath = await storeSourceFile(tenantId, new Blob([xml], { type: 'application/xml' }), filename);
  const saved = await saveStatementBatches({ tenantId, fundId, userId, filename, sourcePath, statement, batches, accountToClass });
  const automation = describeResult(await runFundAutomation(tenantId, fundId, userId));
  const warnings = statement.warnings.length ? ` ${statement.warnings.join(' ')}` : '';
  return `Pulled the latest figures from Interactive Brokers (${saved} month${saved === 1 ? '' : 's'} updated). ${automation}${warnings}`.trim();
}
