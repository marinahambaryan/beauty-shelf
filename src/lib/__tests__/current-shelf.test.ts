import { pickShelf } from '../current-shelf';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('pickShelf', () => {
  const shelves = [{ id: 'a' }, { id: 'b' }];
  test('the remembered shelf when it still exists', () => {
    expect(pickShelf(shelves, 'b')?.id).toBe('b');
  });
  test('otherwise the first shelf, or none', () => {
    expect(pickShelf(shelves, 'gone')?.id).toBe('a');
    expect(pickShelf(shelves, null)?.id).toBe('a');
    expect(pickShelf([], 'a')).toBeNull();
  });
});
