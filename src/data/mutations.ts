import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ItemPatch, OwnershipStatus } from '@/domain/library';
import type { PersonalProductInput } from '@/domain/validation';
import { useUserId } from '@/lib/auth';
import { requireSupabase } from '@/lib/supabase';
import {
  addManually,
  addVariantToLibrary,
  deleteLibraryItem,
  setPhoto,
  updateLibraryItem,
  type LibraryEntry,
} from './library';
import { saveShelfLayout, type ShelfPlacement } from './collections';
import { removePhotos } from './photos';
import { keys } from './queries';

/** Anything that changes the library refreshes the lists, counts and shelf that show it. */
function useRefreshLibrary() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.library }),
      queryClient.invalidateQueries({ queryKey: keys.collections }),
    ]);
}

export function useAddVariant() {
  const refresh = useRefreshLibrary();
  return useMutation({
    mutationFn: (input: { variantId: string; status: OwnershipStatus; notes: string | null }) =>
      addVariantToLibrary(requireSupabase(), input),
    onSuccess: () => refresh(),
  });
}

export function useAddManually() {
  const userId = useUserId();
  const refresh = useRefreshLibrary();
  return useMutation({
    mutationFn: (input: PersonalProductInput & { photoUri: string | null }) =>
      addManually(requireSupabase(), userId, input),
    onSuccess: () => refresh(),
  });
}

export function useUpdateItem() {
  const refresh = useRefreshLibrary();
  return useMutation({
    mutationFn: (input: { id: string; version: number; patch: ItemPatch }) => updateLibraryItem(requireSupabase(), input),
    // Not on error: a stale save keeps the person's edits on screen until they choose Reload.
    onSuccess: () => refresh(),
  });
}

export function useSetPhoto() {
  const userId = useUserId();
  const refresh = useRefreshLibrary();
  return useMutation({
    mutationFn: ({ entry, uri }: { entry: LibraryEntry; uri: string | null }) =>
      setPhoto(requireSupabase(), userId, entry, uri),
    onSettled: () => refresh(),
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const refresh = useRefreshLibrary();
  return useMutation({
    mutationFn: async (entry: LibraryEntry) => {
      const db = requireSupabase();
      await deleteLibraryItem(db, entry.id);
      // A manually added product is deleted with its only entry, so its photo goes too.
      await removePhotos(db, [entry.photoPath, entry.source === 'personal' ? entry.imagePath : null]);
    },
    onSuccess: (_data, entry) => {
      queryClient.setQueryData<LibraryEntry[]>(keys.library, (old) => old?.filter((e) => e.id !== entry.id));
      return refresh();
    },
  });
}

export function useSaveShelf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { shelf: { id: string; version: number } | null; placements: ShelfPlacement[] }) =>
      saveShelfLayout(requireSupabase(), input.shelf, input.placements),
    // Also on error: a version conflict means the stored shelf moved on, so fetch it.
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.collections }),
  });
}
