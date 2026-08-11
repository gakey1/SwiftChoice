// The coin heads-up display: a small pill at the top right of every signed-in
// screen showing the coins earned so far. It is rendered once above the
// navigator (see RootNavigator), so it sits in the same place on every screen,
// and it ignores touches so it never blocks what is underneath.

// Layout, the count text, and the platform check for the coin.
import { Platform, StyleSheet, Text, View } from "react-native";
// The top inset, so the pill sits below the notch.
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The drawn coin used on Android.
import { CoinIcon } from "@/components/CoinIcon";
// The shared coin balance, so the pill stays in sync wherever coins are earned.
import { useProgress } from "@/features/progress/ProgressProvider";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";
// Design tokens: fonts, spacing, radii.
import { T } from "@/theme/tokens";

// How much top space a screen leaves, below the safe-area inset, so its content
// clears the floating HUD. Screens add this to their top padding.
export const HUD_CLEARANCE = 60;

// Draws the pill: a coin, then the count in the Fuel amber.
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
        {/* iOS draws the coin from Apple's emoji font, which is the look being
            matched. Android's emoji font draws a different coin, so it gets the
            vector one instead. */}
        {Platform.OS === "android" ? <CoinIcon /> : <Text style={styles.coin}>🪙</Text>}
        <Text style={[styles.count, { color: colors.fuel }]}>{progress.coins}</Text>
      </View>
    </View>
  );
}

// The floating wrapper, the pill itself, and the two pieces inside it.
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
