import { pushRecent } from '../recent-searches';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

describe('pushRecent', () => {
  test('puts the newest search first and drops a repeat, ignoring case', () => {
    expect(pushRecent(['round lab', 'anua'], 'Anua')).toEqual(['Anua', 'round lab']);
  });
  test('ignores blank searches and trims', () => {
    expect(pushRecent(['a'], '   ')).toEqual(['a']);
    expect(pushRecent([], '  toner ')).toEqual(['toner']);
  });
  test('keeps only the newest few', () => {
    expect(pushRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});
