import { Pressable, StyleSheet, View } from 'react-native';

import type { CollectionLook } from '@/data/collections';
import type { LibraryEntry } from '@/data/library';
import { LOOKS, lookHint, lookLabel } from '@/domain/collections';
import { colors, radius, space } from '@/theme/tokens';
import { LookArt } from './collection-looks';
import { AppText } from './ui';

/** Four cards — mini shelf, pouch, wire basket, board — drawn with a few of your own products. */
export function LookPicker({
  value,
  onChange,
  sample,
}: {
  value: CollectionLook;
  onChange: (look: CollectionLook) => void;
  sample: readonly LibraryEntry[];
}) {
  const items = sample.slice(0, 3).map((e) => ({ key: e.id, uri: e.imageUrl, category: e.category, name: e.name }));
  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Look">
      {LOOKS.map((look) => {
        const selected = look === value;
        return (
          <Pressable
            key={look}
            onPress={() => onChange(look)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={lookLabel[look]}
            accessibilityHint={lookHint[look]}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
          >
            <View style={styles.preview}>
              <View style={look === 'mini_shelf' ? styles.miniWrap : styles.artWrap}>
                <LookArt look={look} items={items} />
              </View>
            </View>
            <AppText variant="label" style={styles.label}>
              {lookLabel[look]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  option: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.rule,
    padding: space.md,
    gap: space.sm,
  },
  selected: { borderColor: colors.ink, borderWidth: 2.5, padding: space.md - 1 },
  pressed: { opacity: 0.6 },
  preview: { height: 130, justifyContent: 'flex-end', overflow: 'hidden' },
  // The drawings are made for a full card; shrink them to fit the option.
  artWrap: { transform: [{ scale: 0.68 }], marginBottom: -30, marginHorizontal: -20 },
  miniWrap: { transform: [{ scale: 0.8 }], marginBottom: 6, marginHorizontal: -16 },
  label: { textAlign: 'center' },
});
