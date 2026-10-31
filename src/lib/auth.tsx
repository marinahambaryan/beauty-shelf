import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type AuthState = { session: Session | null; ready: boolean };

const AuthContext = createContext<AuthState>({ session: null, ready: false });

/** Restores the persisted session on launch and tracks sign-in / sign-out / refresh. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, ready: !supabase });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const client = supabase;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (active) setState({ session: data.session, ready: true });
        if (data.session) void dropIfAccountGone(client);
      })
      .catch(() => active && setState({ session: null, ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, ready: true });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

/**
 * A saved sign-in can outlive its account (deleted elsewhere, or a reset local database).
 * Ask the server once; if it says the user doesn't exist, sign out on this device so the
 * person signs in again instead of every save failing. Offline or other errors: keep it.
 */
async function dropIfAccountGone(client: NonNullable<typeof supabase>) {
  const { error } = await client.auth.getUser();
  if (!error) return;
  const status = 'status' in error ? (error.status as number | undefined) : undefined;
  const code = 'code' in error ? (error.code as string | undefined) : undefined;
  if (code === 'user_not_found' || status === 401 || status === 403) {
    await client.auth.signOut({ scope: 'local' }).catch(() => {});
  }
}

export const useAuth = () => useContext(AuthContext);

/** For screens inside the signed-in group, where a session is guaranteed by the router guard. */
export function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error('useUserId used outside the signed-in area');
  return session.user.id;
}
