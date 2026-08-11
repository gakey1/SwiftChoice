// The bottom tab bar: Home, History and Settings. It shows on every main
// screen, so the active tab is teal rather than any one module's colour.
// A solid surface with a top border, not a translucent blur.

// Row layout, tap handling and the labels.
import { Pressable, StyleSheet, Text, View } from "react-native";
// The bottom inset, so the labels clear the system navigation.
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The app's icon component.
import { Icon } from "@/components/Icon";
// The icon names Icon accepts, so a wrong name fails to compile.
import type { IconName } from "@/components/Icon";
// Design tokens: fonts, spacing, sizes.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// Which tab is showing. Screens pass one of these to say where they are.
export type BottomNavKey = "home" | "history" | "settings";

// One tab: its key, the word under the icon, and which icon to draw.
type Item = {
  key: BottomNavKey;
  label: "Home" | "History" | "Settings";
  icon: IconName;
};

// The three tabs, in the order they appear, each with its label and icon.
const ITEMS: readonly Item[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "history", label: "History", icon: "clock" },
  { key: "settings", label: "Settings", icon: "settings" },
] as const;

// active is the tab to highlight; onNavigate fires with the tab that was tapped.
export type BottomNavProps = {
  active: BottomNavKey;
  onNavigate: (key: BottomNavKey) => void;
};

// Draws the three tabs and highlights whichever one is active in teal.
export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const { colors } = useTheme();

  // This bar is a custom tabBar, so react-navigation gives it no safe-area
  // padding of its own, and Android draws edge to edge, which puts the system
  // navigation over the bottom of the app: 24dp for gestures, 48dp for
  // three-button. The 18 is a floor for a device reporting no inset at all.
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.cardSolid,
          borderTopColor: colors.cardLine,
          paddingBottom: Math.max(insets.bottom, 18),
        },
      ]}
    >
      {ITEMS.map((item) => {
        const on = item.key === active;
        const tint = on ? colors.teal : colors.ink3;
        return (
          <Pressable
            key={item.key}
            onPress={() => onNavigate(item.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={item.label}
          >
            <Icon name={item.icon} size={23} color={tint} />
            <Text style={[styles.label, { color: tint, fontFamily: on ? T.font.bold : T.font.semibold }]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Layout for the bar itself, the equal-width tabs, and the label under an icon.
const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: T.spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: T.fontSize.micro,
  },
});
