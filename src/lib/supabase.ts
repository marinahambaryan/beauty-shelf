import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/data/database.types';
import { env } from './env';

export type Supabase = SupabaseClient<Database>;

/** null when the app is not configured — the root layout shows a setup screen instead of crashing. */
export const supabase: Supabase | null =
  'missing' in env
    ? null
    : createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });

export function requireSupabase(): Supabase {
  if (!supabase) throw new Error('Supabase is not configured. Copy .env.example to .env.local.');
  return supabase;
}

// Refresh tokens only while the app is foregrounded (recommended for React Native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
