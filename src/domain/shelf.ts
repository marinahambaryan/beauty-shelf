import type { ProductCategory } from '@/domain/library';

/**
 * How wide each kind of container stands on the glass, in points (the drawn bottle's
 * body; see `SHAPES` in components/shelf.tsx). A lipstick is narrow, a body cream wide.
 */
export const bottleWidth: Record<ProductCategory, number> = {
  makeup: 20,
  skincare: 40,
  fragrance: 52,
  haircare: 34,
  body: 62,
  tools: 14,
  other: 38,
};

/** Breathing room each product gets on either side, in points. */
export const LEDGE_GAP = 30;
/** How much room one glass ledge offers: about six lipsticks, four bottles, three body creams. */
export const LEDGE_ROOM = 300;

export const footprint = (category: ProductCategory) => bottleWidth[category] + LEDGE_GAP;

/**
 * Puts products onto ledges in order, filling each by how much room they take rather
 * than a fixed count, so small makeup packs tighter than bottles. A full shelf of 18
 * usually needs three ledges; very wide products can spill onto a fourth rather than
 * being hidden. The last ledge never holds a lone product when the one above can spare one.
 */
export function packLedges<T extends { category: ProductCategory }>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  let used = LEDGE_ROOM;
  for (const item of items) {
    const w = footprint(item.category);
    if (used + w > LEDGE_ROOM) {
      out.push([]);
      used = 0;
    }
    (out[out.length - 1] as T[]).push(item);
    used += w;
  }
  const last = out[out.length - 1];
  const prev = out[out.length - 2];
  if (last && prev && last.length === 1 && prev.length > 1) last.unshift(prev.pop() as T);
  return out;
}
