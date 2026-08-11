// All of the app's colours, sizes, spacing and fonts in one place. The rest of
// the app uses these names instead of writing raw colour codes or plain numbers,
// so everything stays consistent and can be changed from here in one spot.

// The raw palette. These are the values the module definitions and the themes
// are built from; screens read colours through useTheme rather than from here.
export const colors = {
  // Surfaces, lightest to strongest. canvas is a warm off-white rather than pure
  // white, and border doubles as the divider colour.
  canvas: "#FAFAF7",
  surface: "#FFFFFF",
  border: "#E8E8E4",
  borderStrong: "#DCDCD6",

  // Text, in descending prominence: near-black, grey, then the disabled tone.
  fg1: "#1D1D1F",
  fg2: "#6B7280",
  fg3: "#9CA3AF",

  // The universal accent, allowed on any screen. 700 is the pressed shade, Tint
  // the faint background wash, and On the text colour that sits on top of it.
  teal: "#2A9D8F",
  teal700: "#228377",
  tealTint: "rgba(42, 157, 143, 0.12)",
  tealOn: "#FFFFFF",

  // Module accents, each scoped to its own screens only, in the same three-part
  // shape as teal above.
  fuel: "#E8913A",
  fuel700: "#D17E29",
  fuelTint: "rgba(232, 145, 58, 0.12)",

  focus: "#4CAF7D",
  focus700: "#3E9A6A",
  focusTint: "rgba(76, 175, 125, 0.12)",

  priority: "#8B6FC0",
  priority700: "#785BAE",
  priorityTint: "rgba(139, 111, 192, 0.12)",

  // The neutral button fill, used for reroll and other secondary actions.
  neutral: "#E8E8E4",
  neutral700: "#DCDCD6",

  // The three-step badge scale, used for urgency and importance, each with its
  // faint background pair.
  badgeHigh: "#E5484D",
  badgeHighTint: "rgba(229, 72, 77, 0.13)",
  badgeMed: "#D98324",
  badgeMedTint: "rgba(232, 145, 58, 0.16)",
  badgeLow: "#3E9A6A",
  badgeLowTint: "rgba(76, 175, 125, 0.16)",

  // The two decision outcomes a history row can show.
  statusAccepted: "#2A9D8F",
  statusAcceptedTint: "rgba(42, 157, 143, 0.12)",
  statusRerolled: "#9CA3AF",
  statusRerolledTint: "rgba(156, 163, 175, 0.12)",
} as const;

// Corner rounding. pill is deliberately far larger than any element, since a
// radius past half the height renders as a full semicircle at any size.
export const radii = {
  card: 16,
  button: 12,
  input: 12,
  pill: 999,
  logo: 11,
} as const;

// Spacing sizes, based on multiples of 8 pixels, so gaps and padding line up.
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  // Horizontal page padding, the same on every screen.
  pageX: 24,
} as const;

// Shadow settings for lifting cards off the background. iOS and Android handle
// shadows differently, so each one sets both, which keeps them looking the same
// on both platforms.
export const elevation = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  rest: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  float: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

// Animation settings: how long an animation runs, and its easing curve for a
// smooth start and stop.
export const motion = {
  // Milliseconds.
  dur: 200,
  // A cubic-bezier curve, to be passed to Easing.bezier(...).
  ease: [0.4, 0, 0.2, 1],
} as const;

// The names of the fonts the app loads. These match the fonts set up in App.tsx
// and are what goes in a style's fontFamily.
export const font = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  // Monospace, used only on the "coded" Arcade elements (stats, labels, section
  // headers, badges), never on body text or titles. See the Arcade theme.
  mono: "DMMono_400Regular",
  monoMedium: "DMMono_500Medium",
} as const;

// The type scale, largest to smallest. Everything on screen uses one of these
// rather than a number typed into a stylesheet.
export const fontSize = {
  display: 28,
  title: 20,
  subtitle: 16,
  body: 14,
  caption: 12,
  micro: 11,
} as const;

// Line heights, as multipliers of the font size rather than absolute values, so
// they hold at any size in the scale above.
export const lineHeight = {
  tight: 1.2,
  body: 1.5,
} as const;

// A handy bundle of everything above. Most files just import T and use, for
// example, T.teal or T.spacing[4], instead of importing each group on its own.
export const T = {
  ...colors,
  font,
  fontSize,
  lineHeight,
  radii,
  spacing,
  elevation,
  motion,
} as const;

// The shape of that bundle, for anything that needs to talk about the tokens
// rather than use them.
export type Tokens = typeof T;
