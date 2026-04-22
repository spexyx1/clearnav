'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// Named export for backward-compat with components that do `import { supabase }`
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (createClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
