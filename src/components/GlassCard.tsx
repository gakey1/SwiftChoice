// A frosted-glass surface, the card style from the Arcade mockup. It blurs
// whatever sits behind it (the ambient background glows) and lays a translucent
// theme tint plus a hairline border on top, so cards read as frosted glass
// rather than flat fills. Colours follow the active theme.
//
// Usage: wrap content in <GlassCard style={{ padding: 16, marginBottom: 14 }}>.
// The caller's style controls layout (padding, margin, width); the blur fills
// the whole rounded rectangle underneath.

import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

import { useTheme } from "@/theme/ThemeProvider";

export type GlassCardProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // Blur strength (0-100). The default suits the mockup's cards; the nav bar
  // uses a stronger blur.
  intensity?: number;
};

export function GlassCard({ children, style, intensity }: GlassCardProps) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.cardLine }, style]}>
      <BlurView
        intensity={intensity ?? 24}
        tint={isDark ? "dark" : "light"}
        // iOS blurs natively. This names the Android backend, but on its own it
        // is no longer enough: expo-blur 56 also wants a blurTarget ref, and
        // without one it falls back to no blur at all, which is why Android has
        // never shown the frosted look. Tracked as its own item in the backlog,
        // since threading that ref through touches every screen using this.
        blurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
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

// Kept so callers can align to the same radius the glass uses.
export const GLASS_RADIUS = 22;
