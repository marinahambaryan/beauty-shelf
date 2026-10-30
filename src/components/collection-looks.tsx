import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import type { CollectionLook, CollectionSummary } from '@/data/collections';
import type { LibraryEntry } from '@/data/library';
import { countLabel, memberOf } from '@/domain/collections';
import type { ProductCategory } from '@/domain/library';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { Glass, Bottle } from './shelf';
import { AppText } from './ui';

/** A collection item ready to draw: its library entry when there is one, else the product it names. */
export type DisplayItem = {
  /** The collection_items row id. */
  key: string;
  entry: LibraryEntry | null;
  name: string;
  brand: string;
  variant: string | null;
  category: ProductCategory;
  uri: string | null;
  checked: boolean | null;
  quantity: number | null;
};

export function displayItems(collection: CollectionSummary, library: readonly LibraryEntry[]): DisplayItem[] {
  const byId = new Map(library.map((e) => [e.id, e]));
  return collection.items.flatMap((i) => {
    const entry =
      (i.libraryItemId ? byId.get(i.libraryItemId) : undefined) ??
      library.find((e) => memberOf([i], e)) ??
      null;
    const p = entry ?? i.product;
    if (!p) return [];
    return [
      {
        key: i.id,
        entry,
        name: p.name,
        brand: p.brand,
        variant: p.variant,
        category: p.category,
        uri: entry ? entry.imageUrl : (i.product?.imageUrl ?? null),
        checked: i.checked,
        quantity: i.quantity,
      },
    ];
  });
}

/** Mini shelves take a whole row; the other looks sit two to a row. */
export const isWide = (look: CollectionLook) => look === 'mini_shelf';

/** The look a collection is drawn in: the shelf is always a shelf, the shopping list a board. */
export function lookOf(c: Pick<CollectionSummary, 'type' | 'look'>): CollectionLook {
  if (c.type === 'shelf') return 'mini_shelf';
  if (c.type === 'shopping') return 'board';
  return c.look;
}

/**
 * A collection drawn as the thing it is: products on a mini glass shelf, peeking out of a
 * pouch, tumbled into a wire basket, or pinned on a board. Name and count below.
 */
export function CollectionCard({
  collection,
  items,
  onPress,
  look = lookOf(collection),
}: {
  collection: CollectionSummary;
  items: readonly DisplayItem[];
  onPress?: () => void;
  look?: CollectionLook;
}) {
  const label = `${collection.name}, ${lookName[look]}, ${countLabel(collection.type, collection.items)}`;
  const body = (
    <>
      {look === 'mini_shelf' ? (
        <View style={styles.wideHead}>
          <AppText variant="label" style={styles.name} numberOfLines={1}>
            {collection.name}
          </AppText>
          <AppText variant="small">{countLabel(collection.type, collection.items)}</AppText>
        </View>
      ) : null}
      <LookArt look={look} items={items} />
      {look !== 'mini_shelf' ? (
        <View style={styles.caption}>
          <AppText variant="label" style={styles.name} numberOfLines={1}>
            {collection.name}
          </AppText>
          <AppText variant="small">{countLabel(collection.type, collection.items)}</AppText>
        </View>
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.card}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const lookName: Record<CollectionLook, string> = { mini_shelf: 'mini shelf', pouch: 'pouch', basket: 'wire basket', board: 'board' };

/** Just the drawing, also used by the look picker. Decorative: the card carries the words. */
export function LookArt({ look, items }: { look: CollectionLook; items: readonly Pick<DisplayItem, 'key' | 'uri' | 'category' | 'name'>[] }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      {look === 'mini_shelf' ? (
        <MiniShelf items={items} />
      ) : look === 'pouch' ? (
        <Pouch items={items} />
      ) : look === 'basket' ? (
        <Basket items={items} />
      ) : (
        <Board items={items} />
      )}
    </View>
  );
}

type ArtItems = { items: readonly Pick<DisplayItem, 'key' | 'uri' | 'category' | 'name'>[] };

function MiniShelf({ items }: ArtItems) {
  const heights = [74, 86, 62, 90, 70];
  return (
    <View style={styles.mini}>
      <View style={styles.miniRow}>
        {items.slice(0, 5).map((it, i) => (
          <Bottle key={it.key} uri={it.uri} category={it.category} name={it.name} scale={0.7} photoHeight={heights[i] ?? 70} />
        ))}
      </View>
      <Glass />
    </View>
  );
}

const TILTS = ['-10deg', '2deg', '11deg'];

function Pouch({ items }: ArtItems) {
  const shown = items.slice(0, 3);
  return (
    <View style={styles.art}>
      <View style={styles.pouchProducts}>
        {shown.map((it, i) => (
          <View key={it.key} style={{ transform: [{ rotate: TILTS[i] ?? '0deg' }], marginHorizontal: -8 }}>
            <Bottle uri={it.uri} category={it.category} name={it.name} scale={0.8} photoHeight={[98, 114, 106][i] ?? 100} />
          </View>
        ))}
      </View>
      <View style={styles.pouchBody}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 160 112">
          <Defs>
            <Pattern id="quilt" width={22} height={22} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Line x1={0} y1={0} x2={0} y2={22} stroke="rgba(255,255,255,0.11)" strokeWidth={1.5} />
              <Line x1={0} y1={0} x2={22} y2={0} stroke="rgba(255,255,255,0.11)" strokeWidth={1.5} />
            </Pattern>
          </Defs>
          <Path d="M0 26 Q0 0 26 0 H134 Q160 0 160 26 V72 Q160 112 120 112 H40 Q0 112 0 72 Z" fill="#1E1E1E" />
          <Path d="M0 26 Q0 0 26 0 H134 Q160 0 160 26 V72 Q160 112 120 112 H40 Q0 112 0 72 Z" fill="url(#quilt)" />
        </Svg>
      </View>
      <View style={styles.zip} />
    </View>
  );
}

function Basket({ items }: ArtItems) {
  const shown = items.slice(0, 3);
  return (
    <View style={styles.art}>
      <View style={styles.basketProducts}>
        {shown.map((it, i) => (
          <View key={it.key} style={{ transform: [{ rotate: ['-9deg', '5deg', '-3deg'][i] ?? '0deg' }], marginHorizontal: -10 }}>
            <Bottle uri={it.uri} category={it.category} name={it.name} scale={0.8} photoHeight={[100, 118, 92][i] ?? 100} />
          </View>
        ))}
      </View>
      <View style={styles.basketBody}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 160 100">
          <Defs>
            <Pattern id="wire" width={13} height={13} patternUnits="userSpaceOnUse">
              <Line x1={0} y1={0} x2={0} y2={13} stroke="rgba(17,17,17,0.55)" strokeWidth={1.5} />
              <Line x1={0} y1={0} x2={13} y2={0} stroke="rgba(17,17,17,0.55)" strokeWidth={1.5} />
            </Pattern>
          </Defs>
          <Rect x={1} y={1} width={158} height={98} rx={12} fill="url(#wire)" stroke={colors.ink} strokeWidth={2} />
        </Svg>
      </View>
      <View style={styles.rim} />
      <View style={[styles.handle, { left: 10 }]} />
      <View style={[styles.handle, { right: 10 }]} />
    </View>
  );
}

function Board({ items }: ArtItems) {
  const [a, b, c] = items;
  const cell = (it: (typeof items)[number] | undefined, big: boolean) => (
    <View style={[styles.cell, big && styles.big]}>
      {it ? <Bottle uri={it.uri} category={it.category} name={it.name} scale={big ? 0.9 : 0.5} photoHeight={big ? 104 : 50} /> : null}
    </View>
  );
  return (
    <View style={styles.board}>
      {cell(a, true)}
      <View style={styles.side}>
        {cell(b, false)}
        {cell(c, false)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
  card: { flex: 1, gap: space.sm },
  wideHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md, paddingHorizontal: 2 },
  caption: { gap: 1, paddingHorizontal: 2 },
  name: { fontFamily: fonts.semibold, fontSize: 16 },
  mini: { gap: 0 },
  miniRow: { height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 6 },
  art: { height: 186 },
  pouchProducts: { position: 'absolute', left: 14, right: 14, bottom: 74, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  pouchBody: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 112 },
  zip: { position: 'absolute', left: 10, right: 10, bottom: 106, height: 6, borderRadius: 3, backgroundColor: '#3A3A3A' },
  basketProducts: { position: 'absolute', left: 16, right: 16, bottom: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  basketBody: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 },
  rim: { position: 'absolute', left: -3, right: -3, bottom: 96, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  handle: {
    position: 'absolute',
    bottom: 100,
    width: 34,
    height: 20,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: colors.ink,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  board: { height: 186, borderRadius: radius.lg, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  side: { flex: 1, gap: 2 },
  cell: { flex: 1, backgroundColor: colors.tile, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  big: { flex: 2 },
});
