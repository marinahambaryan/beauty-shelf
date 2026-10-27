/**
 * Public client configuration. Expo inlines EXPO_PUBLIC_* at build time, so these must be
 * referenced statically (no dynamic process.env[key] lookups).
 */
export type Env = { supabaseUrl: string; supabaseAnonKey: string };

export function readEnv(source: Record<string, string | undefined>): Env | { missing: string[] } {
  const supabaseUrl = source.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = source.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missing = [
    !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
    !supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter((x): x is string => Boolean(x));
  if (missing.length || !supabaseUrl || !supabaseAnonKey) return { missing };
  return { supabaseUrl, supabaseAnonKey };
}

export const env = readEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
