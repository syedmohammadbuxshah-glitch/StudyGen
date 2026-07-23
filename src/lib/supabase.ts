import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const SUPABASE_URL = metaEnv.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '') || 'https://kjrqtvioflyrqomzeztm.supabase.co';
const SUPABASE_ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : '') || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_ANON_KEY) {
    console.warn("Supabase Anon Key is not set. Please provide SUPABASE_ANON_KEY in your environment variables or Settings panel.");
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return supabaseInstance;
}

export { SUPABASE_URL };
