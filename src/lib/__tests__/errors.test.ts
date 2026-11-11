import { toAppError } from '../errors';

describe('toAppError', () => {
  test('a sign-in whose account is gone asks to sign in again', () => {
    const e = toAppError({
      code: '23503',
      message: 'insert or update on table "library_items" violates foreign key constraint "library_items_user_id_fkey"',
    });
    expect(e.kind).toBe('auth');
    expect(e.message).toMatch(/sign in again/);
  });
  test('catalogue refusals are explained', () => {
    expect(toAppError({ message: 'too_many_pending' }).message).toMatch(/20 products/);
    expect(toAppError({ message: 'already_in_catalogue' }).message).toMatch(/already in the catalogue/);
  });
  test('stale saves and full shelves keep their own messages', () => {
    expect(toAppError({ message: 'version_conflict' }).kind).toBe('conflict');
    expect(toAppError({ message: 'shelf_full' }).kind).toBe('shelf_full');
  });
});
