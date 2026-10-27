import type { Supabase } from '@/lib/supabase';
import type { Database } from './database.types';

export type CollectionType = Database['public']['Enums']['collection_type'];

export type CollectionSummary = {
  id: string;
  type: CollectionType;
  name: string;
  description: string | null;
  itemCount: number;
  version: number;
};

const typeOrder: Record<CollectionType, number> = { shelf: 0, shopping: 1, custom: 2 };

export async function listCollections(db: Supabase): Promise<CollectionSummary[]> {
  const { data, error } = await db
    .from('collections')
    .select('id, type, name, description, version, created_at, collection_items(count)')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      description: c.description,
      version: c.version,
      itemCount: (c.collection_items as unknown as { count: number }[])[0]?.count ?? 0,
    }))
    .sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
}
