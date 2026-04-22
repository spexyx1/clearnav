import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xielqbwkiibeaajljamo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpZWxxYndraWliZWFhamxqYW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTg2MDcsImV4cCI6MjA4NTE5NDYwN30.YpEw8siBfrbtdpMzLsl4RsinBd_2QayVTulWgYna1Gg';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
