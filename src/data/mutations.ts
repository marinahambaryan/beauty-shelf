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
import {
  addToCollection,
  createCollection,
  deleteCollection,
  markPurchased,
  removeFromCollection,
  saveShelfLayout,
  setCollectionOrder,
  updateCollection,
  updateShoppingItem,
  type CollectionLook,
  type CollectionSummary,
  type NewItem,
  type ShelfPlacement,
} from './collections';
import { removePhotos } from './photos';
import { keys } from './queries';
import { sendToCatalogue } from './submissions';

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
    /** Layout first (creating the shelf if needed), then the name if it changed. */
    mutationFn: async (input: {
      shelf: { id: string; version: number; name: string } | null;
      placements: ShelfPlacement[];
      name: string;
    }) => {
      const db = requireSupabase();
      const saved = await saveShelfLayout(db, input.shelf, input.placements, input.name);
      if (input.shelf && input.shelf.name !== input.name) {
        await updateCollection(db, { id: saved.id, version: saved.version, patch: { name: input.name } });
      }
      return saved.id;
    },
    // Also on error: a version conflict means the stored shelf moved on, so fetch it.
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.collections }),
  });
}

/** Collection changes refresh the collections; adding or deleting can touch the library too. */
function useRefreshCollections() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: keys.collections });
}

export function useCreateCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: (input: { name: string; look: CollectionLook }) => createCollection(requireSupabase(), input),
    onSuccess: () => refresh(),
  });
}

export function useUpdateCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: (input: { id: string; version: number; patch: { name?: string; look?: CollectionLook } }) =>
      updateCollection(requireSupabase(), input),
    onSettled: () => refresh(),
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCollection(requireSupabase(), id),
    onSuccess: (_d, id) => {
      queryClient.setQueryData<CollectionSummary[]>(keys.collections, (old) => old?.filter((c) => c.id !== id));
      return queryClient.invalidateQueries({ queryKey: keys.collections });
    },
  });
}

export function useAddToCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: (input: { collectionId: string; items: NewItem[] }) =>
      addToCollection(requireSupabase(), input.collectionId, input.items),
    onSettled: () => refresh(),
  });
}

export function useRemoveFromCollection() {
  const refresh = useRefreshCollections();
  return useMutation({
    mutationFn: (itemIds: string[]) => removeFromCollection(requireSupabase(), itemIds),
    onSettled: () => refresh(),
  });
}

export function useSetCollectionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; version: number; itemIds: string[] }) => setCollectionOrder(requireSupabase(), input),
    // Show the new order straight away; the refetch confirms it (or undoes it on error).
    onMutate: (input) => {
      queryClient.setQueryData<CollectionSummary[]>(keys.collections, (old) =>
        old?.map((c) => {
          if (c.id !== input.id) return c;
          const byId = new Map(c.items.map((i) => [i.id, i]));
          return { ...c, items: input.itemIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) };
        }),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.collections }),
  });
}

export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; checked?: boolean; quantity?: number }) =>
      updateShoppingItem(requireSupabase(), input.id, input),
    onMutate: (input) => {
      queryClient.setQueryData<CollectionSummary[]>(keys.collections, (old) =>
        old?.map((c) => ({
          ...c,
          items: c.items.map((i) =>
            i.id === input.id
              ? { ...i, checked: input.checked ?? i.checked, quantity: input.quantity ?? i.quantity }
              : i,
          ),
        })),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.collections }),
  });
}

export function useMarkPurchased() {
  const refresh = useRefreshLibrary();
  return useMutation({
    mutationFn: (input: { itemId: string; remove: boolean }) => markPurchased(requireSupabase(), input),
    onSettled: () => refresh(),
  });
}

export function useSendToCatalogue(personalProductId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ note }: { note: string | null }) => sendToCatalogue(requireSupabase(), { personalProductId, note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.submission(personalProductId) }),
  });
}
