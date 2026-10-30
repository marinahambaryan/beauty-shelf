import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ProductCategory } from '@/domain/library';
import { requireSupabase } from '@/lib/supabase';
import { supabaseCatalog } from './catalog';
import { listCollections } from './collections';
import { libraryCounts, listLibrary } from './library';
import { getProfile } from './profile';

/** Central query keys so mutations can invalidate precisely. */
export const keys = {
  library: ['library'] as const,
  libraryCounts: ['library', 'counts'] as const,
  collections: ['collections'] as const,
  profile: ['profile'] as const,
  catalogSearch: (query: string, category: ProductCategory | null) => ['catalog', 'search', query, category] as const,
  catalogProduct: (id: string) => ['catalog', 'product', id] as const,
};

export const useLibrary = () => useQuery({ queryKey: keys.library, queryFn: () => listLibrary(requireSupabase()) });
export const useLibraryCounts = () =>
  useQuery({ queryKey: keys.libraryCounts, queryFn: () => libraryCounts(requireSupabase()) });
export const useCollections = () =>
  useQuery({ queryKey: keys.collections, queryFn: () => listCollections(requireSupabase()) });
export const useProfile = () => useQuery({ queryKey: keys.profile, queryFn: () => getProfile(requireSupabase()) });
/** The curated shelf (at most one per person for now), read from the collections list. */
export function useShelf() {
  const collections = useCollections();
  return { ...collections, shelf: collections.data?.find((c) => c.type === 'shelf') ?? null };
}

/** One library entry, read from the library list so every screen agrees on it. */
export function useLibraryItem(id: string | undefined) {
  const library = useLibrary();
  const entry = id ? library.data?.find((e) => e.id === id) : undefined;
  return { ...library, entry };
}

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
