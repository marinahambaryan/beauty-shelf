import { Platform } from 'react-native';

/**
 * Beauty Shelf design tokens — warm ivory paper, charcoal ink, muted rose/taupe accents.
 * Contrast notes (WCAG, on `paper`): ink 13.9:1, inkMuted 6.7:1, rose 5.4:1, danger 6.6:1 — all pass AA
 * for body text. `roseTint`/`taupeTint` are surfaces only, never text colors.
 */
export const colors = {
  paper: '#FAF6F0',
  paperRaised: '#FFFDF9',
  ink: '#2A2623',
  inkMuted: '#5F5650',
  inkFaint: '#8E847C', // decorative/disabled only (3.4:1)
  rule: '#E6DDD3',
  rose: '#9A4F5A',
  roseTint: '#F3E3E1',
  taupe: '#8B7B6E',
  taupeTint: '#EFE8E0',
  danger: '#A12F2F',
  dangerTint: '#F7E1DE',
  success: '#3F6B4E',
  onAccent: '#FFFFFF',
} as const;

/** Editorial serif for headlines/covers only; UI and body stay sans-serif. */
export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }),
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, -apple-system, sans-serif' }),
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, color: colors.ink },
  title: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.ink },
  heading: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 22, fontWeight: '600' as const, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 23, color: colors.ink },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
  // Small-caps "issue label" kicker — the nostalgic magazine accent.
  kicker: {
    fontFamily: fonts.sans, fontSize: 11, lineHeight: 14, letterSpacing: 1.6,
    textTransform: 'uppercase' as const, fontWeight: '600' as const, color: colors.rose,
  },
} as const;

/** Minimum touch target (iOS HIG 44pt, Material 48dp). */
export const touchTarget = 48;
