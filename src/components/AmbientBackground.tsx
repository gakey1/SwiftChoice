// The soft colour wash behind the Arcade screens: three accent-coloured glows
// drawn as SVG radial gradients, so the falloff is identical on both platforms.
// Decorative only, so it fills its parent and ignores touches. Render it first.

import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { useTheme } from "@/theme/ThemeProvider";

// Where the three glows sit and how far each reaches, in points on a
// phone-width frame. Centres match the design's circles; the radii are wider,
// because a gradient has to cover on its own the ground a blur used to spread
// into past its edge.
const GLOWS = [
  { key: "fuel", cx: 60, cy: 160, r: 190 },
  { key: "priority", cx: 310, cy: 60, r: 175 },
  { key: "teal", cx: 230, cy: 630, r: 210 },
] as const;

// Peak opacity at the centre of a glow, before it fades out.
//
// Light is deliberately the higher number, which surprises people. The light
// theme's accents are deep shades, and a deep colour laid faintly over a pale
// background barely moves it. Body text still clears AA at this strength.
//
// These are the two knobs for the wash. Change them by measuring, not by eye.
const GLOW_PEAK_DARK = 0.24;
const GLOW_PEAK_LIGHT = 0.34;

export function AmbientBackground() {
  const { colors, isDark } = useTheme();

  const peak = isDark ? GLOW_PEAK_DARK : GLOW_PEAK_LIGHT;

  // The glows name theme keys, not hex values, so the wash re-tints itself when
  // the theme flips instead of needing a second hardcoded set of colours.
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
            once here, then painted by a full-screen Rect below that references
            it by id. Splitting definition from use is how SVG reuses paint. */}
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
        {/* One full-screen rect per glow. Each is transparent everywhere except
            where its gradient paints, so the three stack and blend into the
            single wash without any of them needing to know about the others. */}
        {GLOWS.map((glow) => (
          <Rect key={glow.key} x="0" y="0" width="100%" height="100%" fill={`url(#glow-${glow.key})`} />
        ))}
      </Svg>
    </View>
  );
}
