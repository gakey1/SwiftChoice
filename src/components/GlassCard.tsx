// The card surface from the Arcade mockup. The name is historical: this was a
// real BlurView, now an opaque fill on both platforms.
// Do not add the blur back, and see docs/cheatsheet-android-rendering.md for why.

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
      {/* Two absolute-filled layers, opaque base first, translucent tint over
          it. Neither is the card colour on its own; what they composite to is.
          Both come from the theme, so the light and dark cards are correct for
          the same reason rather than by separate tuning. */}
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
    // overflow clips the two fill layers to the rounded corners. Without it
    // they draw as squares and the radius is lost.
    overflow: "hidden",
  },
});

// Kept so callers can align to the same radius the card uses.
export const GLASS_RADIUS = 22;
