// The coin heads-up display: a small pill fixed at the top-right of every
// signed-in screen showing the coins earned so far, matching the mockup. It
// reads the shared progress, so it stays in sync as coins are earned anywhere,
// and it is rendered once as an overlay above the navigator (see RootNavigator)
// so its position is identical on every screen. It ignores touches so it never
// blocks the UI underneath.

import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProgress } from "@/features/progress/ProgressProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { T } from "@/theme/tokens";

// How much top space a screen should leave, below the safe-area inset, so its
// content clears the floating HUD with room to breathe. Screens add this to
// their top padding.
export const HUD_CLEARANCE = 60;

export function XpHud() {
  const { progress } = useProgress();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + 4, right: T.spacing.pageX }]}
    >
      <View style={[styles.pill, { backgroundColor: colors.cardSolid, borderColor: colors.cardLine }]}>
        <Text style={styles.coin}>🪙</Text>
        <Text style={[styles.count, { color: colors.fuel }]}>{progress.coins}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 50,
    elevation: 50,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: T.radii.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  coin: { fontSize: 14 },
  count: { fontFamily: T.font.monoMedium, fontSize: T.fontSize.body },
});
