/**
 * Beauty Shelf design tokens — Direction D, "Apothecary".
 *
 * White ground, near-black ink, soft stone cards, pale blue glass shelves.
 * Two faces: IBM Plex Mono for labels and body (set in capitals, like a pharmacy
 * label), Inter Tight for the big, tightly set titles.
 *
 * Contrast on `ground` (#FFFFFF): ink 17.4:1, inkSoft 6.6:1 (5.9:1 on `card`), danger 7.4:1 (all AA).
 */
export const colors = {
  ground: '#FFFFFF',
  card: '#F3F2EF',
  paper: '#FBFAF7', // product labels, notes
  ink: '#1A1A1A',
  inkSoft: '#5F5D58',
  inkFaint: '#A8A6A0',
  rule: '#1A1A1A22', // faint row rules
  glass: '#C9D7E6',
  glassShadow: '#DDE5EE',
  bottle: '#E2DFD8', // neutral stand-in until a product has a photo
  danger: '#9E2B25',
  dangerWash: '#F2E1DE',
} as const;

export const fonts = {
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  display: 'InterTight_600SemiBold',
  displayMedium: 'InterTight_500Medium',
} as const;

/** 4-pt grid. Row gap < group gap < section gap. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 3, md: 14, lg: 16, full: 9999 } as const;

export const type = {
  /** "My shelf", "Every-thing": oversized and tight. */
  display: { fontFamily: fonts.display, fontSize: 46, lineHeight: 44, letterSpacing: -2, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, letterSpacing: -0.9, color: colors.ink },
  /** Product names on cards. */
  name: { fontFamily: fonts.displayMedium, fontSize: 15, lineHeight: 17, letterSpacing: -0.15, color: colors.ink },
  /** Mono label: the small capitals used for headers, tabs, statuses. */
  label: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 16, letterSpacing: 0.5, color: colors.ink, textTransform: 'uppercase' as const },
  small: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 14, letterSpacing: 0.3, color: colors.inkSoft, textTransform: 'uppercase' as const },
  /** Mono body for sentences (notes, explanations), sentence case. */
  body: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 20, color: colors.ink },
  bodySoft: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18, color: colors.inkSoft },
} as const;

/** Minimum touch target (iOS HIG 44pt, Material 48dp). */
export const touchTarget = 48;

/** "069" — counts are set as three-digit catalogue numbers, like the mockup. */
export const catalogNo = (n: number) => String(Math.max(0, n)).padStart(3, '0');
/** "01" — list positions and small counts. */
export const twoDigit = (n: number) => String(Math.max(0, n)).padStart(2, '0');
