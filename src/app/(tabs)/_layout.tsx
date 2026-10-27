import { Tabs } from 'expo-router';
import { StyleSheet, Text, type ColorValue } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

// Text glyph "icons" keep the tab bar dependency-free until the icon set is chosen (Milestone 5).
const glyph = (char: string) =>
  function TabGlyph({ color }: { color: ColorValue }) {
    return (
      <Text style={[styles.glyph, { color }]} accessible={false}>
        {char}
      </Text>
    );
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.paperRaised, borderTopColor: colors.rule },
        tabBarLabelStyle: { fontFamily: fonts.sans, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: glyph('◐') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: glyph('▤') }} />
      <Tabs.Screen name="collections" options={{ title: 'Collections', tabBarIcon: glyph('❖') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: glyph('○') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({ glyph: { fontSize: 20, lineHeight: 24 } });
