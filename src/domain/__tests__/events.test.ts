import { describeEvent, whenLabel } from '@/domain/events';

describe('describeEvent', () => {
  test('speaks in Want / Have / Used up', () => {
    expect(describeEvent({ type: 'added', from: null, to: 'owned' }, 'Serum C')).toBe('Added Serum C to Have');
    expect(describeEvent({ type: 'status_changed', from: 'wishlist', to: 'owned' }, 'Rose Balm')).toBe(
      'Moved Rose Balm from Want to Have',
    );
    expect(describeEvent({ type: 'finished', from: 'owned', to: 'finished' }, 'Night Oil')).toBe('Used up Night Oil');
    expect(describeEvent({ type: 'repurchased', from: 'finished', to: 'owned' }, 'Night Oil')).toBe('Bought Night Oil again');
    expect(describeEvent({ type: 'purchased', from: null, to: 'owned' }, 'Lip Oil')).toBe('Bought Lip Oil');
  });
});

describe('whenLabel', () => {
  const now = new Date(2026, 10, 11, 21, 0);
  test('today, yesterday, days ago, then a date', () => {
    expect(whenLabel(new Date(2026, 10, 11, 8, 0).toISOString(), now)).toBe('today');
    expect(whenLabel(new Date(2026, 10, 10, 23, 0).toISOString(), now)).toBe('yesterday');
    expect(whenLabel(new Date(2026, 10, 8, 12, 0).toISOString(), now)).toBe('3 days ago');
    expect(whenLabel(new Date(2026, 10, 1, 12, 0).toISOString(), now)).toBe('1 Nov');
    expect(whenLabel(new Date(2025, 11, 2, 12, 0).toISOString(), now)).toBe('2 Dec 2025');
  });
});
