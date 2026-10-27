import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space, touchTarget, type } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
type Variant = keyof typeof type;

export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const role = variant === 'display' || variant === 'title' ? 'header' : undefined;
  return <Text accessibilityRole={role} maxFontSizeMultiplier={2} style={[type[variant], style]} {...rest} />;
}

/** Small-caps magazine kicker, e.g. "Your library · Vol. 1". */
export function Kicker({ children }: { children: ReactNode }) {
  return <AppText variant="kicker">{children}</AppText>;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenContent, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Rule() {
  return <View style={styles.rule} />;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.onAccent : colors.ink} />
      ) : (
        <Text maxFontSizeMultiplier={1.6} style={[styles.buttonLabel, buttonLabelStyles[variant]]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  hint,
  style,
  ...rest
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  {
    return (
      <View style={styles.field}>
        <AppText variant="caption" style={styles.fieldLabel}>
          {label}
        </AppText>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.inkFaint}
          style={[styles.input, error ? styles.inputError : null, style]}
          {...rest}
        />
        {error ? (
          <AppText variant="caption" style={styles.errorText} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : hint ? (
          <AppText variant="caption">{hint}</AppText>
        ) : null}
      </View>
    );
  }
}

/** Inline, non-modal message for form-level errors and notices. */
export function Notice({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.notice, tone === 'error' ? styles.noticeError : styles.noticeInfo]}
    >
      <AppText variant="body" style={tone === 'error' ? styles.errorText : null}>
        {children}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Loading / error / empty states
// ---------------------------------------------------------------------------
export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.state} accessibilityLabel={label} accessible>
      <ActivityIndicator color={colors.rose} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <AppText variant="title" style={styles.center}>
        Couldn’t load this
      </AppText>
      <AppText variant="body" style={[styles.center, styles.muted]}>
        {message}
      </AppText>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  kicker,
  title,
  body,
  action,
}: {
  kicker?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <AppText variant="title" style={styles.center}>
        {title}
      </AppText>
      <AppText variant="body" style={[styles.center, styles.muted]}>
        {body}
      </AppText>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.paper },
  screenContent: { padding: space.xl, gap: space.lg, paddingBottom: space.xxxl },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.rule, marginVertical: space.sm },
  button: {
    minHeight: touchTarget,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  inactive: { opacity: 0.5 },
  field: { gap: space.xs },
  fieldLabel: { color: colors.ink, fontWeight: '600' },
  input: {
    ...type.body,
    minHeight: touchTarget,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.paperRaised,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger },
  notice: { padding: space.lg, borderRadius: radius.md },
  noticeError: { backgroundColor: colors.dangerTint },
  noticeInfo: { backgroundColor: colors.taupeTint },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingVertical: space.xxxl,
    paddingHorizontal: space.lg,
  },
  center: { textAlign: 'center' },
  muted: { color: colors.inkMuted },
});

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
});
const buttonLabelStyles = StyleSheet.create({
  primary: { color: colors.onAccent },
  secondary: { color: colors.ink },
  ghost: { color: colors.rose },
  danger: { color: colors.onAccent },
});
