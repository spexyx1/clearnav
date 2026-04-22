import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  count?: number;
}

type AnyTable = string;

export async function query(
  table: AnyTable,
  options: QueryOptions = {}
): Promise<QueryResult<unknown[]>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any).from(table).select('*', { count: 'exact' });
    if (options.limit) q = q.limit(options.limit);
    if (options.offset) q = q.range(options.offset, options.offset + (options.limit || 100) - 1);
    if (options.orderBy) q = q.order(options.orderBy, { ascending: options.ascending ?? false });
    const { data, error, count } = await q;
    return { data, error: error ? new Error(error.message) : null, count: count ?? undefined };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function findById(table: AnyTable, id: string): Promise<QueryResult<unknown>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(table).select('*').eq('id', id).maybeSingle();
    return { data, error: error ? new Error(error.message) : null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function insert(table: AnyTable, record: unknown): Promise<QueryResult<unknown>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(table).insert(record).select().single();
    return { data, error: error ? new Error(error.message) : null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function updateById(table: AnyTable, id: string, updates: unknown): Promise<QueryResult<unknown>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(table).update(updates).eq('id', id).select().single();
    return { data, error: error ? new Error(error.message) : null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function deleteById(table: AnyTable, id: string): Promise<QueryResult<null>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from(table).delete().eq('id', id);
    return { data: null, error: error ? new Error(error.message) : null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function queryWhere(
  table: AnyTable,
  filters: Record<string, unknown>,
  options: QueryOptions = {}
): Promise<QueryResult<unknown[]>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any).from(table).select('*', { count: 'exact' });
    Object.entries(filters).forEach(([key, value]) => { q = q.eq(key, value); });
    if (options.limit) q = q.limit(options.limit);
    if (options.offset) q = q.range(options.offset, options.offset + (options.limit || 100) - 1);
    if (options.orderBy) q = q.order(options.orderBy, { ascending: options.ascending ?? false });
    const { data, error, count } = await q;
    return { data, error: error ? new Error(error.message) : null, count: count ?? undefined };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function count(table: AnyTable, filters?: Record<string, unknown>): Promise<QueryResult<number>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any).from(table).select('*', { count: 'exact', head: true });
    if (filters) Object.entries(filters).forEach(([key, value]) => { q = q.eq(key, value); });
    const { count: c, error } = await q;
    return { data: c, error: error ? new Error(error.message) : null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
