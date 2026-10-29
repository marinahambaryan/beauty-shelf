import { env } from '@/lib/env';

/**
 * Catalogue image fields hold either a full URL (a licensed source) or a path in the public
 * catalog-images bucket ("catalog-images/x.webp"). Paths are resolved against whichever
 * Supabase project the app is configured for, so the same seed works everywhere.
 */
export function catalogImageUrl(value: string | null | undefined, baseUrl = 'missing' in env ? null : env.supabaseUrl) {
  const v = value?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${v.replace(/^\/+/, '')}`;
}
