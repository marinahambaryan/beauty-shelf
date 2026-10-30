import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { ProductCategory } from '@/domain/library';
import { colors, fonts, space, type } from '@/theme/tokens';

type Shape = { w: number; h: number; r: [number, number, number, number]; capW: number; capH: number; capR: number };

/** Container proportions per category (from the Apothecary mockups): lipstick, dropper, flacon, tube, tub, brush, box. */
const SHAPES: Record<ProductCategory, Shape> = {
  makeup: { w: 20, h: 54, r: [2, 2, 2, 2], capW: 20, capH: 22, capR: 3 },
  skincare: { w: 40, h: 64, r: [8, 8, 6, 6], capW: 12, capH: 22, capR: 3 },
  fragrance: { w: 52, h: 62, r: [10, 10, 10, 10], capW: 26, capH: 20, capR: 3 },
  haircare: { w: 34, h: 70, r: [14, 14, 6, 6], capW: 16, capH: 14, capR: 3 },
  body: { w: 62, h: 30, r: [6, 6, 6, 6], capW: 62, capH: 12, capR: 3 },
  tools: { w: 14, h: 72, r: [7, 7, 3, 3], capW: 22, capH: 24, capR: 11 },
  other: { w: 38, h: 56, r: [4, 4, 4, 4], capW: 24, capH: 12, capR: 3 },
};

/**
 * A product on the shelf: its photo when there is one. Until then, a plain neutral
 * container shaped by its category — black cap, stone body — with a paper label printed
 * with the product's name and shade. No invented colours: it only stands in for the photo.
 * Decorative for screen readers; the caller carries the words.
 */
export function Bottle({
  uri,
  category,
  name,
  sub,
  scale = 1,
  photoHeight = 96,
}: {
  uri: string | null;
  category: ProductCategory;
  name: string;
  sub?: string | null;
  scale?: number;
  photoHeight?: number;
}) {
  if (uri) {
    return (
      <View style={{ width: photoHeight * 0.7, height: photoHeight }} accessible={false}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
      </View>
    );
  }
  const s = SHAPES[category];
  const k = (n: number) => Math.round(n * scale);
  const labelW = Math.max(k(s.w) - k(8), k(14));
  // Print only what fits whole, like a real label: the first word of the name, then the shade or size.
  const fits = (text: string, size: number) => text.length * size * 0.62 <= labelW - 6;
  const word = name.trim().split(/\s+/)[0] ?? '';
  const title = fits(word, 6 * scale) ? word : '';
  const subtitle = sub && fits(sub, 5 * scale) ? sub : '';
  return (
    <View style={styles.bottle} accessible={false} importantForAccessibility="no-hide-descendants">
      <View
        style={{
          width: k(s.capW),
          height: k(s.capH),
          backgroundColor: colors.ink,
          borderTopLeftRadius: k(s.capR),
          borderTopRightRadius: k(s.capR),
          borderBottomLeftRadius: 1,
          borderBottomRightRadius: 1,
        }}
      />
      <View
        style={[
          styles.body,
          {
            width: k(s.w),
            height: k(s.h),
            borderTopLeftRadius: k(s.r[0]),
            borderTopRightRadius: k(s.r[1]),
            borderBottomRightRadius: k(s.r[2]),
            borderBottomLeftRadius: k(s.r[3]),
          },
        ]}
      >
        {labelW >= 14 && k(s.h) >= 24 ? (
          <View style={[styles.label, { width: labelW }]}>
            <Text style={[styles.labelText, { fontSize: 6 * scale }]} numberOfLines={1} ellipsizeMode="clip">
              {title}
            </Text>
            <View style={styles.labelRule} />
            <Text style={[styles.labelSub, { fontSize: 5 * scale }]} numberOfLines={1} ellipsizeMode="clip">
              {subtitle}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Items standing on a pale glass shelf, bottoms aligned on its edge. */
export function GlassShelf({ children, height = 118 }: { children?: ReactNode; height?: number }) {
  return (
    <View>
      <View style={[styles.row, { height }]}>{children}</View>
      <Glass />
    </View>
  );
}

/** The glass edge and its pale reflection below, as drawn in the design. */
export function Glass() {
  return (
    <View accessible={false}>
      <View style={styles.glass} />
      <View style={styles.glassShadow} />
    </View>
  );
}

export type ShelfProduct = {
  key: string;
  uri: string | null;
  category: ProductCategory;
  name: string;
  sub?: string | null;
  /** Handwriting on the glass above the product. */
  note?: string | null;
  /** What a screen reader says for the product. */
  label: string;
  onPress?: () => void;
};

/** Up to this many products stand on one ledge. */
export const PER_LEDGE = 4;

/**
 * One glass ledge of products, each with its handwritten note above it and a little
 * arrow pointing down at it. Notes alternate tilt and height so neighbours don't collide.
 */
export function ShelfLedge({ products }: { products: readonly ShelfProduct[] }) {
  const [width, setWidth] = useState(0);
  const n = Math.max(products.length, 1);
  const hasNotes = products.some((p) => p.note);
  const photoHeight = n >= 4 ? 112 : n === 3 ? 132 : 146;
  const column = width / n;
  const noteWidth = Math.min(column + 28, 150);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {hasNotes ? <View style={styles.noteZone} /> : <View style={styles.noNotes} />}
      <View style={[styles.row, { height: photoHeight + 6 }]}>
        {products.map((p) => (
          <Pressable
            key={p.key}
            onPress={p.onPress}
            disabled={!p.onPress}
            accessibilityRole={p.onPress ? 'button' : undefined}
            accessibilityLabel={p.note ? `${p.label}. Note: ${p.note}` : p.label}
            style={({ pressed }) => [styles.column, pressed && styles.pressed]}
          >
            <Bottle uri={p.uri} category={p.category} name={p.name} sub={p.sub} photoHeight={photoHeight} />
          </Pressable>
        ))}
      </View>
      <Glass />
      {width > 0
        ? products.map((p, i) => {
            if (!p.note) return null;
            const center = column * i + column / 2;
            const left = Math.min(Math.max(center - noteWidth / 2, -4), width - noteWidth + 4);
            const odd = i % 2 === 1;
            return (
              <View
                key={`note-${p.key}`}
                pointerEvents="none"
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={[styles.note, { left, width: noteWidth, top: odd ? 16 : 0 }]}
              >
                <Text style={[styles.noteText, { transform: [{ rotate: odd ? '3deg' : '-4deg' }] }]}>
                  {p.note}
                </Text>
                <Svg
                  width={30}
                  height={odd ? 24 : 32}
                  viewBox="0 0 40 44"
                  style={{ transform: [{ scaleX: odd ? -1 : 1 }] }}
                >
                  <Path
                    d="M6 3c10 4 18 14 19 33M19 30l6 7 4-8"
                    stroke={colors.ink}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bottle: { alignItems: 'center' },
  body: {
    backgroundColor: colors.bottle,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.06)',
  },
  label: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    backgroundColor: colors.ground,
    gap: 2,
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.06)',
  },
  labelText: { fontFamily: fonts.semibold, lineHeight: 7, color: colors.ink },
  labelRule: { height: 1, backgroundColor: 'rgba(17, 17, 17, 0.25)' },
  labelSub: { fontFamily: fonts.regular, lineHeight: 6, color: colors.inkSoft },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: space.xs },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  pressed: { opacity: 0.6 },
  glass: { height: 5, backgroundColor: colors.glass, borderRadius: 1, marginTop: 1 },
  glassShadow: { height: 5, backgroundColor: colors.glassShadow },
  noteZone: { height: 78 },
  noNotes: { height: space.lg },
  note: { position: 'absolute', alignItems: 'center' },
  // Tilted handwriting: let tall letters rise past the line box instead of being clipped.
  noteText: { ...type.hand, textAlign: 'center', alignSelf: 'stretch', overflow: 'visible', paddingVertical: 4 },
});
