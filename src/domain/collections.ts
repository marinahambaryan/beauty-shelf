import type { CollectionLook, CollectionRef, CollectionType, NewItem } from '@/data/collections';

/** The looks you can give a collection, in the order the picker shows them. */
export const LOOKS: readonly CollectionLook[] = ['mini_shelf', 'pouch', 'basket', 'board'];

export const lookLabel: Record<CollectionLook, string> = {
  mini_shelf: 'Mini shelf',
  pouch: 'Pouch',
  basket: 'Wire basket',
  board: 'Board',
};

export const lookHint: Record<CollectionLook, string> = {
  mini_shelf: 'A small glass shelf, products standing in a row',
  pouch: 'A zip pouch, products peeking out of the top',
  basket: 'A wire basket, everything tumbled in together',
  board: 'A plain photo board',
};

type Entry = { id: string; variantId: string | null; personalProductId: string | null };

/**
 * How a library entry goes into a collection. Shelves and custom collections hold the
 * entry itself; the shopping list holds the product, which may not stay in the library.
 */
export function refFor(entry: Entry, type: CollectionType): NewItem | null {
  if (type !== 'shopping') return { libraryItemId: entry.id };
  if (entry.variantId) return { variantId: entry.variantId };
  if (entry.personalProductId) return { personalProductId: entry.personalProductId };
  return null;
}

/** The collection's item for this library entry, whichever way it was added. */
export function memberOf(items: readonly CollectionRef[], entry: Entry): CollectionRef | undefined {
  return items.find(
    (i) =>
      i.libraryItemId === entry.id ||
      (entry.variantId !== null && i.variantId === entry.variantId) ||
      (entry.personalProductId !== null && i.personalProductId === entry.personalProductId),
  );
}

/** Moves one item and returns the full new order of item ids. */
export function moved(ids: readonly string[], index: number, by: -1 | 1): string[] {
  const to = index + by;
  if (index < 0 || index >= ids.length || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  const [id] = next.splice(index, 1);
  next.splice(to, 0, id as string);
  return next;
}

/** "3 products" / "2 to buy". */
export function countLabel(type: CollectionType, items: readonly Pick<CollectionRef, 'checked'>[]) {
  if (type === 'shopping') {
    const open = items.filter((i) => !i.checked).length;
    return open === 1 ? '1 to buy' : `${open} to buy`;
  }
  return items.length === 1 ? '1 product' : `${items.length} products`;
}
