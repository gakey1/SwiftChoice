// A dashed rounded-rectangle outline, drawn with SVG because React Native
// cannot draw one itself.
//
// Setting borderStyle "dashed" together with a borderRadius is broken on both
// platforms and has been for years: iOS draws the straight edges dashed and the
// corners solid, and Android drops the corner arcs altogether, so the outline
// reads as four separate lines with gaps where the corners should be. Nothing
// warns about it, and it looks like a styling mistake rather than a platform
// limitation.
//
// SVG has no such problem: strokeDasharray follows the path around the corners,
// so the dashes stay evenly spaced the whole way round.
//
// Drop it inside any container as the last child. It fills the parent, ignores
// touches, and draws nothing until it has been measured.

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

  // A stroke straddles its path, so the path has to be inset or the outer half
  // of every dash is clipped by the parent's overflow: hidden.
  //
  // Inset by a whole thickness rather than the half that geometry alone calls
  // for. Half puts the outer edge of the stroke exactly on the canvas boundary,
  // and a layout in points is rarely a whole number of pixels, so Android
  // truncates the last fraction of a pixel and takes most of the stroke with
  // it. The bottom edge of the daily quest card was drawing one pixel tall
  // against four along the top, which reads as a grey line rather than a teal
  // one in light mode and disappears almost entirely in dark. A full thickness
  // leaves half a stroke of slack, so nothing lands on the boundary. The
  // outline sits half a point further in, which is not visible.
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
