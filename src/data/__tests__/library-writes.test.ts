import { toAppError } from '@/lib/errors';
import type { Supabase } from '@/lib/supabase';
import { addManually, setPhoto, updateLibraryItem, type LibraryEntry } from '../library';

import { catalogImageUrl } from '../images';
import { MAX_PHOTO_BYTES, newPhotoPath } from '../photos';

/**
 * A small stand-in for the Supabase client: records every call and answers from a script.
 * Enough to check the order of writes and the clean-up paths without a server.
 */
function fakeDb(script: {
  update?: { data: unknown; error: unknown };
  exists?: boolean;
  rpc?: { data: unknown; error: unknown };
  uploadError?: unknown;
}) {
  const calls: string[] = [];
  const query = (table: string) => {
    let isUpdate = false;
    const chain = {
      update: (patch: object) => {
        isUpdate = true;
        calls.push(`update ${table} ${JSON.stringify(patch)}`);
        return chain;
      },
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => {
        if (isUpdate) return script.update ?? { data: { version: 2 }, error: null };
        return { data: script.exists ? { id: 'x' } : null, error: null };
      },
      then: (resolve: (v: unknown) => void) => resolve(script.update ?? { data: null, error: null }),
    };
    return chain;
  };
  const db = {
    from: query,
    rpc: async (name: string) => {
      calls.push(`rpc ${name}`);
      return script.rpc ?? { data: 'new-item', error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string) => {
          calls.push(`upload ${path.split('/')[0]}`);
          return { error: script.uploadError ?? null };
        },
        remove: async (paths: string[]) => {
          calls.push(`remove ${paths.length}`);
          return { error: null };
        },
      }),
    },
  };
  return { db: db as unknown as Supabase, calls };
}

const photoBytes = (n: number) =>
  jest.spyOn(global, 'fetch').mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(n) } as Response);

const entry = (over: Partial<LibraryEntry> = {}): LibraryEntry => ({
  id: 'item-1',
  source: 'catalog',
  variantId: 'v1',
  productId: 'p1',
  personalProductId: null,
  brand: 'Kiehl’s',
  name: 'Ultra Facial Cream',
  variant: null,
  category: 'skincare',
  imageUrl: null,
  photoPath: null,
  imagePath: null,
  ownershipStatus: 'owned',
  usageStatus: null,
  rating: null,
  notes: null,
  repurchaseIntent: null,
  finishedAt: null,
  updatedAt: '2026-10-28T10:00:00Z',
  version: 1,
  ...over,
});

afterEach(() => jest.restoreAllMocks());

describe('updateLibraryItem (version-checked saves)', () => {
  it('returns the new version when the save lands', async () => {
    const { db } = fakeDb({ update: { data: { version: 3 }, error: null } });
    await expect(updateLibraryItem(db, { id: 'a', version: 2, patch: { rating: 5 } })).resolves.toBe(3);
  });

  it('reports a conflict when the item changed elsewhere', async () => {
    const { db } = fakeDb({ update: { data: null, error: null }, exists: true });
    const error = await updateLibraryItem(db, { id: 'a', version: 1, patch: { rating: 5 } }).catch((e) => e);
    expect(toAppError(error).kind).toBe('conflict');
  });

  it('reports not found when the item was deleted', async () => {
    const { db } = fakeDb({ update: { data: null, error: null }, exists: false });
    const error = await updateLibraryItem(db, { id: 'a', version: 1, patch: { rating: 5 } }).catch((e) => e);
    expect(toAppError(error).kind).toBe('not_found');
  });
});

describe('add manually', () => {
  const input = {
    brand: 'Indie',
    name: 'Balm',
    variantLabel: null,
    category: 'body' as const,
    status: 'owned' as const,
    notes: null,
  };

  it('uploads the photo into the person’s folder, then creates the product', async () => {
    photoBytes(1000);
    const { db, calls } = fakeDb({});
    await expect(addManually(db, 'user-1', { ...input, photoUri: 'file:///a.jpg' })).resolves.toBe('new-item');
    expect(calls).toEqual(['upload user-1', 'rpc create_personal_product']);
  });

  it('removes the uploaded photo again if the product can’t be created', async () => {
    photoBytes(1000);
    const { db, calls } = fakeDb({ rpc: { data: null, error: { message: 'boom' } } });
    await expect(addManually(db, 'user-1', { ...input, photoUri: 'file:///a.jpg' })).rejects.toBeTruthy();
    expect(calls).toEqual(['upload user-1', 'rpc create_personal_product', 'remove 1']);
  });

  it('refuses photos over 5 MB before uploading', async () => {
    photoBytes(MAX_PHOTO_BYTES + 1);
    const { db, calls } = fakeDb({});
    const error = await addManually(db, 'user-1', { ...input, photoUri: 'file:///big.jpg' }).catch((e) => e);
    expect(toAppError(error).message).toBe('That photo is over 5 MB. Choose a smaller one.');
    expect(calls).toEqual([]);
  });

  it('works without a photo', async () => {
    const { db, calls } = fakeDb({});
    await addManually(db, 'user-1', { ...input, photoUri: null });
    expect(calls).toEqual(['rpc create_personal_product']);
  });
});

describe('setPhoto', () => {
  it('puts a catalogue entry’s photo on the library item and removes the old file afterwards', async () => {
    photoBytes(1000);
    const { db, calls } = fakeDb({});
    await setPhoto(db, 'user-1', entry({ photoPath: 'user-1/old.jpg' }), 'file:///new.jpg');
    expect(calls[0]).toBe('upload user-1');
    expect(calls[1]).toMatch(/^update library_items \{"photo_path":"user-1\/.+\.jpg"\}$/);
    expect(calls.at(-1)).toBe('remove 1');
  });

  it('keeps a manually added product’s photo on the product', async () => {
    const { db, calls } = fakeDb({});
    await setPhoto(db, 'user-1', entry({ source: 'personal', personalProductId: 'pp1', imagePath: 'user-1/a.jpg' }), null);
    expect(calls).toEqual(['update personal_products {"image_path":null}', 'remove 1']);
  });

  it('keeps the old photo if the save is stale', async () => {
    photoBytes(1000);
    const { db, calls } = fakeDb({ update: { data: null, error: null }, exists: true });
    await expect(setPhoto(db, 'user-1', entry({ photoPath: 'user-1/old.jpg' }), 'file:///new.jpg')).rejects.toThrow(
      'version_conflict',
    );
    // Only the new upload is cleaned up; the old photo is still in use.
    expect(calls.filter((c) => c.startsWith('remove'))).toEqual(['remove 1']);
    expect(calls.at(-1)).toBe('remove 1');
  });
});

describe('newPhotoPath', () => {
  it('lives in the owner’s folder', () => {
    expect(newPhotoPath('user-1', 0, 0.5)).toMatch(/^user-1\/0-[a-z0-9]+\.jpg$/);
  });
});

describe('catalogImageUrl', () => {
  it('resolves bucket paths against the configured project', () => {
    expect(catalogImageUrl('catalog-images/a.webp', 'http://192.168.1.2:55321/')).toBe(
      'http://192.168.1.2:55321/storage/v1/object/public/catalog-images/a.webp',
    );
  });
  it('keeps full URLs and ignores blanks', () => {
    expect(catalogImageUrl('https://img.example/a.jpg', 'http://x')).toBe('https://img.example/a.jpg');
    expect(catalogImageUrl('  ', 'http://x')).toBeNull();
    expect(catalogImageUrl('catalog-images/a.webp', null)).toBeNull();
  });
});
