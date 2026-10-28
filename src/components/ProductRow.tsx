import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LibraryEntry } from '@/data/library';
import { categoryLabel, ownershipLabel, usageLabel } from '@/domain/library';
import { colors, radius, space, twoDigit, type } from '@/theme/tokens';
import { Bottle } from './shelf';

/** What a product's status reads as: its usage when owned ("Using"), else Wishlist / Finished. */
export function statusText(entry: LibraryEntry) {
  if (entry.ownershipStatus === 'owned') return entry.usageStatus ? usageLabel[entry.usageStatus] : ownershipLabel.owned;
  return ownershipLabel[entry.ownershipStatus];
}

function describe(entry: LibraryEntry, n?: number) {
  return [
    n ? `Number ${n}` : null,
    entry.name,
    entry.brand,
    entry.variant,
    ownershipLabel[entry.ownershipStatus],
    entry.ownershipStatus === 'owned' && entry.usageStatus ? usageLabel[entry.usageStatus] : null,
    entry.source === 'personal' ? 'Added manually' : null,
    entry.rating ? `${entry.rating} of 5 stars` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/** A Library card: number and status on top, the product in the middle, name and shade below. */
export const ProductCard = memo(function ProductCard({ entry, n }: { entry: LibraryEntry; n: number }) {
  return (
    <View style={styles.card} accessible accessibilityLabel={describe(entry, n)}>
      <View style={styles.cardTop}>
        <Text style={type.small}>{twoDigit(n)}</Text>
        <Text style={type.small} numberOfLines={1}>
          {statusText(entry)}
        </Text>
      </View>
      <View style={styles.cardArt}>
        <Bottle
          uri={entry.imageUrl}
          category={entry.category}
          name={entry.name}
          sub={entry.variant ?? categoryLabel[entry.category]}
          photoHeight={96}
        />
      </View>
      <View style={styles.cardText}>
        <Text style={type.name} numberOfLines={2}>
          {entry.name}
        </Text>
        <Text style={type.small} numberOfLines={1}>
          {entry.variant ?? entry.brand}
        </Text>
      </View>
    </View>
  );
});

/** A numbered index line on Home: "01  MATTE REVOLUTION LIPSTICK — PILLOW TALK ........ USING". */
export function IndexRow({ entry, n }: { entry: LibraryEntry; n: number }) {
  const name = entry.variant ? `${entry.name} — ${entry.variant}` : entry.name;
  return (
    <View style={styles.index} accessible accessibilityLabel={describe(entry)}>
      <Text style={[type.label, styles.indexText]} numberOfLines={1}>
        {twoDigit(n)}
        {'  '}
        {name}
      </Text>
      <Text style={[type.label, styles.soft]}>{statusText(entry)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  soft: { color: colors.inkSoft },
  card: {
    flex: 1,
    height: 214,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    justifyContent: 'space-between',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  cardArt: { height: 100, alignItems: 'center', justifyContent: 'flex-end' },
  cardText: { gap: 2 },
  index: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderBottomWidth: 1,
    borderColor: colors.rule,
  },
  indexText: { flex: 1 },
});
