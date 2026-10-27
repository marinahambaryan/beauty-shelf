import type { Supabase } from '@/lib/supabase';
import type {
  OwnershipStatus,
  ProductCategory,
  RepurchaseIntent,
  UsageStatus,
} from '@/domain/library';

export type LibraryEntry = {
  id: string;
  source: 'catalog' | 'personal';
  brand: string;
  name: string;
  variant: string | null;
  category: ProductCategory;
  imageUrl: string | null;
  /** Private storage path for personal products; resolve to a signed URL before display. */
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
  id, ownership_status, usage_status, rating, notes, repurchase_intent, finished_at, updated_at, version,
  product_variants(label, image_url, products(name, category, image_url, brands(name))),
  personal_products(brand_name, name, category, variant_label, image_path)
` as const;

export async function listLibrary(db: Supabase): Promise<LibraryEntry[]> {
  const { data, error } = await db
    .from('library_items')
    .select(LIBRARY_SELECT)
    .order('updated_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const base = {
      id: row.id,
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
      brand: p?.brand_name ?? '',
      name: p?.name ?? '',
      variant: p?.variant_label ?? null,
      category: p?.category ?? 'other',
      imageUrl: null,
      imagePath: p?.image_path ?? null,
    };
  });
}

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
