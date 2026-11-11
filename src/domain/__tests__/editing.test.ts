import { itemPatch, todayISO, variantKind, type ItemDraft } from '../library';
import { finishedDateSchema, noteSchema, personalProductSchema } from '../validation';

const saved: ItemDraft = {
  ownershipStatus: 'owned',
  usageStatus: 'using',
  rating: 4,
  repurchaseIntent: null,
  finishedAt: null,
  openedOn: null,
  lastsMonths: null,
  notes: 'Lovely',
};

describe('itemPatch', () => {
  it('is empty when nothing changed', () => {
    expect(itemPatch(saved, { ...saved })).toEqual({});
  });

  it('sends only the fields that changed', () => {
    expect(itemPatch(saved, { ...saved, rating: 5, notes: null })).toEqual({ rating: 5, notes: null });
  });

  it('clears usage when leaving Owned, and keeps notes and rating', () => {
    expect(itemPatch(saved, { ...saved, ownershipStatus: 'wishlist' })).toEqual({
      ownership_status: 'wishlist',
      usage_status: null,
    });
  });

  it('only sends a finished date while Finished', () => {
    const finishing = { ...saved, ownershipStatus: 'finished' as const, finishedAt: '2026-10-01' };
    expect(itemPatch(saved, finishing)).toMatchObject({ ownership_status: 'finished', finished_at: '2026-10-01' });
    expect(itemPatch(saved, { ...saved, finishedAt: '2026-10-01' })).toEqual({});
  });
});

describe('variantKind', () => {
  it('calls choices shades when any variant has a shade name', () => {
    expect(variantKind([{ shadeName: 'Pillow Talk', sizeLabel: null }])).toBe('Shade');
    expect(variantKind([{ shadeName: null, sizeLabel: '50 ml' }])).toBe('Size');
  });
});

describe('todayISO', () => {
  it('formats the local date', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('library validation', () => {
  it('trims manual products and turns blank optional fields into null', () => {
    expect(
      personalProductSchema.parse({
        brand: '  Indie ',
        name: ' Balm ',
        variantLabel: '  ',
        category: 'body',
        status: 'owned',
        notes: '',
      }),
    ).toEqual({ brand: 'Indie', name: 'Balm', variantLabel: null, category: 'body', status: 'owned', notes: null });
  });

  it('asks for a brand and a name', () => {
    const r = personalProductSchema.safeParse({ brand: ' ', name: '', variantLabel: '', category: 'body', status: 'owned', notes: '' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toEqual(['Enter the brand.', 'Enter the product name.']);
  });

  it('accepts only real dates, or blank', () => {
    expect(finishedDateSchema.parse(' 2026-02-28 ')).toBe('2026-02-28');
    expect(finishedDateSchema.parse('')).toBeNull();
    expect(finishedDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(finishedDateSchema.safeParse('28/02/2026').success).toBe(false);
  });

  it('caps notes at 5,000 characters', () => {
    expect(noteSchema.safeParse('x'.repeat(5001)).success).toBe(false);
  });
});
