import { memo } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import type { LibraryEntry } from '@/data/library';
import { ownershipLabel, usageLabel } from '@/domain/library';
import { colors, radius } from '@/theme/tokens';
import { Bottle } from './shelf';

/** What a product's status reads as: its usage when owned ("Using"), else Wishlist / Finished. */
export function statusText(entry: LibraryEntry) {
  if (entry.ownershipStatus === 'owned') return entry.usageStatus ? usageLabel[entry.usageStatus] : ownershipLabel.owned;
  return ownershipLabel[entry.ownershipStatus];
}

export const openItem = (id: string) => router.push({ pathname: '/item/[id]', params: { id } });

export function describe(entry: LibraryEntry) {
  return [
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

/** A grey photo tile in the profile's product grid. The words are for screen readers. */
export const ProductTile = memo(function ProductTile({ entry, height = 150 }: { entry: LibraryEntry; height?: number }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { height }, pressed && styles.pressed]}
      onPress={() => openItem(entry.id)}
      accessibilityRole="button"
      accessibilityLabel={describe(entry)}
    >
      <Bottle uri={entry.imageUrl} category={entry.category} name={entry.name} sub={entry.variant} photoHeight={height - 30} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  tile: {
    flex: 1,
    borderRadius: radius.md + 2,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
