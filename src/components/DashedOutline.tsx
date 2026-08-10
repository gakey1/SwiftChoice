// A dashed rounded-rectangle outline, drawn with SVG because borderStyle
// "dashed" with a borderRadius is broken on both platforms and fails silently.
// Drop it in as a container's last child; it fills the parent and ignores taps.

import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Rect } from "react-native-svg";

export type DashedOutlineProps = {
  color: string;
  // Match the parent's borderRadius, or the outline will not sit on its edge.
  radius?: number;
  thickness?: number;
  // Dash length and gap length, in points.
  dash?: [number, number];
};

export function DashedOutline({
  color,
  radius = 20,
  thickness = 1.5,
  dash = [7, 5],
}: DashedOutlineProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  function handleLayout(event: LayoutChangeEvent): void {
    const { width, height } = event.nativeEvent.layout;
    // Only update on a real change, so measuring cannot loop.
    setSize((current) =>
      current.width === width && current.height === height ? current : { width, height }
    );
  }

  // A stroke straddles its path, so the path is inset or the outer half of
  // every dash is clipped by the parent's overflow: hidden.
  //
  // Inset by a whole thickness, not the half geometry calls for: half lands the
  // stroke's edge exactly on the boundary, where Android truncates it to a
  // fraction of its width. A full thickness leaves slack, and costs half a
  // point of position, which is not visible.
  const inset = thickness;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleLayout}>
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height}>
          <Rect
            x={inset}
            y={inset}
            width={Math.max(0, size.width - inset * 2)}
            height={Math.max(0, size.height - inset * 2)}
            rx={Math.max(0, radius - inset)}
            ry={Math.max(0, radius - inset)}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={dash.join(",")}
          />
        </Svg>
      ) : null}
    </View>
  );
}
