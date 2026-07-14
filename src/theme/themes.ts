// The app's colour themes. Everything visual that changes between the light and
// dark Arcade modes lives here. Non-colour tokens (spacing, radii, font names)
// do NOT change between themes and stay in tokens.ts.
//
// Screens read the active theme through useTheme() (see ThemeProvider), never by
// importing a theme object directly, so flipping the toggle re-themes the whole
// app at once. The values below come from the Arcade design mockup.

export type ThemeName = "arcadeDark" | "arcadeLight";

export type ThemeColors = {
  // Surfaces
  bg: string; // app background
  card: string; // translucent card / glass surface
  cardSolid: string; // opaque card (avatar rings, badges)
  chip: string; // faint chip / input fill
  cardLine: string; // card border / hairline divider
  track: string; // progress-bar track

  // Text, brightest to faintest
  ink: string; // primary text
  ink2: string; // secondary text
  ink3: string; // tertiary text and section headers

  // Accents. teal is the universal colour; fuel / focus / priority are the
  // module colours (amber / green / purple), brighter in the dark theme.
  teal: string;
  fuel: string;
  focus: string;
  priority: string;

  // Faint accent fills (for tinted backgrounds) and glows (for soft shadows).
  tealTint: string;
  fuelTint: string;
  focusTint: string;
  priorityTint: string;
  tealGlow: string;
  priorityGlow: string;
};

export const arcadeDark: ThemeColors = {
  bg: "#141026",
  card: "rgba(40, 32, 72, 0.72)",
  cardSolid: "#241C46",
  chip: "rgba(255, 255, 255, 0.07)",
  cardLine: "rgba(180, 150, 255, 0.22)",
  track: "rgba(255, 255, 255, 0.12)",

  ink: "#F4F1FF",
  ink2: "#B4ADD6",
  ink3: "#8B82B8", // section headers; brightened to clear WCAG AA (5.3:1 on bg)

  teal: "#22E0C4",
  fuel: "#FFB23E",
  focus: "#43E58E",
  priority: "#B98BFF",

  tealTint: "rgba(34, 224, 196, 0.20)",
  fuelTint: "rgba(255, 178, 62, 0.22)",
  focusTint: "rgba(67, 229, 142, 0.22)",
  priorityTint: "rgba(185, 139, 255, 0.22)",
  tealGlow: "rgba(34, 224, 196, 0.40)",
  priorityGlow: "rgba(185, 139, 255, 0.40)",
};

export const arcadeLight: ThemeColors = {
  // A deeper lavender than the mockup's pale wash, so white cards, the nav and
  // the HUD have more contrast and the light mode does not read as washed out.
  bg: "#E4DBF3",
  card: "rgba(255, 255, 255, 0.82)",
  cardSolid: "#FFFFFF",
  chip: "rgba(126, 90, 214, 0.10)",
  cardLine: "rgba(150, 120, 230, 0.42)",
  track: "rgba(126, 90, 214, 0.18)",

  ink: "#251C48",
  ink2: "#6A5E90",
  ink3: "#665E7B", // section headers; darkened to clear WCAG AA (5.3:1 on bg)

  teal: "#10BCA6",
  fuel: "#EE9614",
  focus: "#1FBE70",
  priority: "#8B54F6",

  tealTint: "rgba(16, 188, 166, 0.15)",
  fuelTint: "rgba(238, 150, 20, 0.16)",
  focusTint: "rgba(31, 190, 112, 0.16)",
  priorityTint: "rgba(139, 84, 246, 0.16)",
  tealGlow: "rgba(16, 188, 166, 0.40)",
  priorityGlow: "rgba(139, 84, 246, 0.40)",
};

export const themes: Record<ThemeName, ThemeColors> = {
  arcadeDark,
  arcadeLight,
};

// Returns a module's accent colour and its faint tint from the active theme, so
// module screens (Fuel amber, Focus green, Priority purple) use the theme's
// brighter accents instead of the static ones in MODULES.
export function moduleAccent(
  colors: ThemeColors,
  key: "fuel" | "focus" | "priority"
): { color: string; tint: string } {
  switch (key) {
    case "fuel":
      return { color: colors.fuel, tint: colors.fuelTint };
    case "focus":
      return { color: colors.focus, tint: colors.focusTint };
    case "priority":
      return { color: colors.priority, tint: colors.priorityTint };
  }
}

// The app opens in the dark Arcade theme by default; the saved choice overrides
// this once it has loaded.
export const DEFAULT_THEME: ThemeName = "arcadeDark";

export const THEME_NAMES: readonly ThemeName[] = ["arcadeDark", "arcadeLight"];
