import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { LibraryEntry } from '@/data/library';
import { ownershipLabel, usageLabel } from '@/domain/library';
import { colors, radius, space } from '@/theme/tokens';
import { AppText } from './ui';

/** Contained product image, or an initial on a tinted card — never a broken image box. */
export function ProductThumb({ uri, brand, size = 56 }: { uri: string | null; brand: string; size?: number }) {
  const frame = { width: size, height: size };
  if (uri) {
    return (
      <View style={[styles.thumb, frame]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" accessible={false} />
      </View>
    );
  }
  return (
    <View style={[styles.thumb, styles.placeholder, frame]} accessible={false}>
      <AppText variant="title" style={styles.initial}>
        {brand.trim().charAt(0).toUpperCase() || '·'}
      </AppText>
    </View>
  );
}

export const ProductRow = memo(function ProductRow({ entry }: { entry: LibraryEntry }) {
  const status =
    entry.ownershipStatus === 'owned' && entry.usageStatus
      ? `${ownershipLabel.owned} · ${usageLabel[entry.usageStatus]}`
      : ownershipLabel[entry.ownershipStatus];
  const a11y = [entry.brand, entry.name, entry.variant, status, entry.rating ? `${entry.rating} of 5 stars` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.row} accessible accessibilityLabel={a11y}>
      <ProductThumb uri={entry.imageUrl} brand={entry.brand} />
      <View style={styles.text}>
        <AppText variant="kicker" numberOfLines={1} style={styles.brand}>
          {entry.brand}
        </AppText>
        <AppText variant="heading" numberOfLines={2}>
          {entry.name}
        </AppText>
        {entry.variant ? (
          <AppText variant="caption" numberOfLines={1}>
            {entry.variant}
          </AppText>
        ) : null}
        <View style={styles.meta}>
          <AppText variant="caption" style={styles.pill}>
            {status}
          </AppText>
          {entry.source === 'personal' ? <AppText variant="caption">Personal entry</AppText> : null}
          {entry.rating ? <AppText variant="caption">{'★'.repeat(entry.rating)}</AppText> : null}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.lg, paddingVertical: space.md, alignItems: 'flex-start' },
  thumb: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.paperRaised },
  placeholder: { backgroundColor: colors.roseTint, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.rose },
  text: { flex: 1, gap: 2 },
  brand: { color: colors.inkMuted },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  pill: {
    backgroundColor: colors.taupeTint,
    color: colors.ink,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
