import type { Database } from '@/data/database.types';
import { ownershipLabel, type OwnershipStatus } from '@/domain/library';

export type ProductEventType = Database['public']['Enums']['product_event_type'];

export type ProductEvent = {
  id: string;
  libraryItemId: string;
  type: ProductEventType;
  from: OwnershipStatus | null;
  to: OwnershipStatus | null;
  /** ISO timestamp. */
  at: string;
};

const place = (s: OwnershipStatus | null) => (s ? ownershipLabel[s] : 'your library');

/** One line of recent activity, in the app's words: "Moved Rose Balm from Want to Have". */
export function describeEvent(e: Pick<ProductEvent, 'type' | 'from' | 'to'>, name: string): string {
  switch (e.type) {
    case 'added':
      return `Added ${name} to ${place(e.to)}`;
    case 'finished':
      return `Used up ${name}`;
    case 'repurchased':
      return `Bought ${name} again`;
    case 'purchased':
      return `Bought ${name}`;
    case 'status_changed':
      return `Moved ${name} from ${place(e.from)} to ${place(e.to)}`;
  }
}

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** When, as people say it: "today", "yesterday", "3 days ago", then a date ("4 Nov"). */
export function whenLabel(at: string, now: Date = new Date()): string {
  const then = new Date(at);
  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const sameYear = then.getFullYear() === now.getFullYear();
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}
