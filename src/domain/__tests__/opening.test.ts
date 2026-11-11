import { dateLabel, daysUntil, expiresOn, itemPatch, timeLeftLabel, type ItemDraft } from '../library';
import { openedDateSchema } from '../validation';

const saved: ItemDraft = {
  ownershipStatus: 'owned',
  usageStatus: null,
  rating: null,
  repurchaseIntent: null,
  finishedAt: null,
  openedOn: null,
  lastsMonths: null,
  notes: null,
};

describe('expiry from the opening date', () => {
  test('adds the months it lasts', () => {
    expect(expiresOn('2025-12-02', 12)).toBe('2026-12-02');
    expect(expiresOn('2026-11-10', 6)).toBe('2027-05-10');
  });
  test('a day that does not exist falls back to the end of the month', () => {
    expect(expiresOn('2026-08-31', 6)).toBe('2027-02-28');
  });
  test('needs both the date and the months', () => {
    expect(expiresOn(null, 12)).toBeNull();
    expect(expiresOn('2026-01-01', null)).toBeNull();
  });
  test('days left and how they read', () => {
    const now = new Date(2026, 10, 11, 21, 0);
    expect(daysUntil('2026-12-02', now)).toBe(21);
    expect(daysUntil('2026-11-09', now)).toBe(-2);
    expect(timeLeftLabel(21)).toBe('3 weeks left');
    expect(timeLeftLabel(5)).toBe('5 days left');
    expect(timeLeftLabel(0)).toBe('expires today');
    expect(timeLeftLabel(-2)).toBe('expired 2 days ago');
    expect(timeLeftLabel(150)).toBe('5 months left');
    expect(dateLabel('2026-12-02')).toBe('2 Dec 2026');
  });
});

describe('saving the opening date', () => {
  test('only what changed is sent, whatever the status', () => {
    expect(itemPatch(saved, { ...saved, openedOn: '2026-11-01', lastsMonths: 12 })).toEqual({
      opened_on: '2026-11-01',
      lasts_months: 12,
    });
    expect(itemPatch(saved, { ...saved, ownershipStatus: 'finished', openedOn: '2026-11-01' })).toEqual({
      ownership_status: 'finished',
      opened_on: '2026-11-01',
    });
  });
  test('a typed date must be real and not in the future', () => {
    expect(openedDateSchema.parse('')).toBeNull();
    expect(openedDateSchema.parse('2026-01-05')).toBe('2026-01-05');
    expect(openedDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(openedDateSchema.safeParse('2999-01-01').success).toBe(false);
  });
});
