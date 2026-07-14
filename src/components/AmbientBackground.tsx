// The soft colour wash behind the Arcade screens. Three large accent-coloured
// circles (amber, purple, teal) sit at fixed spots and a heavy blur melts them
// into drifting glows, which is the "gradient" look from the mockup. It is
// purely decorative: it absolute-fills its parent and ignores touches, so a
// screen renders it as the first child, behind the real content.
//
// Positions mirror the mockup's three blobs on a phone-width frame.

import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { useTheme } from "@/theme/ThemeProvider";

export function AmbientBackground() {
  const { colors, isDark } = useTheme();
  const opacity = isDark ? 0.5 : 0.65;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          styles.blob,
          { backgroundColor: colors.fuel, left: -40, top: 60, width: 200, height: 200, opacity },
        ]}
      />
      <View
        style={[
          styles.blob,
          { backgroundColor: colors.priority, left: 220, top: -30, width: 180, height: 180, opacity },
        ]}
      />
      <View
        style={[
          styles.blob,
          { backgroundColor: colors.teal, left: 120, top: 520, width: 220, height: 220, opacity },
        ]}
      />
      {/* The heavy blur is what turns the hard circles into soft glows. On
          Android, BlurView needs this backend or it renders nothing (leaving the
          hard circles showing). */}
      <BlurView
        intensity={100}
        tint={isDark ? "dark" : "light"}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
});
