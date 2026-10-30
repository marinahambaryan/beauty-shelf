import type { Supabase } from '@/lib/supabase';
import type { Database } from './database.types';

export type CollectionType = Database['public']['Enums']['collection_type'];

/** One thing in a collection: a library entry (shelf, custom) or a product to buy (shopping list). */
export type CollectionRef = {
  libraryItemId: string | null;
  variantId: string | null;
  personalProductId: string | null;
  /** Handwriting on the glass above a product on the shelf. */
  note: string | null;
};

export type CollectionSummary = {
  id: string;
  type: CollectionType;
  name: string;
  description: string | null;
  itemCount: number;
  /** In the collection's own order. */
  items: CollectionRef[];
  version: number;
};

const typeOrder: Record<CollectionType, number> = { shelf: 0, custom: 1, shopping: 2 };

export async function listCollections(db: Supabase): Promise<CollectionSummary[]> {
  const { data, error } = await db
    .from('collections')
    .select(
      'id, type, name, description, version, created_at, collection_items(library_item_id, catalog_variant_id, personal_product_id, note, sort_order)',
    )
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((c) => {
      const items = [...(c.collection_items ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({
          libraryItemId: i.library_item_id,
          variantId: i.catalog_variant_id,
          personalProductId: i.personal_product_id,
          note: i.note,
        }));
      return { id: c.id, type: c.type, name: c.name, description: c.description, version: c.version, items, itemCount: items.length };
    })
    .sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
}

export type ShelfPlacement = { libraryItemId: string; note: string | null };

/** A shelf holds up to 12 products (`shelf_capacity()` in the database). */
export const SHELF_CAPACITY = 12;

/**
 * Saves the whole shelf — which products, their order and the note on each — in one
 * version-checked call. The first save creates the shelf. Returns the new version.
 */
export async function saveShelfLayout(
  db: Supabase,
  shelf: { id: string; version: number } | null,
  placements: readonly ShelfPlacement[],
): Promise<number> {
  let target = shelf;
  if (!target) {
    const { data, error } = await db.from('collections').insert({ type: 'shelf', name: 'My shelf' }).select('id, version').single();
    if (error) throw error;
    target = data;
  }
  const { data, error } = await db.rpc('save_shelf_layout', {
    p_collection_id: target.id,
    p_library_item_ids: placements.map((p) => p.libraryItemId),
    p_notes: placements.map((p) => p.note?.trim() ?? ''),
    p_expected_version: target.version,
  });
  if (error) throw error;
  return data;
}
