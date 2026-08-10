// A soft radial glow for putting a halo behind something round. An SVG gradient
// rather than a shadow, because Android ignores shadowColor and falls back to
// elevation, which is grey and renders a circle as an octagonal band.

import { useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

export type GlowProps = {
  color: string;
  // Total width of the glow, including the empty space it fades out into. Make
  // it comfortably larger than whatever it sits behind.
  size: number;
  // Opacity at the centre. The default suits a halo read against a dark card.
  opacity?: number;
  // Where the falloff starts, as a fraction of the radius. Below this the glow
  // is at full strength, which is the part hidden behind the thing it haloes.
  innerStop?: number;
};

export function Glow({ color, size, opacity = 0.5, innerStop = 0.42 }: GlowProps) {
  // Gradient ids share one document-wide namespace, so two glows on a screen
  // would otherwise collide and both take the first one's colour.
  const id = `glow-${useId().replace(/:/g, "")}`;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset={innerStop} stopColor={color} stopOpacity={opacity} />
          {/* A middle stop so the edge curves off rather than ramping straight
              to nothing, which is what separates a glow from a flat disc. */}
          <Stop offset={(innerStop + 1) / 2} stopColor={color} stopOpacity={opacity * 0.4} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100" height="100" fill={`url(#${id})`} />
    </Svg>
  );
}
