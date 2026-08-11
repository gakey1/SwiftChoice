// The soft colour wash behind the Arcade screens: three accent-coloured glows
// drawn as SVG radial gradients, so the falloff is identical on both platforms.
// Decorative only, so it fills its parent and ignores touches. Render it first.

// The full-screen wrapper and the absolute-fill helper.
import { StyleSheet, View } from "react-native";
// The SVG primitives the glows are built from.
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

// The active theme's colours, so the wash re-tints on the dark/light toggle.
import { useTheme } from "@/theme/ThemeProvider";

// Where each glow sits and how far it reaches, in points on a phone-width
// frame. Centres match the design's circles; the radii are wider, because a
// gradient has to cover on its own the ground a blur would spread into.
const GLOWS = [
  { key: "fuel", cx: 60, cy: 160, r: 190 },
  { key: "priority", cx: 310, cy: 60, r: 175 },
  { key: "teal", cx: 230, cy: 630, r: 210 },
] as const;

// Peak opacity at the centre of a glow, before it fades out. Light is the
// higher number because the light theme's accents are deep shades, and a deep
// colour laid faintly over a pale background barely moves it. Body text still
// clears AA at this strength. Change these by measuring, not by eye.
const GLOW_PEAK_DARK = 0.24;
const GLOW_PEAK_LIGHT = 0.34;

// Paints the theme background, then the three glows over it.
export function AmbientBackground() {
  const { colors, isDark } = useTheme();

  const peak = isDark ? GLOW_PEAK_DARK : GLOW_PEAK_LIGHT;

  // The glows name theme keys, not hex values, so one set of positions serves
  // both themes instead of needing a second hardcoded set of colours.
  const glowColors: Record<(typeof GLOWS)[number]["key"], string> = {
    fuel: colors.fuel,
    priority: colors.priority,
    teal: colors.teal,
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}
      pointerEvents="none"
    >
      <Svg style={StyleSheet.absoluteFill}>
        {/* Defs declares the gradients without drawing them. Each is defined
            once here and painted below by a rect that references it by id. */}
        <Defs>
          {GLOWS.map((glow) => (
            <RadialGradient
              key={glow.key}
              id={`glow-${glow.key}`}
              cx={glow.cx}
              cy={glow.cy}
              r={glow.r}
              gradientUnits="userSpaceOnUse"
            >
              {/* Three stops rather than two, so the falloff curves like a blur
                  instead of ramping in a straight line to nothing. */}
              <Stop offset="0" stopColor={glowColors[glow.key]} stopOpacity={peak} />
              <Stop offset="0.5" stopColor={glowColors[glow.key]} stopOpacity={peak * 0.45} />
              <Stop offset="1" stopColor={glowColors[glow.key]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {/* One full-screen rect per glow, transparent everywhere except where
            its gradient paints, so the three stack into a single wash. */}
        {GLOWS.map((glow) => (
          <Rect key={glow.key} x="0" y="0" width="100%" height="100%" fill={`url(#glow-${glow.key})`} />
        ))}
      </Svg>
    </View>
  );
}
