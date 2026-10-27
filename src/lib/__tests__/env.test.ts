import { readEnv } from '../env';

describe('readEnv', () => {
  it('reports every missing key', () => {
    expect(readEnv({})).toEqual({ missing: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] });
    expect(readEnv({ EXPO_PUBLIC_SUPABASE_URL: ' ', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toEqual({
      missing: ['EXPO_PUBLIC_SUPABASE_URL'],
    });
  });
  it('returns trimmed values when complete', () => {
    expect(readEnv({ EXPO_PUBLIC_SUPABASE_URL: ' http://x ', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'k' })).toEqual({
      supabaseUrl: 'http://x',
      supabaseAnonKey: 'k',
    });
  });
});
