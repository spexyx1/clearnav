import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

// Read before the client consumes and clears the URL hash from an email link.
const initialHash = new URLSearchParams(window.location.hash.slice(1));
export const initialAuthLink = {
  type: initialHash.get('type'),
  error: initialHash.get('error_description'),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
