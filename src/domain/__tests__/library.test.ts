import { matchesQuery, productTitle, sortLibrary, statusPatch } from '../library';

describe('statusPatch', () => {
  it('clears usage state when leaving Owned', () => {
    expect(statusPatch('finished', { ownership_status: 'owned', usage_status: 'using' })).toEqual({
      ownership_status: 'finished',
      usage_status: null,
    });
    expect(statusPatch('wishlist', { ownership_status: 'owned', usage_status: 'paused' }).usage_status).toBeNull();
  });

  it('keeps the current usage state when staying Owned', () => {
    expect(statusPatch('owned', { ownership_status: 'owned', usage_status: 'paused' }).usage_status).toBe('paused');
  });

  it('starts with no usage state when becoming Owned unless one is requested', () => {
    expect(statusPatch('owned', { ownership_status: 'wishlist', usage_status: null }).usage_status).toBeNull();
    expect(statusPatch('owned', { ownership_status: 'finished', usage_status: null }, 'unopened').usage_status).toBe(
      'unopened',
    );
  });

  it('never includes notes, rating or repurchase intent', () => {
    const patch = statusPatch('finished', { ownership_status: 'owned', usage_status: 'using' });
    expect(Object.keys(patch).sort()).toEqual(['ownership_status', 'usage_status']);
  });
});

describe('productTitle', () => {
  it('drops empty variant labels (default variants)', () => {
    expect(productTitle({ brand: ' Dewlight ', name: 'Serum', variant: '  ' })).toEqual({
      brand: 'Dewlight',
      name: 'Serum',
      variant: null,
    });
  });
});

describe('sortLibrary', () => {
  const rows = [
    { name: 'b', brand: 'Z', rating: null, updatedAt: '2026-01-02' },
    { name: 'a', brand: 'Y', rating: 5, updatedAt: '2026-01-01' },
    { name: 'c', brand: 'X', rating: 3, updatedAt: '2026-01-03' },
  ];
  it('sorts by recency, name, brand and rating without mutating input', () => {
    expect(sortLibrary(rows, 'recent').map((r) => r.name)).toEqual(['c', 'b', 'a']);
    expect(sortLibrary(rows, 'name').map((r) => r.name)).toEqual(['a', 'b', 'c']);
    expect(sortLibrary(rows, 'brand').map((r) => r.brand)).toEqual(['X', 'Y', 'Z']);
    expect(sortLibrary(rows, 'rating').map((r) => r.name)).toEqual(['a', 'c', 'b']);
    expect(rows[0]?.name).toBe('b');
  });
});

describe('matchesQuery', () => {
  const item = { brand: 'Atelier Rosé', name: 'Satin Lip Colour', variant: 'Cinema Red' };
  it('matches every term across brand, name and shade, ignoring case and accents', () => {
    expect(matchesQuery(item, 'rose cinema')).toBe(true);
    expect(matchesQuery(item, 'ROSÉ satin')).toBe(true);
    expect(matchesQuery(item, 'rose mascara')).toBe(false);
    expect(matchesQuery(item, '   ')).toBe(true);
  });
  it('handles non-Latin input', () => {
    expect(matchesQuery({ brand: 'ブランド', name: 'リップ' }, 'リップ')).toBe(true);
  });
});
