// The soft colour wash behind the Arcade screens: three large accent-coloured
// glows (amber, purple, teal) at fixed spots, melting into the background. It is
// purely decorative: it absolute-fills its parent and ignores touches, so a
// screen renders it as the first child, behind the real content.
//
// Positions mirror the mockup's three blobs on a phone-width frame.
//
// It used to be three hard-edged circles under a heavy BlurView, which is a
// reasonable way to fake a radial gradient and was how the design was first
// built. That is gone on both platforms now, for two separate reasons that
// arrived at the same answer:
//
//  - On Android, expo-blur's `intensity` does not mean what it means on iOS.
//    iOS scales a translucent native material; Android sets the opacity of a
//    flat tint laid OVER the blur, at 255 * (intensity/100) * factor, factor
//    0.69 for the dark tint and 0.78 for the light. At the intensity 100 this
//    wash wanted, that is a near-opaque sheet across the whole screen. The
//    glows were never missing on Android; they were underneath it.
//
//  - On iOS the blur worked, but its material lifts and desaturates everything
//    beneath it. Measured on device, the background sat at rgb(26,24,35), a
//    grey-brown, where the theme asks for rgb(20,16,38), a deep purple. Cards
//    then read as washed out - not because the cards were wrong, they measured
//    within three levels of Android's, but because their surround was.
//
// So the softness now comes from the shape instead of from a filter: SVG radial
// gradients that fade to transparent, via react-native-svg, which the app
// already depends on. Identical on both platforms, no native blur, and the
// falloff is drawn once rather than computed every frame.

import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { useTheme } from "@/theme/ThemeProvider";

// Where the three glows sit and how far each one reaches, in points on a
// phone-width frame. Centres match the circles the design was built from; the
// radii are wider because a blurred circle spreads well past its own edge and
// the gradient has to cover the same ground on its own.
const GLOWS = [
  { key: "fuel", cx: 60, cy: 160, r: 190 },
  { key: "priority", cx: 310, cy: 60, r: 175 },
  { key: "teal", cx: 230, cy: 630, r: 210 },
] as const;

// Peak opacity at the centre of a glow, before it fades out.
//
// Light needs a HIGHER number than dark, which is the opposite of the intuition
// the original values came from. Those kept the light theme fainter, on the
// reasoning that light mode has dark text sitting straight on the background
// and a loud wash costs legibility. Two things make that wrong here. A light
// theme's accents are the DEEP shades (#A2660E amber, #0A7A6C teal), picked so
// accent text clears AA on near-white glass, and a deep colour laid faintly
// over a pale background barely moves it - at 0.15 the teal shifted the
// background by four levels, which is rounding rather than a glow. And the
// legibility worry does not bind: darkening the background as far as
// rgb(200,185,212) still leaves body ink at 8.5:1, against a 4.5:1 floor.
//
// These are the two knobs. Change them by measuring, not by looking.
const GLOW_PEAK_DARK = 0.24;
const GLOW_PEAK_LIGHT = 0.34;

export function AmbientBackground() {
  const { colors, isDark } = useTheme();

  const peak = isDark ? GLOW_PEAK_DARK : GLOW_PEAK_LIGHT;

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
        {GLOWS.map((glow) => (
          <Rect key={glow.key} x="0" y="0" width="100%" height="100%" fill={`url(#glow-${glow.key})`} />
        ))}
      </Svg>
    </View>
  );
}
