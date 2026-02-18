/**
 * Data Access Layer - Abstraction over Supabase queries
 * Provides type-safe, reusable query methods
 */

import { supabase } from './supabase';
import { Database } from '../types/database';

type Tables = Database['public']['Tables'];

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

/**
 * Generic query builder for fetching records
 */
export async function query<T extends keyof Tables>(
  table: T,
  options: QueryOptions = {}
): Promise<QueryResult<Tables[T]['Row'][]>> {
  try {
    let query = supabase.from(table).select('*', { count: 'exact' });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }

    const { data, error, count } = await query;

    return {
      data: data as Tables[T]['Row'][] | null,
      error: error ? new Error(error.message) : null,
      count: count ?? undefined,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Fetch a single record by ID
 */
export async function findById<T extends keyof Tables>(
  table: T,
  id: string
): Promise<QueryResult<Tables[T]['Row']>> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    return {
      data: data as Tables[T]['Row'] | null,
      error: error ? new Error(error.message) : null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Insert a new record
 */
export async function insert<T extends keyof Tables>(
  table: T,
  record: Tables[T]['Insert']
): Promise<QueryResult<Tables[T]['Row']>> {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert(record)
      .select()
      .single();

    return {
      data: data as Tables[T]['Row'] | null,
      error: error ? new Error(error.message) : null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Update a record by ID
 */
export async function updateById<T extends keyof Tables>(
  table: T,
  id: string,
  updates: Partial<Tables[T]['Update']>
): Promise<QueryResult<Tables[T]['Row']>> {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return {
      data: data as Tables[T]['Row'] | null,
      error: error ? new Error(error.message) : null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Delete a record by ID
 */
export async function deleteById<T extends keyof Tables>(
  table: T,
  id: string
): Promise<QueryResult<null>> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    return {
      data: null,
      error: error ? new Error(error.message) : null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Query with custom filters
 */
export async function queryWhere<T extends keyof Tables>(
  table: T,
  filters: Record<string, unknown>,
  options: QueryOptions = {}
): Promise<QueryResult<Tables[T]['Row'][]>> {
  try {
    let query = supabase.from(table).select('*', { count: 'exact' });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }

    const { data, error, count } = await query;

    return {
      data: data as Tables[T]['Row'][] | null,
      error: error ? new Error(error.message) : null,
      count: count ?? undefined,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}

/**
 * Count records matching filters
 */
export async function count<T extends keyof Tables>(
  table: T,
  filters?: Record<string, unknown>
): Promise<QueryResult<number>> {
  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count, error } = await query;

    return {
      data: count,
      error: error ? new Error(error.message) : null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
}
