import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { ProductCategory } from '@/domain/library';
import { pickShelf, useCurrentShelfId } from '@/lib/current-shelf';
import { requireSupabase } from '@/lib/supabase';
import { supabaseCatalog } from './catalog';
import { listCollections } from './collections';
import { listRecentEvents } from './events';
import { libraryCounts, listLibrary } from './library';
import { getProfile } from './profile';
import { getSubmission } from './submissions';

/** Central query keys so mutations can invalidate precisely. */
export const keys = {
  library: ['library'] as const,
  libraryCounts: ['library', 'counts'] as const,
  /** Under 'library' so every library write refreshes it too. */
  recentEvents: ['library', 'events'] as const,
  collections: ['collections'] as const,
  profile: ['profile'] as const,
  catalogSearch: (query: string, category: ProductCategory | null) => ['catalog', 'search', query, category] as const,
  catalogProduct: (id: string) => ['catalog', 'product', id] as const,
  submission: (personalProductId: string) => ['submission', personalProductId] as const,
};

export const useLibrary = () => useQuery({ queryKey: keys.library, queryFn: () => listLibrary(requireSupabase()) });
export const useLibraryCounts = () =>
  useQuery({ queryKey: keys.libraryCounts, queryFn: () => libraryCounts(requireSupabase()) });
export const useRecentEvents = () =>
  useQuery({ queryKey: keys.recentEvents, queryFn: () => listRecentEvents(requireSupabase(), 5) });
export const useCollections = () =>
  useQuery({ queryKey: keys.collections, queryFn: () => listCollections(requireSupabase()) });
export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: () => getProfile(requireSupabase()) });
/** Your shelves, oldest first, read from the collections list. */
export function useShelves() {
  const collections = useCollections();
  const shelves = useMemo(() => (collections.data ?? []).filter((c) => c.type === 'shelf'), [collections.data]);
  return { ...collections, shelves };
}

/** The shelf Home shows: the one picked on this device, else the first. */
export function useShelf() {
  const result = useShelves();
  const remembered = useCurrentShelfId();
  return { ...result, shelf: pickShelf(result.shelves, remembered) };
}

/** One library entry, read from the library list so every screen agrees on it. */
export function useLibraryItem(id: string | undefined) {
  const library = useLibrary();
  const entry = id ? library.data?.find((e) => e.id === id) : undefined;
  return { ...library, entry };
}

/** The latest time a product added manually was sent to the catalogue. */
export const useSubmission = (personalProductId: string) =>
  useQuery({
    queryKey: keys.submission(personalProductId),
    queryFn: () => getSubmission(requireSupabase(), personalProductId),
  });

/** Catalogue search. Keeps the previous results on screen while the next query loads. */
export const useCatalogSearch = (query: string, category: ProductCategory | null) =>
  useQuery({
    queryKey: keys.catalogSearch(query, category),
    queryFn: () => supabaseCatalog(requireSupabase()).search({ query, category: category ?? undefined }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

export const useCatalogProduct = (id: string | undefined) =>
  useQuery({
    queryKey: keys.catalogProduct(id ?? ''),
    queryFn: () => supabaseCatalog(requireSupabase()).getProduct(id ?? ''),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
