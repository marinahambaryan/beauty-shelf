import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, space, touchTarget, type } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
type Variant = keyof typeof type;

export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const role = variant === 'display' || variant === 'title' ? 'header' : undefined;
  return <Text accessibilityRole={role} style={[type[variant], style]} {...rest} />;
}

// ---------------------------------------------------------------------------
// Page furniture
// ---------------------------------------------------------------------------
/**
 * A scrolling page. There is no navigation bar in this design: each page opens with its
 * mast line and a big title, so the page itself owns the top safe area.
 */
export function Screen({
  children,
  contentStyle,
  bottomInset = false,
  ...rest
}: ScrollViewProps & {
  children: ReactNode;
  contentStyle?: ViewStyle;
  /** Pages outside the tabs (no tab bar below) also clear the home indicator. */
  bottomInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={styles.screen}
      contentContainerStyle={[
        styles.screenContent,
        { paddingTop: insets.top + space.xl },
        bottomInset && { paddingBottom: insets.bottom + space.xxxl },
        contentStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

/** The small mono line at the top of every page: "BEAUTY SHELF ........ NO. 069 / PRIVATE". */
export function Mast({ left, right }: { left: string; right?: string }) {
  return (
    <View style={styles.mast}>
      <AppText variant="label">{left}</AppText>
      {right ? <AppText variant="label" style={styles.soft}>{right}</AppText> : null}
    </View>
  );
}

/**
 * The line above the mast on pages pushed over the tabs: "← BACK" on the left and an
 * optional action on the right. Words, not icons, like the rest of the design.
 */
export function TopBar({ onBack, backLabel = 'Back', right }: { onBack: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        hitSlop={space.sm}
        style={({ pressed }) => [styles.topBarButton, pressed && styles.pressed]}
      >
        <AppText variant="label">← {backLabel}</AppText>
      </Pressable>
      {right}
    </View>
  );
}

/** A small mono text action: "+ ADD", "CHANGE PHOTO". Underlined so it reads as tappable. */
export function TextAction({
  label,
  onPress,
  accessibilityLabel,
  tone = 'default',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={space.xs}
      style={({ pressed }) => [styles.textAction, pressed && styles.pressed, disabled && styles.inactive]}
    >
      <AppText variant="label" style={[styles.underline, tone === 'danger' && styles.danger]}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** The outlined pill that sits beside a page title: "+ ADD". */
export function PillAction({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

/** The oversized page title, with an optional action on the right. */
export function PageTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <AppText variant="display" style={styles.flex}>
        {children}
      </AppText>
      {action}
    </View>
  );
}

/** A labelled block. The label is a mono line, like a section heading on a label. */
export function Section({ label, right, footer, children }: { label?: string; right?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {label ? (
        <View style={styles.sectionHead}>
          <AppText variant="label">{label}</AppText>
          {right ? <AppText variant="label" style={styles.soft}>{right}</AppText> : null}
        </View>
      ) : null}
      {children}
      {footer ? <AppText variant="bodySoft">{footer}</AppText> : null}
    </View>
  );
}

/** A ruled mono row: label on the left, detail on the right. Tappable when `onPress` is set. */
export function Row({
  title,
  detail,
  tone = 'default',
  onPress,
  accessibilityLabel,
  asTyped = false,
}: {
  title: string;
  detail?: string;
  tone?: 'default' | 'danger';
  /** Keep the text's own case (emails, names someone typed) instead of label capitals. */
  asTyped?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const label = accessibilityLabel ?? [title, detail].filter(Boolean).join(', ');
  const content = (
    <>
      <AppText
        variant={asTyped ? 'body' : 'label'}
        style={[styles.flex, tone === 'danger' && styles.danger]}
        numberOfLines={2}
      >
        {title}
      </AppText>
      {detail ? <AppText variant="label" style={styles.soft} numberOfLines={1}>{detail}</AppText> : null}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.row} accessible accessibilityLabel={label}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'danger';

/** Buttons read like the mockup's: mono capitals, 14px corners, solid or outlined in ink. */
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
  const v = buttonVariants[variant];
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
        { backgroundColor: v.bg, borderColor: v.border },
        variant === 'plain' && styles.buttonPlain,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonLabel, { color: v.fg }, variant === 'plain' && styles.underline]}>{label}</Text>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.ink, fg: colors.ground, border: colors.ink },
  secondary: { bg: 'transparent', fg: colors.ink, border: colors.ink },
  plain: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
  danger: { bg: colors.danger, fg: colors.ground, border: colors.danger },
};

/** An underlined mono field, like the mockup's search line. */
export function TextField({
  label,
  error,
  hint,
  style,
  trailing,
  prefix,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & { label: string; error?: string; hint?: string; trailing?: ReactNode; prefix?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {prefix ? null : (
        <AppText variant="small" style={styles.fieldLabel}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputLine,
          rest.multiline && styles.inputLineMultiline,
          focused && styles.inputLineFocused,
          error ? styles.inputLineError : null,
        ]}
      >
        {prefix ? (
          <AppText variant="label" accessible={false}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.inkSoft}
          selectionColor={colors.ink}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, rest.multiline && styles.inputMultiline, webNoOutline, style]}
          {...rest}
        />
        {trailing}
      </View>
      {error ? (
        <AppText variant="bodySoft" style={styles.danger} accessibilityLiveRegion="polite" selectable>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="bodySoft">{hint}</AppText>
      ) : null}
    </View>
  );
}

/** Password field with a SHOW / HIDE switch in words, not an icon. */
export function PasswordField(
  props: Omit<TextInputProps, 'secureTextEntry'> & { label: string; error?: string; hint?: string },
) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      trailing={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={space.sm}
          style={({ pressed }) => [styles.showButton, pressed && styles.pressed]}
        >
          <AppText variant="small">{visible ? 'Hide' : 'Show'}</AppText>
        </Pressable>
      }
    />
  );
}

/** Inline message for form-level errors and confirmations: a slip of label paper. */
export function Notice({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: tone === 'error' ? colors.dangerWash : colors.paper }]}
    >
      <AppText variant="body" style={tone === 'error' ? styles.danger : null} selectable>
        {children}
      </AppText>
    </View>
  );
}

/** "[ALL]  OWNED  WISHLIST  FINISHED": the selected option sits in brackets. */
export function BracketTabs<T extends string>({
  options,
  value,
  onChange,
  spread = true,
  onClear,
  accessibilityLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  spread?: boolean;
  /** For optional choices: tapping the selected option again clears it. */
  onClear?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <View
      style={[styles.tabs, spread && styles.tabsSpread]}
      accessibilityRole={onClear ? 'radiogroup' : 'tablist'}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => (selected && onClear ? onClear() : onChange(o.value))}
            accessibilityRole={onClear ? 'radio' : 'tab'}
            accessibilityState={onClear ? { checked: selected } : { selected }}
            accessibilityLabel={o.label}
            accessibilityHint={selected && onClear ? 'Tap again to clear' : undefined}
            style={styles.tab}
          >
            <Text style={[styles.tabLabel, selected && styles.tabSelected]} numberOfLines={1}>
              {selected ? `[${o.label}]` : o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Loading / error / empty states
// ---------------------------------------------------------------------------
export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.state} accessibilityLabel={label} accessible>
      <ActivityIndicator color={colors.inkSoft} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <AppText variant="label">This didn’t load</AppText>
      <AppText variant="bodySoft" selectable>
        {message}
      </AppText>
      {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ art, title, body, action }: { art?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <View style={styles.state}>
      {art}
      <AppText variant="label">{title}</AppText>
      <AppText variant="bodySoft">{body}</AppText>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Browsers draw a focus ring around inputs; this design thickens the underline instead.
const webNoOutline = process.env.EXPO_OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : null;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  soft: { color: colors.inkSoft },
  danger: { color: colors.danger },
  underline: { textDecorationLine: 'underline' },
  screen: { flex: 1, backgroundColor: colors.ground },
  screenContent: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.xl },
  mast: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  pageTitle: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  section: { gap: space.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  row: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm + 2,
    borderBottomWidth: 1,
    borderColor: colors.rule,
  },
  pressed: { opacity: 0.5 },
  inactive: { opacity: 0.4 },
  button: {
    minHeight: 50,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPlain: { minHeight: touchTarget },
  buttonLabel: { ...type.label, color: undefined, fontSize: 13, letterSpacing: 0.8 },
  field: { gap: space.xs },
  fieldLabel: { color: colors.inkSoft },
  inputLine: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderBottomWidth: 1,
    borderColor: colors.ink,
  },
  inputLineMultiline: { alignItems: 'flex-start' },
  inputLineFocused: { borderBottomWidth: 2 },
  inputLineError: { borderColor: colors.danger },
  input: { ...type.body, flex: 1, minHeight: 44, paddingVertical: space.sm },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: -space.sm },
  topBarButton: { minHeight: 44, justifyContent: 'center' },
  textAction: { minHeight: 44, justifyContent: 'center' },
  pill: {
    minHeight: 44,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  showButton: { minHeight: 44, justifyContent: 'center', paddingLeft: space.sm },
  notice: { padding: space.lg, borderRadius: 10 },
  tabs: { flexDirection: 'row', gap: space.lg },
  tabsSpread: { justifyContent: 'space-between' },
  tab: { minHeight: 44, justifyContent: 'center' },
  tabLabel: { ...type.label, color: colors.inkSoft },
  tabSelected: { color: colors.ink, fontFamily: fonts.monoMedium },
  state: { gap: space.sm, paddingVertical: space.xxl },
});
