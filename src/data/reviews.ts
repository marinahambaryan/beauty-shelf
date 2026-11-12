import type { Supabase } from '@/lib/supabase';

/** Your own public review of a catalogue product, as stored. */
export type MyReview = { id: string; productId: string; rating: number; body: string | null; updatedAt: string; version: number };

/** A review as anyone reads it: the name it shows, never who it is. */
export type PublicReview = {
  id: string;
  rating: number;
  body: string;
  updatedAt: string;
  authorName: string;
  isMine: boolean;
};

export type RatingSummary = {
  /** One decimal, or null when nobody has rated it. */
  average: number | null;
  ratings: number;
  reviews: number;
  /** Counts for 5, 4, 3, 2 and 1 stars, in that order. */
  histogram: [number, number, number, number, number];
};

export async function getMyReview(db: Supabase, productId: string): Promise<MyReview | null> {
  const { data, error } = await db
    .from('product_reviews')
    .select('id, product_id, rating, body, updated_at, version')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { id: data.id, productId: data.product_id, rating: data.rating, body: data.body, updatedAt: data.updated_at, version: data.version }
    : null;
}

export async function getRatingSummary(db: Supabase, productId: string): Promise<RatingSummary> {
  const { data, error } = await db.rpc('product_rating_summary', { p_product_id: productId });
  if (error) throw error;
  const row = data?.[0];
  const h = row?.histogram ?? [];
  return {
    average: row?.average === null || row?.average === undefined ? null : Number(row.average),
    ratings: row?.ratings ?? 0,
    reviews: row?.reviews ?? 0,
    histogram: [h[0] ?? 0, h[1] ?? 0, h[2] ?? 0, h[3] ?? 0, h[4] ?? 0],
  };
}

export async function listReviews(db: Supabase, productId: string, limit = 20, offset = 0): Promise<PublicReview[]> {
  const { data, error } = await db.rpc('product_reviews_page', { p_product_id: productId, p_limit: limit, p_offset: offset });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    updatedAt: r.updated_at,
    authorName: r.author_name,
    isMine: r.is_mine,
  }));
}

/**
 * Posts or edits your review. Editing checks the version you started from, so a change
 * made on another device isn't overwritten silently (same rule as the library, D6).
 */
export async function saveReview(
  db: Supabase,
  input: { productId: string; rating: number; body: string | null; existing: Pick<MyReview, 'id' | 'version'> | null },
) {
  if (!input.existing) {
    const { error } = await db.from('product_reviews').insert({ product_id: input.productId, rating: input.rating, body: input.body });
    if (error) throw error;
    return;
  }
  const { data, error } = await db
    .from('product_reviews')
    .update({ rating: input.rating, body: input.body })
    .eq('id', input.existing.id)
    .eq('version', input.existing.version)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('version_conflict');
}

export async function deleteReview(db: Supabase, id: string) {
  const { error } = await db.from('product_reviews').delete().eq('id', id);
  if (error) throw error;
}
