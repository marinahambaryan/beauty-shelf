import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';
import { AppText } from './ui';

/**
 * Five label squares, filled up to the rating: ■ ■ ■ □ □  3 / 5.
 * Tapping the current rating again clears it. One adjustable control for screen readers.
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
        <Pressable
          key={n}
          onPress={() => set(n)}
          hitSlop={4}
          style={({ pressed }) => [styles.box, value !== null && n <= value && styles.filled, pressed && styles.pressed]}
        />
      ))}
      <AppText variant="label" style={styles.value}>
        {value ? `${value} / 5` : 'Not rated'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  box: { width: 30, height: 30, borderRadius: 3, borderWidth: 1.5, borderColor: colors.ink },
  filled: { backgroundColor: colors.ink },
  pressed: { opacity: 0.5 },
  value: { marginLeft: space.sm, color: colors.inkSoft },
});
