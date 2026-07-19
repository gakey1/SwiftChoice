// A circular progress ring, the level gauge from the Arcade History mockup (the
// mockup draws it with a CSS conic-gradient, which React Native has no direct
// equivalent for). It is built from two rotating half-discs clipped to each
// semicircle, so it needs no SVG library and no new dependency: the ring fills
// clockwise from the top for any fraction 0-1.
//
// A hole in the middle (an inner circle in `innerColor`) turns the filled disc
// into a ring of `thickness`, and `children` render centred inside the hole
// (the level number and label).

import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

export type ProgressRingProps = {
  size: number;
  thickness: number;
  // Fill fraction, 0-1. Clamped, so out-of-range values are safe.
  pct: number;
  color: string;
  track: string;
  // Fills the centre hole; use the surface the ring sits on so the hole reads as
  // empty rather than as a coloured dot.
  innerColor: string;
  children?: ReactNode;
};

// One clockwise 0-180 degree sweep into the right semicircle. A left-half-disc is
// pinned by its right edge to the ring centre and rotated about that point; the
// right-semicircle window clips it, so at 0deg nothing shows and at 180deg the
// whole right half is filled.
function RightSweep({ size, color, deg }: { size: number; color: string; deg: number }) {
  const half = size / 2;
  return (
    <View style={{ position: "absolute", left: half, top: 0, width: half, height: size, overflow: "hidden" }}>
      <View
        style={{
          position: "absolute",
          left: -half,
          top: 0,
          width: half,
          height: size,
          backgroundColor: color,
          borderTopLeftRadius: half,
          borderBottomLeftRadius: half,
          transformOrigin: "right",
          transform: [{ rotate: `${deg}deg` }],
        }}
      />
    </View>
  );
}

export function ProgressRing({
  size,
  thickness,
  pct,
  color,
  track,
  innerColor,
  children,
}: ProgressRingProps) {
  const half = size / 2;
  const deg = Math.max(0, Math.min(1, pct)) * 360;
  // First sweep covers 0-180; the second covers 180-360, rendered by rotating a
  // second right-sweep 180deg about the centre so it lands on the left semicircle.
  const first = Math.min(deg, 180);
  const second = Math.max(deg - 180, 0);
  const holeSize = size - thickness * 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: half,
        backgroundColor: track,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <RightSweep size={size} color={color} deg={first} />
      <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: "180deg" }] }]}>
        <RightSweep size={size} color={color} deg={second} />
      </View>
      <View
        style={{
          width: holeSize,
          height: holeSize,
          borderRadius: holeSize / 2,
          backgroundColor: innerColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </View>
  );
}
