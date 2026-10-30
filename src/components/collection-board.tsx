import { Pressable, StyleSheet, View } from 'react-native';

import type { CollectionSummary } from '@/data/collections';
import type { LibraryEntry } from '@/data/library';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Bottle } from './shelf';
import { AppText } from './ui';

/** The library entries a collection's items point at, in order. Items not in the library are skipped. */
export function entriesOf(collection: CollectionSummary, library: readonly LibraryEntry[]): LibraryEntry[] {
  const byId = new Map(library.map((e) => [e.id, e]));
  const byVariant = new Map(library.filter((e) => e.variantId).map((e) => [e.variantId, e]));
  const byPersonal = new Map(library.filter((e) => e.personalProductId).map((e) => [e.personalProductId, e]));
  return collection.items.flatMap((i) => {
    const e =
      (i.libraryItemId && byId.get(i.libraryItemId)) ||
      (i.variantId && byVariant.get(i.variantId)) ||
      (i.personalProductId && byPersonal.get(i.personalProductId));
    return e ? [e] : [];
  });
}

const count = (n: number) => (n === 1 ? '1 product' : `${n} products`);

/** A Pinterest-style board: one big photo and two small ones, the name and a count below. */
export function CollectionBoard({
  collection,
  entries,
  onPress,
}: {
  collection: CollectionSummary;
  entries: readonly LibraryEntry[];
  onPress: () => void;
}) {
  const [a, b, c] = entries;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${collection.name}, ${count(collection.itemCount)}`}
      style={({ pressed }) => [styles.board, pressed && styles.pressed]}
    >
      <View style={styles.cover}>
        <Cell entry={a} big />
        <View style={styles.side}>
          <Cell entry={b} />
          <Cell entry={c} />
        </View>
      </View>
      <View style={styles.text}>
        <AppText variant="label" style={styles.name} numberOfLines={1}>
          {collection.name}
        </AppText>
        <AppText variant="small">{count(collection.itemCount)}</AppText>
      </View>
    </Pressable>
  );
}

function Cell({ entry, big = false }: { entry: LibraryEntry | undefined; big?: boolean }) {
  return (
    <View style={[styles.cell, big && styles.big]}>
      {entry ? <Bottle uri={entry.imageUrl} category={entry.category} name={entry.name} scale={big ? 0.9 : 0.5} photoHeight={big ? 96 : 46} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  board: { flex: 1, gap: space.sm },
  cover: { height: 124, borderRadius: radius.lg, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  side: { flex: 1, gap: 2 },
  cell: { flex: 1, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  big: { flex: 2 },
  text: { gap: 1, paddingHorizontal: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 16 },
});
