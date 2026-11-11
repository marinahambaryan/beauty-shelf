import type { ProductCategory } from '@/domain/library';
import type { Supabase } from '@/lib/supabase';
import type { Database } from './database.types';
import { catalogImageUrl } from './images';

export type CollectionType = Database['public']['Enums']['collection_type'];
export type CollectionLook = Database['public']['Enums']['collection_look'];

/** A product as the collection itself knows it, for items that aren't (or aren't yet) in the library. */
export type CollectionProduct = {
  name: string;
  brand: string;
  variant: string | null;
  category: ProductCategory;
  imageUrl: string | null;
};

/** One thing in a collection: a library entry (shelf, custom) or a product to buy (shopping list). */
export type CollectionRef = {
  /** The collection_items row. */
  id: string;
  libraryItemId: string | null;
  variantId: string | null;
  personalProductId: string | null;
  /** Handwriting on the glass above a product on the shelf. */
  note: string | null;
  /** Shopping list only: ticked off, and how many to buy. */
  checked: boolean | null;
  quantity: number | null;
  product: CollectionProduct | null;
};

export type CollectionSummary = {
  id: string;
  type: CollectionType;
  name: string;
  description: string | null;
  look: CollectionLook;
  itemCount: number;
  /** In the collection's own order. */
  items: CollectionRef[];
  version: number;
};

const typeOrder: Record<CollectionType, number> = { shelf: 0, custom: 1, shopping: 2 };

const ITEM_SELECT = `id, library_item_id, catalog_variant_id, personal_product_id, note, sort_order, checked, desired_quantity,
  product_variants(label, image_url, products(name, category, image_url, brands(name))),
  personal_products(name, brand_name, category, variant_label)`;

export async function listCollections(db: Supabase): Promise<CollectionSummary[]> {
  const { data, error } = await db
    .from('collections')
    .select(`id, type, name, description, look, version, created_at, collection_items(${ITEM_SELECT})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((c) => {
      const items: CollectionRef[] = [...(c.collection_items ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => {
          const v = i.product_variants;
          const p = i.personal_products;
          const product: CollectionProduct | null = v?.products
            ? {
                name: v.products.name,
                brand: v.products.brands?.name ?? '',
                variant: v.label,
                category: v.products.category,
                imageUrl: catalogImageUrl(v.image_url ?? v.products.image_url),
              }
            : p
              ? { name: p.name, brand: p.brand_name ?? '', variant: p.variant_label, category: p.category, imageUrl: null }
              : null;
          return {
            id: i.id,
            libraryItemId: i.library_item_id,
            variantId: i.catalog_variant_id,
            personalProductId: i.personal_product_id,
            note: i.note,
            checked: i.checked,
            quantity: i.desired_quantity,
            product,
          };
        });
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        description: c.description,
        look: c.look,
        version: c.version,
        items,
        itemCount: items.length,
      };
    })
    .sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
}

// ---------------------------------------------------------------------------
// Custom collections
// ---------------------------------------------------------------------------
export async function createCollection(db: Supabase, input: { name: string; look: CollectionLook }): Promise<string> {
  const { data, error } = await db
    .from('collections')
    .insert({ type: 'custom', name: input.name, look: input.look })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Rename or restyle, checked against the version on screen. No row back: changed elsewhere (or gone). */
export async function updateCollection(
  db: Supabase,
  input: { id: string; version: number; patch: { name?: string; look?: CollectionLook } },
) {
  const { data, error } = await db
    .from('collections')
    .update(input.patch)
    .eq('id', input.id)
    .eq('version', input.version)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw await missingOrStale(db, input.id);
}

async function missingOrStale(db: Supabase, id: string) {
  const { data } = await db.from('collections').select('id').eq('id', id).maybeSingle();
  return data ? { message: 'version_conflict' } : { message: 'not found', code: 'P0002' };
}

export async function deleteCollection(db: Supabase, id: string) {
  const { error } = await db.from('collections').delete().eq('id', id);
  if (error) throw error;
}

/** What goes into a collection: a library entry, or (shopping list) the product behind it. */
export type NewItem = { libraryItemId: string } | { variantId: string } | { personalProductId: string };

export async function addToCollection(db: Supabase, collectionId: string, items: readonly NewItem[]) {
  if (!items.length) return;
  const rows = items.map((i) => ({
    collection_id: collectionId,
    library_item_id: 'libraryItemId' in i ? i.libraryItemId : null,
    catalog_variant_id: 'variantId' in i ? i.variantId : null,
    personal_product_id: 'personalProductId' in i ? i.personalProductId : null,
  }));
  const { error } = await db.from('collection_items').insert(rows);
  if (error) throw error;
}

export async function removeFromCollection(db: Supabase, itemIds: readonly string[]) {
  if (!itemIds.length) return;
  const { error } = await db.from('collection_items').delete().in('id', [...itemIds]);
  if (error) throw error;
}

/** The full new order of a collection's items, checked against the collection's version. */
export async function setCollectionOrder(db: Supabase, input: { id: string; version: number; itemIds: string[] }) {
  const { error } = await db.rpc('set_collection_order', {
    p_collection_id: input.id,
    p_item_ids: input.itemIds,
    p_expected_version: input.version,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Shopping list
// ---------------------------------------------------------------------------
export async function updateShoppingItem(db: Supabase, id: string, patch: { checked?: boolean; quantity?: number }) {
  const { error } = await db
    .from('collection_items')
    .update({ checked: patch.checked, desired_quantity: patch.quantity })
    .eq('id', id);
  if (error) throw error;
}

/** Puts the product in the library as Owned, then ticks it off or takes it off the list. */
export async function markPurchased(db: Supabase, input: { itemId: string; remove: boolean }): Promise<string> {
  const { data, error } = await db.rpc('mark_shopping_item_purchased', { p_item_id: input.itemId, p_remove: input.remove });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// The curated shelf
// ---------------------------------------------------------------------------
export type ShelfPlacement = { libraryItemId: string; note: string | null };

/** A shelf holds up to 18 products (`shelf_capacity()` in the database). */
export const SHELF_CAPACITY = 18;

/**
 * Saves the whole shelf — which products, their order and the note on each — in one
 * version-checked call. Saving a shelf that doesn't exist yet creates it with `name`.
 * Returns the shelf's id and new version.
 */
export async function saveShelfLayout(
  db: Supabase,
  shelf: { id: string; version: number } | null,
  placements: readonly ShelfPlacement[],
  name = 'My shelf',
): Promise<{ id: string; version: number }> {
  let target = shelf;
  if (!target) {
    const { data, error } = await db.from('collections').insert({ type: 'shelf', name }).select('id, version').single();
    if (error) throw error;
    target = data;
  }
  const { error } = await db.rpc('save_shelf_layout', {
    p_collection_id: target.id,
    p_library_item_ids: placements.map((p) => p.libraryItemId),
    p_notes: placements.map((p) => p.note?.trim() ?? ''),
    p_expected_version: target.version,
  });
  if (error) throw error;
  // claim_collection_version bumped the version; fetch it so a rename can follow.
  const { data: after, error: readError } = await db.from('collections').select('id, version').eq('id', target.id).single();
  if (readError) throw readError;
  return after;
}
