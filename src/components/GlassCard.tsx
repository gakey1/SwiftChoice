// The card surface from the Arcade mockup: an opaque base, a translucent theme
// tint over it, and a hairline border, clipped to a rounded rectangle.
//
// Usage: wrap content in <GlassCard style={{ padding: 16, marginBottom: 14 }}>.
// The caller's style controls layout (padding, margin, width); the fill covers
// the whole rounded rectangle underneath.
//
// The name is historical. These were frosted glass: a real BlurView softening
// the ambient wash behind them. That is gone on both platforms, and it is worth
// recording why, because "add the blur back" is an obvious-looking idea.
//
// On Android it never reliably worked. Blurring there means handing the
// BlurView a target view to snapshot, and that plumbing failed three ways, each
// silently and each rendering a WHITE card:
//
//  1. No target at all, and the blur quietly renders nothing.
//  2. A transparent target, and the engine clears each frame with the window
//     background instead - white - which measured as rgb(87,81,110) through
//     this component's layers, against the rgb(35,28,62) intended.
//  3. One shared target across a tab navigator. Home, History and Settings all
//     stay mounted and all registered into the same slot, so the cards on
//     screen could end up blurring another screen's hidden, empty view. That
//     one depends on mount order, so it cleared on a reload and came back on a
//     tab change, and read as fixed twice before it was.
//
// On iOS it worked, and still cost more than it paid. The blur material lifts
// and desaturates whatever is under it, so the background measured rgb(26,24,35)
// where the theme asks for rgb(20,16,38), and the cards inherited that haze
// along with whatever glow happened to sit behind them - one card measured
// green-tinted purely because the teal glow was behind it.
//
// An opaque base does none of that. It composites to exactly what a correct
// blur produced, stays theme-driven so the light theme is right for the same
// reason the dark one is, and is the same on both platforms with no mount order
// to get wrong. Frost is worth less than a card that is the right colour every
// time.

import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";

export type GlassCardProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function GlassCard({ children, style }: GlassCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { borderColor: colors.cardLine }, style]}>
      {/* Opaque first, then the translucent tint over it. The two together are
          what compose to the card colour: rgb(35,27,63) in the dark theme,
          rgb(252,251,254) in the light one, both measured on device. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
});

// Kept so callers can align to the same radius the card uses.
export const GLASS_RADIUS = 22;
