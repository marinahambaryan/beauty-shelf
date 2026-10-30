import { countLabel, memberOf, moved, refFor } from '../collections';
import { collectionNameSchema } from '../validation';

const catalogEntry = { id: 'l1', variantId: 'v1', personalProductId: null };
const manualEntry = { id: 'l2', variantId: null, personalProductId: 'p2' };
const ref = (over: Partial<Parameters<typeof memberOf>[0][number]>) => ({
  id: 'i',
  libraryItemId: null,
  variantId: null,
  personalProductId: null,
  note: null,
  checked: null,
  quantity: null,
  product: null,
  ...over,
});

describe('refFor', () => {
  test('custom collections and shelves hold the library entry', () => {
    expect(refFor(catalogEntry, 'custom')).toEqual({ libraryItemId: 'l1' });
    expect(refFor(manualEntry, 'shelf')).toEqual({ libraryItemId: 'l2' });
  });
  test('the shopping list holds the product behind the entry', () => {
    expect(refFor(catalogEntry, 'shopping')).toEqual({ variantId: 'v1' });
    expect(refFor(manualEntry, 'shopping')).toEqual({ personalProductId: 'p2' });
  });
});

describe('memberOf', () => {
  test('finds an entry by itself or by its product', () => {
    expect(memberOf([ref({ id: 'a', libraryItemId: 'l1' })], catalogEntry)?.id).toBe('a');
    expect(memberOf([ref({ id: 'b', variantId: 'v1' })], catalogEntry)?.id).toBe('b');
    expect(memberOf([ref({ id: 'c', personalProductId: 'p2' })], manualEntry)?.id).toBe('c');
    expect(memberOf([ref({ id: 'd', variantId: 'v9' })], catalogEntry)).toBeUndefined();
  });
});

describe('moved', () => {
  test('moves earlier and later, and ignores moves off either end', () => {
    expect(moved(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moved(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moved(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moved(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});

describe('countLabel', () => {
  test('counts products, or what is left to buy on the shopping list', () => {
    expect(countLabel('custom', [{ checked: null }])).toBe('1 product');
    expect(countLabel('shopping', [{ checked: false }, { checked: true }, { checked: false }])).toBe('2 to buy');
  });
});

describe('collectionNameSchema', () => {
  test('trims, and needs 1–80 characters', () => {
    expect(collectionNameSchema.parse('  Travel kit ')).toBe('Travel kit');
    expect(collectionNameSchema.safeParse('   ').success).toBe(false);
    expect(collectionNameSchema.safeParse('x'.repeat(81)).success).toBe(false);
  });
});
