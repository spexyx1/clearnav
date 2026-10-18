import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export type TenantState = 'loading' | 'ready' | 'missing' | 'error';

const TIMEOUT_MS = 12000;

export function useTenantId() {
  const { currentTenant, user } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(currentTenant?.id ?? null);
  const [state, setState] = useState<TenantState>(currentTenant?.id ? 'ready' : 'loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (currentTenant?.id) { setTenantId(currentTenant.id); setState('ready'); return; }
    let cancelled = false;
    setState('loading');
    const timer = setTimeout(() => { if (!cancelled) { cancelled = true; setState('error'); } }, TIMEOUT_MS);
    (async () => {
      const uid = user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      if (cancelled) return;
      if (!uid) { cancelled = true; clearTimeout(timer); setState('missing'); return; }
      const { data, error } = await supabase.from('tenant_users').select('tenant_id').eq('user_id', uid).limit(1).maybeSingle();
      if (cancelled) return;
      cancelled = true;
      clearTimeout(timer);
      if (error) { console.error('tenant lookup failed', error); setState('error'); return; }
      if (!data?.tenant_id) { setState('missing'); return; }
      setTenantId(data.tenant_id);
      setState('ready');
    })();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentTenant?.id, user?.id, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const tenant = useMemo(() => (!tenantId ? null : currentTenant?.id === tenantId ? currentTenant : ({ id: tenantId } as NonNullable<typeof currentTenant>)), [tenantId, currentTenant]);
  return { tenantId, tenant, state, retry };
}
