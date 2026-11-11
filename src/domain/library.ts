import type { Database } from '@/data/database.types';

type Enums = Database['public']['Enums'];
export type OwnershipStatus = Enums['ownership_status'];
export type UsageStatus = Enums['usage_status'];
export type RepurchaseIntent = Enums['repurchase_intent'];
export type ProductCategory = Enums['product_category'];

/** In the order a product lives through them: want it, have it, used it up. */
export const OWNERSHIP_STATUSES: readonly OwnershipStatus[] = ['wishlist', 'owned', 'finished'];
export const USAGE_STATUSES: readonly UsageStatus[] = ['unopened', 'using', 'paused'];
export const CATEGORIES: readonly ProductCategory[] = [
  'makeup', 'skincare', 'fragrance', 'haircare', 'body', 'tools', 'other',
];

export const ownershipLabel: Record<OwnershipStatus, string> = {
  wishlist: 'Want',
  owned: 'Have',
  finished: 'Used up',
};
export const usageLabel: Record<UsageStatus, string> = {
  unopened: 'Unopened',
  using: 'Using',
  paused: 'Paused',
};
export const categoryLabel: Record<ProductCategory, string> = {
  makeup: 'Makeup',
  skincare: 'Skincare',
  fragrance: 'Fragrance',
  haircare: 'Haircare',
  body: 'Body',
  tools: 'Tools',
  other: 'Other',
};

/** Library system views. "all" is not a status — it is the union. */
export type LibraryView = 'all' | OwnershipStatus;
export const LIBRARY_VIEWS: readonly LibraryView[] = ['all', 'wishlist', 'owned', 'finished'];
export const libraryViewLabel: Record<LibraryView, string> = { all: 'All', ...ownershipLabel };

export type StatusPatch = {
  ownership_status: OwnershipStatus;
  usage_status: UsageStatus | null;
  finished_at?: string | null;
};

/**
 * Client-side mirror of the database status rules (library_items_status_rules trigger),
 * used to build the update payload and an optimistic preview. The database stays the
 * source of truth; this only avoids sending combinations it would rewrite anyway.
 * Notes, rating and repurchase intent are deliberately untouched by any transition.
 */
export function statusPatch(
  next: OwnershipStatus,
  current: { ownership_status: OwnershipStatus; usage_status: UsageStatus | null },
  requestedUsage?: UsageStatus | null,
): StatusPatch {
  if (next !== 'owned') return { ownership_status: next, usage_status: null };
  const usage =
    requestedUsage !== undefined
      ? requestedUsage
      : current.ownership_status === 'owned'
        ? current.usage_status
        : null;
  return { ownership_status: 'owned', usage_status: usage };
}

/** Builds the human label for a product + variant, skipping meaningless default variants. */
export function productTitle(p: { brand: string; name: string; variant?: string | null }): {
  brand: string;
  name: string;
  variant: string | null;
} {
  const variant = p.variant?.trim() ? p.variant.trim() : null;
  return { brand: p.brand.trim(), name: p.name.trim(), variant };
}

export type LibrarySort = 'recent' | 'name' | 'brand' | 'rating';
export const librarySortLabel: Record<LibrarySort, string> = {
  recent: 'Recently updated',
  name: 'Product name',
  brand: 'Brand',
  rating: 'Rating',
};

type Sortable = { name: string; brand: string; rating: number | null; updatedAt: string };

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Stable sort for library rows. Unrated items sort after rated ones. */
export function sortLibrary<T extends Sortable>(items: readonly T[], sort: LibrarySort): T[] {
  const byName = (a: T, b: T) => collator.compare(a.name, b.name) || collator.compare(a.brand, b.brand);
  const copy = [...items];
  switch (sort) {
    case 'name':
      return copy.sort(byName);
    case 'brand':
      return copy.sort((a, b) => collator.compare(a.brand, b.brand) || byName(a, b));
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byName(a, b));
    case 'recent':
    default:
      return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || byName(a, b));
  }
}

/** Case/diacritic-insensitive local filter for an already-loaded library. */
export function matchesQuery(item: { name: string; brand: string; variant?: string | null }, query: string) {
  const norm = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const haystack = norm(`${item.brand} ${item.name} ${item.variant ?? ''}`);
  return norm(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export const REPURCHASE_INTENTS: readonly RepurchaseIntent[] = ['yes', 'unsure', 'no'];
export const repurchaseLabel: Record<RepurchaseIntent, string> = { yes: 'Yes', unsure: 'Not sure', no: 'No' };

/** The editable experience of one library item, as the editor holds it. */
export type ItemDraft = {
  ownershipStatus: OwnershipStatus;
  usageStatus: UsageStatus | null;
  rating: number | null;
  repurchaseIntent: RepurchaseIntent | null;
  /** Already validated: YYYY-MM-DD or null. */
  finishedAt: string | null;
  /** When it was opened, YYYY-MM-DD or null. */
  openedOn: string | null;
  /** How long it lasts after opening (the open-jar symbol), in months. */
  lastsMonths: number | null;
  notes: string | null;
};

export type ItemPatch = Partial<{
  ownership_status: OwnershipStatus;
  usage_status: UsageStatus | null;
  rating: number | null;
  repurchase_intent: RepurchaseIntent | null;
  finished_at: string | null;
  opened_on: string | null;
  lasts_months: number | null;
  notes: string | null;
}>;

/**
 * The columns that actually changed between the saved item and the draft, applying the
 * same status rules as the database (usage only while Owned). An empty patch means
 * there is nothing to save. A finished date only travels while the item is Finished:
 * leaving Finished keeps the stored date, as the database does.
 */
export function itemPatch(saved: ItemDraft, draft: ItemDraft): ItemPatch {
  const patch: ItemPatch = {};
  const usage = draft.ownershipStatus === 'owned' ? draft.usageStatus : null;
  if (draft.ownershipStatus !== saved.ownershipStatus) patch.ownership_status = draft.ownershipStatus;
  if (usage !== saved.usageStatus) patch.usage_status = usage;
  if (draft.rating !== saved.rating) patch.rating = draft.rating;
  if (draft.repurchaseIntent !== saved.repurchaseIntent) patch.repurchase_intent = draft.repurchaseIntent;
  if (draft.ownershipStatus === 'finished' && draft.finishedAt !== saved.finishedAt) patch.finished_at = draft.finishedAt;
  if (draft.openedOn !== saved.openedOn) patch.opened_on = draft.openedOn;
  if (draft.lastsMonths !== saved.lastsMonths) patch.lasts_months = draft.lastsMonths;
  if ((draft.notes ?? null) !== (saved.notes ?? null)) patch.notes = draft.notes;
  return patch;
}

/** What a shade/size picker should call its choices, from what the variants carry. */
export function variantKind(variants: readonly { shadeName: string | null; sizeLabel: string | null }[]): 'Shade' | 'Size' {
  return variants.some((v) => v.shadeName) ? 'Shade' : 'Size';
}

/** Today in the device's time zone, as YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The periods printed in the open-jar symbol on packaging, in months. */
export const LASTS_MONTHS = [3, 6, 12, 18, 24] as const;

const isoOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * Best before: the opening date plus the months it lasts, as YYYY-MM-DD. A day that
 * doesn't exist in the target month falls back to that month's last day (31 Aug + 6 → 28 Feb).
 */
export function expiresOn(openedOn: string | null, lastsMonths: number | null): string | null {
  if (!openedOn || !lastsMonths) return null;
  const [y, m, d] = openedOn.split('-').map(Number) as [number, number, number];
  const total = m - 1 + lastsMonths;
  const ty = y + Math.floor(total / 12);
  const tm = total % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return isoOf(ty, tm, Math.min(d, last));
}

/** Whole days from today until a YYYY-MM-DD date; negative once it has passed. */
export function daysUntil(date: string, now = new Date()): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

/** "3 weeks left", "5 days left", "expired 2 days ago" — for a best-before date. */
export function timeLeftLabel(days: number): string {
  if (days < 0) return days === -1 ? 'expired yesterday' : `expired ${-days} days ago`;
  if (days === 0) return 'expires today';
  if (days === 1) return '1 day left';
  if (days < 14) return `${days} days left`;
  if (days < 60) return `${Math.round(days / 7)} weeks left`;
  return `${Math.round(days / 30)} months left`;
}

/** A YYYY-MM-DD date as people read it: "2 Dec 2026". */
export function dateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
