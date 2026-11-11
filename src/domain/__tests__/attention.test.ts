import { attentionCards, type AttentionEntry } from '../attention';
import type { ProductEvent } from '../events';

const now = new Date(2026, 10, 11, 21, 0);
const entry = (over: Partial<AttentionEntry>): AttentionEntry => ({
  id: 'x',
  name: 'Cloud Cream',
  version: 1,
  ownershipStatus: 'owned',
  usageStatus: null,
  repurchaseIntent: null,
  finishedAt: null,
  openedOn: null,
  lastsMonths: null,
  ...over,
});
const none = new Set<string>();

describe('attentionCards', () => {
  test('expiring within a month, most urgent first', () => {
    const cards = attentionCards(
      [
        entry({ id: 'a', name: 'Cloud Cream', openedOn: '2025-12-02', lastsMonths: 12 }), // 21 days
        entry({ id: 'b', name: 'Serum C', openedOn: '2026-05-15', lastsMonths: 6 }), // 4 days
        entry({ id: 'c', name: 'Toner', openedOn: '2026-11-01', lastsMonths: 12 }), // a year away
      ],
      [],
      none,
      now,
    );
    expect(cards.map((c) => c.itemId)).toEqual(['b', 'a']);
    expect(cards[0]?.title).toBe('Serum C expires soon');
    expect(cards[0]?.body).toBe('Best before 15 Nov 2026 · 4 days left');
    expect(cards[0]?.action.patch).toEqual({ ownership_status: 'finished', usage_status: null });
  });

  test('says when something has already expired', () => {
    const [card] = attentionCards([entry({ openedOn: '2026-05-01', lastsMonths: 6 })], [], none, now);
    expect(card?.title).toBe('Cloud Cream has expired');
  });

  test('buy it again: used up in the last month, and you said yes', () => {
    const cards = attentionCards(
      [
        entry({ id: 'a', name: 'Night Oil', ownershipStatus: 'finished', repurchaseIntent: 'yes', finishedAt: '2026-11-10' }),
        entry({ id: 'b', ownershipStatus: 'finished', repurchaseIntent: 'no', finishedAt: '2026-11-10' }),
        entry({ id: 'c', ownershipStatus: 'finished', repurchaseIntent: 'yes', finishedAt: '2026-08-01' }),
      ],
      [],
      none,
      now,
    );
    expect(cards.map((c) => c.itemId)).toEqual(['a']);
    expect(cards[0]?.action).toEqual({ label: 'Add to Want', patch: { ownership_status: 'wishlist', usage_status: null } });
  });

  test('asks for an opening date when you are using it or just bought it', () => {
    const bought: ProductEvent = {
      id: 'e', libraryItemId: 'b', type: 'status_changed', from: 'wishlist', to: 'owned', at: new Date(2026, 10, 9).toISOString(),
    };
    const cards = attentionCards(
      [entry({ id: 'a', name: 'Serum C', usageStatus: 'using' }), entry({ id: 'b', name: 'Rose Balm' }), entry({ id: 'c' })],
      [bought],
      none,
      now,
    );
    expect(cards.map((c) => c.title)).toEqual(['When did you open Serum C?', 'Rose Balm is here — opened it yet?']);
    expect(cards[0]?.action.patch).toEqual({ opened_on: '2026-11-11' });
  });

  test('dismissed cards stay away, and at most three show', () => {
    const many = ['a', 'b', 'c', 'd'].map((id) => entry({ id, usageStatus: 'using' }));
    expect(attentionCards(many, [], none, now)).toHaveLength(3);
    expect(attentionCards(many, [], new Set(['openIt:a', 'openIt:b']), now).map((c) => c.itemId)).toEqual(['c', 'd']);
  });

  test('Want items never need attention', () => {
    expect(attentionCards([entry({ ownershipStatus: 'wishlist', usageStatus: null, openedOn: '2025-01-01', lastsMonths: 3 })], [], none, now)).toEqual([]);
  });
});
