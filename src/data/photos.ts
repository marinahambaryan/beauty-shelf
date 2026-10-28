import type { Supabase } from '@/lib/supabase';

/** Private bucket; objects must live under "<user id>/" (storage policies + row CHECKs). */
export const PHOTO_BUCKET = 'product-photos';
/** Matches the bucket's file_size_limit. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60;

/** Raised before upload so the message can be specific (see toAppError). */
export class PhotoTooLargeError extends Error {
  constructor() {
    super('photo_too_large');
  }
}

/** "<uid>/<time>-<random>.jpg": unguessable enough for a private, per-user folder. */
export function newPhotoPath(userId: string, now = Date.now(), random = Math.random()): string {
  return `${userId}/${now.toString(36)}-${random.toString(36).slice(2, 10)}.jpg`;
}

export async function signPhotos(db: Supabase, paths: string[]): Promise<Map<string, string>> {
  const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) throw error;
  const urls = new Map<string, string>();
  for (const row of data ?? []) if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
  return urls;
}

/**
 * Uploads a prepared JPEG (see preparePhoto) and returns its storage path.
 * Reading the file through fetch works for native file:// URIs and web blob: URIs alike.
 */
export async function uploadPhoto(db: Supabase, userId: string, uri: string): Promise<string> {
  const body = await fetch(uri).then((r) => r.arrayBuffer());
  if (body.byteLength > MAX_PHOTO_BYTES) throw new PhotoTooLargeError();
  const path = newPhotoPath(userId);
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/**
 * Best effort: a photo left behind only costs storage in the person's own folder, and
 * account deletion removes the whole folder, so a failed clean-up never blocks the user.
 */
export async function removePhotos(db: Supabase, paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (!list.length) return;
  await db.storage.from(PHOTO_BUCKET).remove(list).catch(() => undefined);
}
