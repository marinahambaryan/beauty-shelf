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
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, space, tabBarClearance, touchTarget, type } from '@/theme/tokens';
import { Icon, type IconName } from './icons';

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
type Variant = keyof typeof type;

export function AppText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const role = variant === 'display' || variant === 'title' || variant === 'heading' ? 'header' : undefined;
  return <Text accessibilityRole={role} style={[type[variant], style]} {...rest} />;
}

// ---------------------------------------------------------------------------
// Page furniture
// ---------------------------------------------------------------------------
/**
 * A scrolling page. There is no navigation bar: each page draws its own title, so the
 * page owns the top safe area. Tab pages leave room for the floating tab bar.
 */
export function Screen({
  children,
  contentStyle,
  bottomInset = false,
  ...rest
}: ScrollViewProps & {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pages pushed over the tabs (no tab bar below) only clear the home indicator. */
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
        { paddingBottom: bottomInset ? insets.bottom + space.xxxl : tabBarClearance + insets.bottom },
        contentStyle,
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

/** A round icon button: grey by default ("tile"), plain, white over images, or black when active. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = 'tile',
  size = 44,
  iconSize = 22,
  disabled = false,
  selected,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: 'tile' | 'plain' | 'white' | 'ink';
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  selected?: boolean;
}) {
  const bg = tone === 'tile' ? colors.tile : tone === 'white' ? colors.ground : tone === 'ink' ? colors.ink : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      hitSlop={size < touchTarget ? (touchTarget - size) / 2 : 0}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        styles.iconButton,
        tone === 'white' && styles.raised,
        pressed && styles.pressed,
        disabled && styles.inactive,
      ]}
    >
      <Icon name={icon} size={iconSize} color={tone === 'ink' ? colors.ground : colors.ink} strokeWidth={2} />
    </Pressable>
  );
}

/**
 * The bar at the top of pages pushed over the tabs: a round back (or close) button,
 * an optional centered title, and an optional action on the right.
 */
export function TopBar({
  onBack,
  backLabel = 'Back',
  icon = 'back',
  title,
  right,
}: {
  onBack: () => void;
  backLabel?: string;
  icon?: 'back' | 'close';
  title?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <IconButton icon={icon} onPress={onBack} accessibilityLabel={backLabel} tone="plain" />
      {title ? (
        <AppText variant="section" style={styles.topBarTitle} accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
      ) : (
        <View style={styles.flex} />
      )}
      <View style={styles.topBarRight}>{right}</View>
    </View>
  );
}

/** A small text action: "Today", "Remove photo". */
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
      <Text style={[styles.textActionLabel, tone === 'danger' && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

/** The outlined pill that sits beside a title: "New". */
export function PillAction({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <Text style={styles.pillLabel}>{label}</Text>
    </Pressable>
  );
}

/** The oversized page title, with an optional action on the right. */
export function PageTitle({ children, action, variant = 'display' }: { children: string; action?: ReactNode; variant?: 'display' | 'title' }) {
  return (
    <View style={styles.pageTitle}>
      <AppText variant={variant} style={styles.flex}>
        {children}
      </AppText>
      {action}
    </View>
  );
}

/** A titled block. */
export function Section({ label, right, footer, children }: { label?: string; right?: ReactNode; footer?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {label ? (
        <View style={styles.sectionHead}>
          <AppText variant="section" accessibilityRole="header">
            {label}
          </AppText>
          {typeof right === 'string' ? <AppText variant="bodySoft">{right}</AppText> : right}
        </View>
      ) : null}
      {children}
      {footer ? <AppText variant="bodySoft">{footer}</AppText> : null}
    </View>
  );
}

/** A plain row: title on the left, detail on the right, a chevron when it opens something. */
export function Row({
  title,
  detail,
  tone = 'default',
  onPress,
  accessibilityLabel,
  chevron = true,
}: {
  title: string;
  detail?: string;
  tone?: 'default' | 'danger';
  onPress?: () => void;
  accessibilityLabel?: string;
  chevron?: boolean;
}) {
  const label = accessibilityLabel ?? [title, detail].filter(Boolean).join(', ');
  const content = (
    <>
      <AppText variant="label" style={[styles.flex, tone === 'danger' && styles.danger]} numberOfLines={2}>
        {title}
      </AppText>
      {detail ? (
        <AppText variant="bodySoft" numberOfLines={1}>
          {detail}
        </AppText>
      ) : null}
      {onPress && chevron && tone !== 'danger' ? <Icon name="chevronRight" size={18} strokeWidth={2} /> : null}
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
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'danger';

/** Pill buttons: solid black, outlined, plain text, or red for destructive actions. */
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
      {loading ? <ActivityIndicator color={v.fg} /> : <Text style={[styles.buttonLabel, { color: v.fg }]}>{label}</Text>}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.ink, fg: colors.ground, border: colors.ink },
  secondary: { bg: 'transparent', fg: colors.ink, border: colors.ink },
  plain: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
  danger: { bg: colors.danger, fg: colors.ground, border: colors.danger },
};

/** An outlined field with its label above, like the design's search bar. */
export function TextField({
  label,
  error,
  hint,
  style,
  trailing,
  leading,
  hideLabel = false,
  onFocus,
  onBlur,
  ...rest
}: TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
  leading?: ReactNode;
  /** The label is still read by screen readers. */
  hideLabel?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {hideLabel ? null : (
        <AppText variant="label" accessible={false}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputBox,
          rest.multiline && styles.inputBoxMultiline,
          focused && styles.inputBoxFocused,
          error ? styles.inputBoxError : null,
        ]}
      >
        {leading}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.inkMuted}
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

/** The search bar: magnifier, input, a clear button while there is text, and an optional action. */
export function SearchField({
  value,
  onChangeText,
  label,
  placeholder,
  trailing,
  autoFocus,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (v: string) => void;
  label: string;
  placeholder: string;
  trailing?: ReactNode;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}) {
  return (
    <TextField
      label={label}
      hideLabel
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      autoFocus={autoFocus}
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="search"
      onSubmitEditing={onSubmitEditing}
      leading={<Icon name="search" size={21} strokeWidth={1.9} />}
      trailing={
        value ? (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={10}
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            <Icon name="close" size={12} color={colors.ground} strokeWidth={3} />
          </Pressable>
        ) : (
          trailing
        )
      }
    />
  );
}

/** Password field with a Show / Hide switch. */
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
          <Text style={styles.textActionLabel}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      }
    />
  );
}

/** Inline message for form-level errors and confirmations. */
export function Notice({ tone = 'error', children }: { tone?: 'error' | 'info'; children: ReactNode }) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: tone === 'error' ? colors.dangerWash : colors.tile }]}
    >
      <AppText variant="body" style={tone === 'error' ? styles.danger : null} selectable>
        {children}
      </AppText>
    </View>
  );
}

/** Pill chips: the selected one is black. With `onClear`, tapping it again clears the choice. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  onClear,
  accessibilityLabel,
  scroll = false,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  onClear?: () => void;
  accessibilityLabel?: string;
  scroll?: boolean;
}) {
  const chips = options.map((o) => {
    const selected = o.value === value;
    return (
      <Pressable
        key={o.value}
        onPress={() => (selected && onClear ? onClear() : onChange(o.value))}
        accessibilityRole={onClear ? 'radio' : 'tab'}
        accessibilityState={onClear ? { checked: selected } : { selected }}
        accessibilityLabel={o.label}
        accessibilityHint={selected && onClear ? 'Tap again to clear' : undefined}
        hitSlop={{ top: 4, bottom: 4 }}
        style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
      >
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={1}>
          {o.label}
        </Text>
      </Pressable>
    );
  });
  const role = onClear ? 'radiogroup' : 'tablist';
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityRole={role}
        accessibilityLabel={accessibilityLabel}
      >
        {chips}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.chips, styles.wrap]} accessibilityRole={role} accessibilityLabel={accessibilityLabel}>
      {chips}
    </View>
  );
}

/** One choice of a few, as a single pill with the current one filled black: "Want | Have | Used up". */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            style={({ pressed }) => [styles.segment, selected && styles.chipSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Centered word tabs with an underline under the current one: "Products   Collections". */
export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.underlineTabs} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.underlineTab, selected && styles.underlineTabSelected]}
          >
            <Text style={styles.underlineTabLabel}>{o.label}</Text>
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
      <AppText variant="section">This didn’t load</AppText>
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
      <AppText variant="section">{title}</AppText>
      <AppText variant="bodySoft">{body}</AppText>
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Browsers draw a focus ring around inputs; this design thickens the border instead.
const webNoOutline = process.env.EXPO_OS === 'web' ? ({ outlineStyle: 'none' } as unknown as ViewStyle) : null;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexWrap: 'wrap' },
  danger: { color: colors.danger },
  screen: { flex: 1, backgroundColor: colors.ground },
  screenContent: { paddingHorizontal: space.xl, gap: space.xl },
  pageTitle: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  section: { gap: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderColor: colors.rule,
  },
  pressed: { opacity: 0.55 },
  inactive: { opacity: 0.4 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  raised: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)' },
  button: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPlain: { minHeight: touchTarget },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  field: { gap: space.sm },
  inputBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.ground,
  },
  inputBoxMultiline: { alignItems: 'flex-start', paddingVertical: space.xs },
  inputBoxFocused: { borderColor: colors.ink, borderWidth: 2, paddingHorizontal: space.lg - 0.5 },
  inputBoxError: { borderColor: colors.danger },
  input: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink, flex: 1, minHeight: 48, paddingVertical: space.sm },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  clear: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginHorizontal: -space.md, marginBottom: -space.sm },
  topBarTitle: { flex: 1, textAlign: 'center' },
  topBarRight: { minWidth: 44, alignItems: 'flex-end' },
  textAction: { minHeight: touchTarget, justifyContent: 'center' },
  textActionLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  pill: {
    height: 40,
    paddingHorizontal: space.lg + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  showButton: { minHeight: touchTarget, justifyContent: 'center', paddingLeft: space.sm },
  notice: { padding: space.lg, borderRadius: radius.md },
  chips: { flexDirection: 'row', gap: space.sm },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.ink },
  chipLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  chipLabelSelected: { color: colors.ground },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 26, borderWidth: 1, borderColor: colors.chip },
  segment: { flex: 1, minHeight: touchTarget, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  underlineTabs: { flexDirection: 'row', justifyContent: 'center', gap: space.xxl },
  underlineTab: { minHeight: touchTarget, justifyContent: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  underlineTabSelected: { borderColor: colors.ink },
  underlineTabLabel: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  state: { gap: space.sm, paddingVertical: space.xxl },
});
