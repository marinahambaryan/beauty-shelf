import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';
import { Icon, type IconName } from './icons';

/**
 * The floating tab bar: a white pill of three icons — Home, Search, Profile — centered
 * above the bottom edge with a soft shadow. The current tab's icon is drawn heavier.
 */
export default function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <View pointerEvents="box-none" style={[styles.dock, { bottom: Math.max(insets.bottom, space.lg) + space.sm }]}>
        <TabList style={styles.bar}>
          <TabTrigger name="(home)" href="/" asChild>
            <TabButton icon="home" label="Home" />
          </TabTrigger>
          <TabTrigger name="search" href="/search" asChild>
            <TabButton icon="search" label="Search" />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="profile" label="Profile" />
          </TabTrigger>
        </TabList>
      </View>
    </Tabs>
  );
}

function TabButton({ icon, label, isFocused, ref, ...props }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  return (
    <Pressable
      {...props}
      ref={ref as never}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
    >
      <Icon name={icon} size={27} strokeWidth={isFocused ? 2.6 : 1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  dock: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: 6,
    paddingHorizontal: space.md,
    borderRadius: 32,
    backgroundColor: colors.ground,
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  tab: { width: 52, height: 48, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.5 },
});
