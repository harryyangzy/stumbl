/**
 * Stumbl design tokens — aligned with Figma (brand colors + font roles).
 */
export const colors = {
  yellow: '#F8BB36',
  green: '#148240',
  greenPressed: '#0f6b34',
  offWhite: '#FBF2E5',
  black: '#000000',
  grey: '#787572',
  white: '#FFFFFF',
} as const;

/** PostScript / useFonts keys — must match `useFonts` in `app/_layout.tsx`. */
export const fontFamilies = {
  display: 'Monotalic-Medium',
  heading: 'Parabolica-Medium',
  body: 'Parabolica-Regular',
} as const;

export const theme = {
  ...colors,

  brandGreen: colors.green,
  brandGreenPressed: colors.greenPressed,
  screenBg: colors.offWhite,
  cardBg: colors.white,
  widgetCardBg: '#EDE8E0',
  textPrimary: colors.black,
  textSecondary: colors.grey,
  borderSubtle: 'rgba(0,0,0,0.12)',
  routePillBg: colors.yellow,
  routePillText: colors.black,

  radiusLg: 24,
  radiusMd: 20,
  radiusSm: 14,
  radiusPill: 999,

  spaceXs: 6,
  spaceSm: 12,
  spaceMd: 20,
  spaceLg: 24,

  /** Horizontal inset from screen left/right (onboarding + main). */
  screenEdge: 45,
  /** Space between stacked heading lines (e.g. title + subtitle). */
  headingLineGap: 4,
  /** Space from subtitle (or last heading line) to the next block (search, list, picker). */
  headingToControl: 10,
  /** Scroll content bottom padding above the fixed footer CTA. */
  scrollContentAboveFooter: 80,
  /** Welcome: logo wordmark to tagline box. */
  welcomeLogoToTag: 0,
  /** Welcome: tagline block to Get Started. */
  welcomeTagToCta: 65,

  /** Heading: Parabolica Medium 24 */
  title: 24,
  /** Body: Parabolica Regular 16 */
  body: 16,
  /** Secondary lines (same size as body, use with grey color) */
  subtitle: 16,
  /** Main button: Parabolica Medium 18 */
  button: 18,
  caption: 14,
  /** Welcome logo */
  displayLogo: 64,

  fonts: fontFamilies,

  /** Reusable text styles (omit fontWeight when using a specific face). */
  textHeading: {
    fontFamily: fontFamilies.heading,
    fontSize: 24,
    color: colors.black,
  },
  textBody: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.black,
  },
  textBodyGrey: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.grey,
  },
  textButton: {
    fontFamily: fontFamilies.heading,
    fontSize: 18,
  },
  textDisplay: {
    fontFamily: fontFamilies.display,
    fontSize: 64,
    color: colors.offWhite,
  },
} as const;

export type Theme = typeof theme;
