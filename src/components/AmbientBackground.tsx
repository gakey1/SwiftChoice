// The soft colour wash behind the Arcade screens. Three large accent-coloured
// circles (amber, purple, teal) sit at fixed spots and a heavy blur melts them
// into drifting glows, which is the "gradient" look from the mockup. It is
// purely decorative: it absolute-fills its parent and ignores touches, so a
// screen renders it as the first child, behind the real content.
//
// Positions mirror the mockup's three blobs on a phone-width frame.

import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";

import { useRegisterBlurTarget } from "@/components/BlurTarget";
import { useTheme } from "@/theme/ThemeProvider";

export function AmbientBackground() {
  const { colors, isDark } = useTheme();

  // Android needs to be told which view to blur. iOS blurs whatever is behind
  // the BlurView natively and ignores this entirely.
  const targetRef = useRef<View>(null);

  // Glass cards elsewhere on the screen blur this same wash, and they sit too
  // far away in the tree to reach the ref directly, so it is published for them.
  const registerBlurTarget = useRegisterBlurTarget();
  useEffect(() => {
    registerBlurTarget(targetRef.current);
    return () => registerBlurTarget(null);
  }, [registerBlurTarget]);
  // Light mode keeps the blobs faint so the bright accent washes never overpower
  // the dark text that sits directly on the background (headers, labels, filter
  // option text). Dark mode can carry a stronger glow against the deep bg.
  const opacity = isDark ? 0.5 : 0.34;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* The circles live inside a BlurTargetView so Android has something
          concrete to blur. On iOS this is an ordinary view and the BlurView
          below simply blurs what is behind it. */}
      <BlurTargetView ref={targetRef} style={StyleSheet.absoluteFill}>
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
      </BlurTargetView>
      {/* The heavy blur is what turns the hard circles into soft glows. */}
      <BlurView
        intensity={100}
        tint={isDark ? "dark" : "light"}
        blurMethod="dimezisBlurView"
        blurTarget={targetRef}
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
