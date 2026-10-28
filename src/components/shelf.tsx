import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ProductCategory } from '@/domain/library';
import { colors, fonts, space } from '@/theme/tokens';

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
      <View style={styles.glass} />
    </View>
  );
}

const styles = StyleSheet.create({
  bottle: { alignItems: 'center' },
  body: {
    backgroundColor: colors.bottle,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.07)',
  },
  label: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    backgroundColor: colors.paper,
    gap: 2,
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.06)',
  },
  labelText: { fontFamily: fonts.mono, lineHeight: 7, letterSpacing: 0.2, color: colors.ink, textTransform: 'uppercase' },
  labelRule: { height: 1, backgroundColor: 'rgba(26, 26, 26, 0.33)' },
  labelSub: { fontFamily: fonts.mono, lineHeight: 6, color: colors.inkSoft, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: space.sm - 2 },
  // The glass edge and its pale reflection below, as drawn in the mockup.
  glass: { height: 5, backgroundColor: colors.glass, borderRadius: 1, boxShadow: `0 6px 0 ${colors.glassShadow}` },
});
