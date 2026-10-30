/**
 * Beauty Shelf design tokens — "Shelf + Pinboard".
 *
 * A Pinterest-simple black & white app: white ground, near-black ink, grey tiles,
 * outlined fields and a floating tab bar. The only colour comes from the products,
 * standing on pale glass shelves with handwritten notes (Caveat). Everything else is Geist.
 *
 * Contrast on `ground` (#FFFFFF): ink 18.9:1, inkSoft 6.4:1, inkMuted 4.6:1, danger 6.6:1 (all AA).
 */
export const colors = {
  ground: '#FFFFFF',
  tile: '#F1F1F1', // product tiles, image cards, icon buttons
  chip: '#EFEFEF', // unselected chips
  ink: '#111111',
  inkSoft: '#5F5F5F',
  inkMuted: '#767676',
  fieldBorder: '#8E8E8E',
  rule: '#ECECEC',
  glass: '#C9D7E6',
  glassShadow: '#E3EAF1',
  bottle: '#E4E4E4', // neutral stand-in until a product has a photo
  danger: '#B3261E',
  dangerWash: '#FBEAE8',
} as const;

export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  extrabold: 'Geist_800ExtraBold',
  hand: 'Caveat_500Medium',
  handBold: 'Caveat_600SemiBold',
} as const;

/** 4-pt grid. Row gap < group gap < section gap. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 28, full: 9999 } as const;

export const type = {
  /** "My shelf": oversized, heavy and tight. */
  display: { fontFamily: fonts.extrabold, fontSize: 48, lineHeight: 46, letterSpacing: -2.2, color: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, color: colors.ink },
  /** Product name on the product page. */
  heading: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.3, color: colors.ink },
  /** Section headings ("Recent searches"), centered screen titles. */
  section: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, color: colors.ink },
  /** Product names under tiles. */
  name: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  /** Field labels, row titles, small headings. */
  label: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodySoft: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  /** Handwriting on the glass. */
  hand: { fontFamily: fonts.hand, fontSize: 23, lineHeight: 24, color: colors.ink },
} as const;

/** Minimum touch target (iOS HIG 44pt, Material 48dp). */
export const touchTarget = 44;

/** Room the floating tab bar takes at the bottom of tab screens. */
export const tabBarClearance = 112;
