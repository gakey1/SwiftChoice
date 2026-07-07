// All of the app's colours, sizes, spacing and fonts in one place. The rest of
// the app uses these names instead of writing raw colour codes or plain numbers,
// so everything stays consistent and can be changed from here in one spot.

export const colors = {
  // Surfaces
  canvas: "#FAFAF7", // warm off-white app background (never pure white)
  surface: "#FFFFFF", // card / sheet surface
  border: "#E8E8E4", // hairline border + dividers
  borderStrong: "#DCDCD6",

  // Text
  fg1: "#1D1D1F", // primary, near-black
  fg2: "#6B7280", // secondary, gray
  fg3: "#9CA3AF", // tertiary, disabled

  // Universal accent - allowed everywhere
  teal: "#2A9D8F",
  teal700: "#228377",
  tealTint: "rgba(42, 157, 143, 0.12)",
  tealOn: "#FFFFFF", // text on teal

  // Module accents - scoped to their own screens only
  fuel: "#E8913A",
  fuel700: "#D17E29",
  fuelTint: "rgba(232, 145, 58, 0.12)",

  focus: "#4CAF7D",
  focus700: "#3E9A6A",
  focusTint: "rgba(76, 175, 125, 0.12)",

  priority: "#8B6FC0",
  priority700: "#785BAE",
  priorityTint: "rgba(139, 111, 192, 0.12)",

  // Neutral button (reroll / gray)
  neutral: "#E8E8E4",
  neutral700: "#DCDCD6",

  // Badge scale (urgency / importance / status)
  badgeHigh: "#E5484D",
  badgeHighTint: "rgba(229, 72, 77, 0.13)",
  badgeMed: "#D98324",
  badgeMedTint: "rgba(232, 145, 58, 0.16)",
  badgeLow: "#3E9A6A",
  badgeLowTint: "rgba(76, 175, 125, 0.16)",

  // Status badges
  statusAccepted: "#2A9D8F",
  statusAcceptedTint: "rgba(42, 157, 143, 0.12)",
  statusRerolled: "#9CA3AF",
  statusRerolledTint: "rgba(156, 163, 175, 0.12)",
} as const;

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
  pageX: 24, // horizontal page padding
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
  dur: 200, // ms
  ease: [0.4, 0, 0.2, 1], // cubic-bezier (use with Easing.bezier(...))
} as const;

// The names of the fonts we load. These match the fonts set up in App.tsx and
// are what we put in a style's fontFamily.
export const font = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
} as const;

// Font sizes
export const fontSize = {
  display: 28,
  title: 20,
  subtitle: 16,
  body: 14,
  caption: 12,
  micro: 11,
} as const;

// Line heights (multipliers)
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

export type Tokens = typeof T;
