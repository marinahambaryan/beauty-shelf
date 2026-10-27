import { useQuery } from '@tanstack/react-query';

import { requireSupabase } from '@/lib/supabase';
import { listCollections } from './collections';
import { libraryCounts, listLibrary } from './library';
import { getProfile } from './profile';

/** Central query keys so mutations can invalidate precisely. */
export const keys = {
  library: ['library'] as const,
  libraryCounts: ['library', 'counts'] as const,
  collections: ['collections'] as const,
  profile: ['profile'] as const,
};

export const useLibrary = () => useQuery({ queryKey: keys.library, queryFn: () => listLibrary(requireSupabase()) });
export const useLibraryCounts = () =>
  useQuery({ queryKey: keys.libraryCounts, queryFn: () => libraryCounts(requireSupabase()) });
export const useCollections = () =>
  useQuery({ queryKey: keys.collections, queryFn: () => listCollections(requireSupabase()) });
export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: () => getProfile(requireSupabase()) });
