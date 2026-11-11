import { canSend } from '../submissions';

describe('canSend', () => {
  it('allows a product that was never sent', () => {
    expect(canSend(null)).toBe(true);
  });

  it('allows sending again after a rejection', () => {
    expect(canSend({ status: 'rejected', reviewNote: 'Add the full name.' })).toBe(true);
  });

  it('waits while one is under review, and stops once it is in the catalogue', () => {
    expect(canSend({ status: 'pending', reviewNote: null })).toBe(false);
    expect(canSend({ status: 'approved', reviewNote: null })).toBe(false);
  });
});
