import type { Supabase } from '@/lib/supabase';
import type { ProductEvent } from '@/domain/events';

/** Your latest history, newest first. Rows are private to their owner (RLS). */
export async function listRecentEvents(client: Supabase, limit = 5): Promise<ProductEvent[]> {
  const { data, error } = await client
    .from('product_events')
    .select('id, library_item_id, event_type, from_status, to_status, occurred_at')
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    libraryItemId: r.library_item_id,
    type: r.event_type,
    from: r.from_status,
    to: r.to_status,
    at: r.occurred_at,
  }));
}
