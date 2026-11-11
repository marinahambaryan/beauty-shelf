import type { Submission } from '@/domain/submissions';
import type { Supabase } from '@/lib/supabase';

/** The latest submission of a product added manually, or null if it was never sent. */
export async function getSubmission(db: Supabase, personalProductId: string): Promise<Submission | null> {
  const { data, error } = await db
    .from('catalog_submissions')
    .select('status, review_note')
    .eq('personal_product_id', personalProductId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { status: data.status, reviewNote: data.review_note } : null;
}

export async function sendToCatalogue(
  db: Supabase,
  input: { personalProductId: string; note: string | null },
): Promise<void> {
  const { error } = await db.rpc('submit_personal_product', {
    p_personal_product_id: input.personalProductId,
    p_note: input.note ?? undefined,
  });
  if (error) throw error;
}
