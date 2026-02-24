
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * >>> SUPABASE ANON KEY PRESERVED <<<
 */
const SUPABASE_ANON_KEY_FALLBACK = 'sb_publishable_Q2tAo9bOgcvVW6KUBDQBAA_WTMpLloP'; 

/**
 * Returns a singleton instance of the Supabase client.
 * Returns null if the configuration is missing.
 */
export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  // Project ID: jtrdxlqtxjffzqtansqj
  const supabaseUrl = 'https://jtrdxlqtxjffzqtansqj.supabase.co';
  
  // 1. Check environment
  const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  const envKey = (env as any).SUPABASE_ANON_KEY;
  
  // 2. Resolve the key
  const supabaseAnonKey = envKey && envKey !== 'undefined' ? envKey : SUPABASE_ANON_KEY_FALLBACK;

  if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  } catch (err) {
    console.error('Supabase Initialization Error:', err);
    return null;
  }
};
