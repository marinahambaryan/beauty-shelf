import { dropIndex } from '../drag-list';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

describe('dropIndex', () => {
  test('moves by whole rows, rounding to the nearest', () => {
    expect(dropIndex(2, 0, 72, 6)).toBe(2);
    expect(dropIndex(2, 40, 72, 6)).toBe(3);
    expect(dropIndex(2, -110, 72, 6)).toBe(0);
  });
  test('stays inside the list', () => {
    expect(dropIndex(0, -500, 72, 6)).toBe(0);
    expect(dropIndex(5, 900, 72, 6)).toBe(5);
  });
});
