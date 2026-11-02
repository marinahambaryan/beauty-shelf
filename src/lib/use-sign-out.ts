import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireSupabase } from './supabase';

/**
 * Log out on this device. Local scope always works, even offline or when the saved
 * session is stale, so the person is never stuck signed in. Cached data is dropped.
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.clear(),
  });
}
