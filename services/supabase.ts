import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * >>> SUPABASE ANON KEY PRESERVED <<<
 * Publishable key, safe for the browser. Only used when nothing is configured.
 */
const SUPABASE_URL_FALLBACK = 'https://jtrdxlqtxjffzqtansqj.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK = 'sb_publishable_Q2tAo9bOgcvVW6KUBDQBAA_WTMpLloP';

/**
 * Reads configuration from the bundler first, then from Node.
 *
 * Vite only inlines variables prefixed with VITE_, and `process` does not exist in
 * the browser at all, so reading process.env here used to always fall through to
 * the hardcoded values with no warning.
 */
const readConfig = (name: string): string | undefined => {
  const viteEnv = (import.meta as any)?.env as Record<string, string> | undefined;
  const fromVite = viteEnv?.[`VITE_${name}`] ?? viteEnv?.[name];
  if (fromVite && fromVite !== 'undefined') return fromVite;

  const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
  const fromNode = nodeEnv?.[name];
  if (fromNode && fromNode !== 'undefined') return fromNode;

  return undefined;
};

/**
 * Returns a singleton instance of the Supabase client.
 * Returns null if the configuration is missing.
 */
export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = readConfig('SUPABASE_URL') || SUPABASE_URL_FALLBACK;
  const supabaseAnonKey = readConfig('SUPABASE_ANON_KEY') || SUPABASE_ANON_KEY_FALLBACK;

  if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
    console.error('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
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
