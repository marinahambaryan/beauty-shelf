import type { ProductEvent } from '@/domain/events';
import { dateLabel, daysUntil, expiresOn, timeLeftLabel, todayISO, type ItemPatch, type OwnershipStatus, type RepurchaseIntent, type UsageStatus } from '@/domain/library';

/** What a card needs to know about a library entry. */
export type AttentionEntry = {
  id: string;
  name: string;
  version: number;
  ownershipStatus: OwnershipStatus;
  usageStatus: UsageStatus | null;
  repurchaseIntent: RepurchaseIntent | null;
  finishedAt: string | null;
  openedOn: string | null;
  lastsMonths: number | null;
};

export type AttentionCard = {
  /** Stable for one situation: a dismissed card returns only when its situation changes. */
  id: string;
  kind: 'expires' | 'buyAgain' | 'openIt';
  itemId: string;
  itemVersion: number;
  title: string;
  body: string;
  action: { label: string; patch: ItemPatch };
  laterLabel: string;
};

/** Expiring products show from a month before their date until a month after. */
export const EXPIRY_WINDOW_DAYS = 30;
/** "Buy it again?" shows for a month after using something up. */
export const BUY_AGAIN_DAYS = 30;
/** "Just bought" means moved from Want to Have in the last week. */
export const JUST_BOUGHT_DAYS = 7;
export const MAX_CARDS = 3;

const DAY = 86_400_000;

/**
 * The needs-attention cards for Home, most urgent first, at most three:
 * something expiring, something used up you said you'd buy again, and something
 * you've started or just bought without an opening date. Pure: everything it needs
 * is passed in, so it is easy to test and costs no extra requests.
 */
export function attentionCards(
  entries: readonly AttentionEntry[],
  recentEvents: readonly ProductEvent[],
  dismissed: ReadonlySet<string>,
  now: Date = new Date(),
): AttentionCard[] {
  const today = todayISO(now);
  const expiring: { days: number; card: AttentionCard }[] = [];
  const buyAgain: AttentionCard[] = [];
  const openIt: AttentionCard[] = [];

  const justBought = new Set(
    recentEvents
      .filter(
        (e) =>
          ((e.type === 'status_changed' && e.from === 'wishlist') || e.type === 'purchased') &&
          e.to === 'owned' &&
          now.getTime() - new Date(e.at).getTime() <= JUST_BOUGHT_DAYS * DAY,
      )
      .map((e) => e.libraryItemId),
  );

  for (const e of entries) {
    if (e.ownershipStatus === 'owned') {
      const best = expiresOn(e.openedOn, e.lastsMonths);
      if (best) {
        const days = daysUntil(best, now);
        if (days <= EXPIRY_WINDOW_DAYS && days >= -EXPIRY_WINDOW_DAYS) {
          expiring.push({
            days,
            card: {
              id: `expires:${e.id}:${best}`,
              kind: 'expires',
              itemId: e.id,
              itemVersion: e.version,
              title: days < 0 ? `${e.name} has expired` : `${e.name} expires soon`,
              body: `Best before ${dateLabel(best)} · ${timeLeftLabel(days)}`,
              action: { label: 'Mark used up', patch: { ownership_status: 'finished', usage_status: null } },
              laterLabel: 'Later',
            },
          });
        }
      } else if (!e.openedOn && (justBought.has(e.id) || e.usageStatus === 'using')) {
        const bought = justBought.has(e.id);
        openIt.push({
          id: `openIt:${e.id}`,
          kind: 'openIt',
          itemId: e.id,
          itemVersion: e.version,
          title: bought ? `${e.name} is here — opened it yet?` : `When did you open ${e.name}?`,
          body: 'Add the date to get a reminder before it expires.',
          action: { label: 'Opened today', patch: { opened_on: today } },
          laterLabel: 'Skip',
        });
      }
    } else if (e.ownershipStatus === 'finished' && e.repurchaseIntent === 'yes' && e.finishedAt) {
      const since = -daysUntil(e.finishedAt, now);
      if (since >= 0 && since <= BUY_AGAIN_DAYS) {
        buyAgain.push({
          id: `buyAgain:${e.id}:${e.finishedAt}`,
          kind: 'buyAgain',
          itemId: e.id,
          itemVersion: e.version,
          title: `Used up ${e.name} — buy it again?`,
          body: 'You said you would. Want puts it on your list.',
          action: { label: 'Add to Want', patch: { ownership_status: 'wishlist', usage_status: null } },
          laterLabel: 'Not now',
        });
      }
    }
  }

  expiring.sort((a, b) => a.days - b.days);
  return [...expiring.map((x) => x.card), ...buyAgain, ...openIt].filter((c) => !dismissed.has(c.id)).slice(0, MAX_CARDS);
}
