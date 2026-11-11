import type { ProductCategory } from '@/domain/library';
import { packLedges } from '@/domain/shelf';

const of = (category: ProductCategory, n: number) => Array.from({ length: n }, (_, i) => ({ category, i }));
const sizes = (ledges: unknown[][]) => ledges.map((l) => l.length);

describe('packLedges', () => {
  test('fits about six lipsticks, four bottles or three body creams on a ledge', () => {
    expect(sizes(packLedges(of('makeup', 6)))).toEqual([6]);
    expect(sizes(packLedges(of('skincare', 4)))).toEqual([4]);
    expect(sizes(packLedges(of('body', 3)))).toEqual([3]);
  });

  test('18 lipsticks and pencils fill exactly three ledges', () => {
    expect(sizes(packLedges([...of('makeup', 12), ...of('tools', 6)]))).toEqual([6, 6, 6]);
  });

  test('a mixed everyday routine stands on three ledges, in order', () => {
    const items = [...of('skincare', 3), ...of('makeup', 7), ...of('fragrance', 1), ...of('makeup', 4)];
    const ledges = packLedges(items);
    expect(ledges).toHaveLength(3);
    expect(ledges.flat()).toEqual(items);
  });

  test('wide products spill onto another ledge rather than being hidden', () => {
    expect(packLedges(of('body', 18)).flat()).toHaveLength(18);
  });

  test('never leaves one product alone on the last ledge when the one above can spare one', () => {
    expect(sizes(packLedges(of('skincare', 5)))).toEqual([3, 2]);
    expect(sizes(packLedges(of('makeup', 1)))).toEqual([1]);
  });

  test('an empty shelf has no ledges', () => {
    expect(packLedges([])).toEqual([]);
  });
});
