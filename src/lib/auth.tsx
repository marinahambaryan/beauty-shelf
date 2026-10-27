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
    supabase.auth
      .getSession()
      .then(({ data }) => active && setState({ session: data.session, ready: true }))
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

export const useAuth = () => useContext(AuthContext);

/** For screens inside the signed-in group, where a session is guaranteed by the router guard. */
export function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error('useUserId used outside the signed-in area');
  return session.user.id;
}
