import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';
import { Icon } from './icons';
import { AppText } from './ui';

/**
 * Five stars, filled up to the rating. Tapping the current rating again clears it.
 * One adjustable control for screen readers.
 */
export function RatingInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const set = (n: number) => onChange(n === value ? null : n);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Rating"
      accessibilityValue={{ text: value ? `${value} of 5` : 'Not rated' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const current = value ?? 0;
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(5, current + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange(current <= 1 ? null : current - 1);
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => set(n)} hitSlop={4} style={({ pressed }) => [styles.star, pressed && styles.pressed]}>
          <Icon name="star" size={28} filled={value !== null && n <= value} />
        </Pressable>
      ))}
      <AppText variant="bodySoft" style={styles.value}>
        {value ? `${value} of 5` : 'Not rated'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
  star: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
  value: { marginLeft: space.sm, color: colors.inkSoft },
});
