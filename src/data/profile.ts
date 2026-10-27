import type { Supabase } from '@/lib/supabase';

export type Profile = { id: string; displayName: string | null };

export async function getProfile(db: Supabase): Promise<Profile | null> {
  const { data, error } = await db.from('profiles').select('id, display_name').maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, displayName: data.display_name } : null;
}

export async function updateDisplayName(db: Supabase, userId: string, displayName: string | null) {
  const { error } = await db.from('profiles').update({ display_name: displayName }).eq('id', userId);
  if (error) throw error;
}

/**
 * Account deletion runs in the `delete-account` Edge Function: it needs the service role
 * to remove storage objects and the auth user, which must never ship in the app.
 */
export async function deleteAccount(db: Supabase) {
  const { error } = await db.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
}
