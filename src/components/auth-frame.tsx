import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

/** Signed-out screens: the masthead and form, centred in a readable column. */
export function AuthFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl },
        ]}
      >
        <View style={styles.inner}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ground },
  content: { flexGrow: 1, paddingHorizontal: space.xl },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: space.xl },
});
