/**
 * Turns Supabase / network failures into short, honest, user-facing messages.
 * The database raises stable tokens (e.g. 'version_conflict', 'shelf_full') that we map here.
 */
export type AppErrorKind =
  | 'network'
  | 'conflict'
  | 'shelf_full'
  | 'auth'
  | 'not_found'
  | 'validation'
  | 'photo'
  | 'unknown';

export type AppError = { kind: AppErrorKind; message: string };

type Raw = { message?: unknown; code?: unknown; status?: unknown; name?: unknown; hint?: unknown };

export function toAppError(error: unknown): AppError {
  const e = (typeof error === 'object' && error !== null ? error : { message: String(error) }) as Raw;
  const message = typeof e.message === 'string' ? e.message : '';
  const code = typeof e.code === 'string' ? e.code : '';

  if (/network request failed|failed to fetch|fetch failed|networkerror|timed? ?out/i.test(message) || e.name === 'AuthRetryableFetchError') {
    return { kind: 'network', message: 'You appear to be offline. Nothing was saved — try again when you’re connected.' };
  }
  if (message === 'version_conflict') {
    return { kind: 'conflict', message: 'This changed on another device. Reload to see the latest version.' };
  }
  if (message === 'photo_too_large' || /payload too large|exceeded the maximum allowed size/i.test(message)) {
    return { kind: 'photo', message: 'That photo is over 5 MB. Choose a smaller one.' };
  }
  if (/mime type .* is not supported|invalid_mime_type/i.test(message)) {
    return { kind: 'photo', message: 'That file type isn’t supported. Use a JPG, PNG, WebP or HEIC photo.' };
  }
  if (message === 'camera_permission') {
    return {
      kind: 'photo',
      message: 'Beauty Shelf can’t use the camera. Allow camera access in Settings, or choose a photo instead.',
    };
  }
  if (message === 'shelf_full') {
    return { kind: 'shelf_full', message: 'Your shelf holds up to 12 products. Remove or replace one first.' };
  }
  if (/invalid login credentials/i.test(message)) {
    return { kind: 'auth', message: 'That email and password don’t match an account.' };
  }
  if (/user already registered/i.test(message)) {
    return { kind: 'auth', message: 'An account with this email already exists. Try signing in.' };
  }
  if (/email not confirmed/i.test(message)) {
    return { kind: 'auth', message: 'Please confirm your email first — check your inbox for the link.' };
  }
  if (code === 'P0002' || code === 'PGRST116') {
    return { kind: 'not_found', message: 'We couldn’t find that item. It may have been deleted.' };
  }
  if (code === '23514' || code === '22023' || code === '23505') {
    return { kind: 'validation', message: 'That change isn’t allowed. Please check the details and try again.' };
  }
  return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
}
