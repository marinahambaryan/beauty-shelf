import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, space, type } from '@/theme/tokens';

/**
 * The Apothecary tab bar: four mono words on the ground colour, the current one in
 * brackets — "[HOME]  LIBRARY  COLLECTIONS  PROFILE". Same on every platform.
 */
export default function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <TabTrigger name="(home)" href="/" asChild>
          <TabButton>Home</TabButton>
        </TabTrigger>
        <TabTrigger name="library" href="/library" asChild>
          <TabButton>Library</TabButton>
        </TabTrigger>
        <TabTrigger name="collections" href="/collections" asChild>
          <TabButton>Collections</TabButton>
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton>Profile</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ref, ...props }: TabTriggerSlotProps) {
  const label = typeof children === 'string' ? children : '';
  return (
    <Pressable
      {...props}
      ref={ref as never}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
    >
      <Text style={[styles.label, isFocused && styles.labelFocused]} numberOfLines={1} adjustsFontSizeToFit>
        {isFocused ? `[${label}]` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  bar: { flexDirection: 'row', backgroundColor: colors.ground, paddingTop: space.sm, paddingHorizontal: space.sm },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.small, letterSpacing: 0.3 },
  labelFocused: { color: colors.ink, fontFamily: fonts.monoMedium },
});
