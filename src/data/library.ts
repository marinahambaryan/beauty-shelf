import type { Supabase } from '@/lib/supabase';
import type { PersonalProductInput } from '@/domain/validation';
import { removePhotos, signPhotos, uploadPhoto } from './photos';
import type {
  OwnershipStatus,
  ProductCategory,
  RepurchaseIntent,
  UsageStatus,
  ItemPatch,
} from '@/domain/library';

export type LibraryEntry = {
  id: string;
  source: 'catalog' | 'personal';
  /** The catalogue shade/size this entry is, for catalog entries. */
  variantId: string | null;
  productId: string | null;
  /** The private product behind an entry that was added manually. */
  personalProductId: string | null;
  brand: string;
  name: string;
  variant: string | null;
  category: ProductCategory;
  /** What to show: the person's own photo (signed URL) when there is one, else the catalogue's. */
  imageUrl: string | null;
  /** The person's own photo of this entry, in the private product-photos bucket. */
  photoPath: string | null;
  /** The photo given when a product was added manually, in the same bucket. */
  imagePath: string | null;
  ownershipStatus: OwnershipStatus;
  usageStatus: UsageStatus | null;
  rating: number | null;
  notes: string | null;
  repurchaseIntent: RepurchaseIntent | null;
  finishedAt: string | null;
  updatedAt: string;
  version: number;
};

const LIBRARY_SELECT = `
  id, catalog_variant_id, personal_product_id, photo_path, ownership_status, usage_status, rating, notes, repurchase_intent,
  finished_at, updated_at, version,
  product_variants(label, image_url, product_id, products(name, category, image_url, brands(name))),
  personal_products(brand_name, name, category, variant_label, image_path)
` as const;

export async function listLibrary(db: Supabase): Promise<LibraryEntry[]> {
  const { data, error } = await db
    .from('library_items')
    .select(LIBRARY_SELECT)
    .order('updated_at', { ascending: false });
  if (error) throw error;

  const entries: LibraryEntry[] = (data ?? []).map((row) => {
    const base = {
      id: row.id,
      photoPath: row.photo_path,
      ownershipStatus: row.ownership_status,
      usageStatus: row.usage_status,
      rating: row.rating,
      notes: row.notes,
      repurchaseIntent: row.repurchase_intent,
      finishedAt: row.finished_at,
      updatedAt: row.updated_at,
      version: row.version,
    };
    const v = row.product_variants;
    if (v?.products) {
      return {
        ...base,
        source: 'catalog' as const,
        variantId: row.catalog_variant_id,
        productId: v.product_id,
        personalProductId: null,
        brand: v.products.brands?.name ?? '',
        name: v.products.name,
        variant: v.label,
        category: v.products.category,
        imageUrl: v.image_url ?? v.products.image_url,
        imagePath: null,
      };
    }
    const p = row.personal_products;
    return {
      ...base,
      source: 'personal' as const,
      variantId: null,
      productId: null,
      personalProductId: row.personal_product_id,
      brand: p?.brand_name ?? '',
      name: p?.name ?? '',
      variant: p?.variant_label ?? null,
      category: p?.category ?? 'other',
      imageUrl: null,
      imagePath: p?.image_path ?? null,
    };
  });
  return withPhotos(db, entries);
}

/**
 * Own photos live in a private bucket, so each is shown through a short-lived signed URL,
 * fetched in one request for the whole library. A photo that can't be signed falls back
 * to the catalogue image (or the neutral stand-in) rather than failing the list.
 */
async function withPhotos(db: Supabase, entries: LibraryEntry[]): Promise<LibraryEntry[]> {
  const paths = [...new Set(entries.map(ownPhotoPath).filter((p): p is string => Boolean(p)))];
  if (!paths.length) return entries;
  const urls = await signPhotos(db, paths).catch(() => new Map<string, string>());
  return entries.map((e) => {
    const path = ownPhotoPath(e);
    const url = path ? urls.get(path) : undefined;
    return url ? { ...e, imageUrl: url } : e;
  });
}

/** The person's own photo wins over the one given when added manually. */
export const ownPhotoPath = (e: Pick<LibraryEntry, 'photoPath' | 'imagePath'>) => e.photoPath ?? e.imagePath;

export type LibraryCounts = Record<OwnershipStatus | 'all', number>;

export async function libraryCounts(db: Supabase): Promise<LibraryCounts> {
  const { data, error } = await db.from('library_items').select('ownership_status');
  if (error) throw error;
  const counts: LibraryCounts = { all: 0, owned: 0, wishlist: 0, finished: 0 };
  for (const r of data ?? []) {
    counts.all += 1;
    counts[r.ownership_status] += 1;
  }
  return counts;
}

/** Never duplicates: returns { created: false } with the existing entry's id (brief §6). */
export async function addVariantToLibrary(
  db: Supabase,
  input: { variantId: string; status: OwnershipStatus; usage?: UsageStatus | null; notes?: string | null },
): Promise<{ libraryItemId: string; created: boolean }> {
  const { data, error } = await db.rpc('add_variant_to_library', {
    p_variant_id: input.variantId,
    p_status: input.status,
    p_usage: input.usage ?? undefined,
    p_notes: input.notes ?? undefined,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('add_variant_to_library returned no row');
  return { libraryItemId: row.library_item_id, created: row.created };
}

export async function createPersonalProduct(
  db: Supabase,
  input: {
    brand: string;
    name: string;
    category: ProductCategory;
    status: OwnershipStatus;
    variantLabel?: string | null;
    notes?: string | null;
    imagePath?: string | null;
  },
): Promise<string> {
  const { data, error } = await db.rpc('create_personal_product', {
    p_brand_name: input.brand,
    p_name: input.name,
    p_category: input.category,
    p_status: input.status,
    p_variant_label: input.variantLabel ?? undefined,
    p_notes: input.notes ?? undefined,
    p_image_path: input.imagePath ?? undefined,
  });
  if (error) throw error;
  return data;
}

/**
 * Saves the editor's changes only if nobody else changed the item since it was loaded
 * (the version check). A stale save raises 'version_conflict'; a deleted item, not_found.
 */
export async function updateLibraryItem(
  db: Supabase,
  input: { id: string; version: number; patch: ItemPatch & { photo_path?: string | null } },
): Promise<number> {
  const { data, error } = await db
    .from('library_items')
    .update(input.patch)
    .eq('id', input.id)
    .eq('version', input.version)
    .select('version')
    .maybeSingle();
  if (error) throw error;
  if (data) return data.version;
  const { data: still } = await db.from('library_items').select('id').eq('id', input.id).maybeSingle();
  if (still) throw new Error('version_conflict');
  throw Object.assign(new Error('not found'), { code: 'P0002' });
}

/** Deletes the entry (memberships and history cascade in the database). */
export async function deleteLibraryItem(db: Supabase, id: string) {
  const { error } = await db.from('library_items').delete().eq('id', id);
  if (error) throw error;
}

/** Uploads the photo first (if any), then creates the product; a failed create removes the photo again. */
export async function addManually(
  db: Supabase,
  userId: string,
  input: PersonalProductInput & { photoUri: string | null },
): Promise<string> {
  const imagePath = input.photoUri ? await uploadPhoto(db, userId, input.photoUri) : null;
  try {
    return await createPersonalProduct(db, { ...input, imagePath });
  } catch (error) {
    await removePhotos(db, [imagePath]);
    throw error;
  }
}

/**
 * Sets (uri) or removes (null) the person's own photo of an entry. The new file is uploaded
 * before the row changes, and the old one is removed only once nothing points at it.
 */
export async function setPhoto(db: Supabase, userId: string, entry: LibraryEntry, uri: string | null) {
  const next = uri ? await uploadPhoto(db, userId, uri) : null;
  try {
    if (entry.personalProductId) {
      // A product added manually keeps its one photo on the product itself.
      const { error } = await db.from('personal_products').update({ image_path: next }).eq('id', entry.personalProductId);
      if (error) throw error;
    } else {
      await updateLibraryItem(db, { id: entry.id, version: entry.version, patch: { photo_path: next } });
    }
  } catch (error) {
    await removePhotos(db, [next]);
    throw error;
  }
  await removePhotos(db, [entry.personalProductId ? entry.imagePath : entry.photoPath]);
}
