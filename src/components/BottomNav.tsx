// The bar of three tabs at the bottom of the app: Home, History and Settings.
// The tab you are on is shown in teal. This bar shows on every main screen, so
// it always uses teal rather than one module's colour.
//
// It uses the solid card surface (a dark purple in dark mode, near-white in
// light mode) with a clear top border, matching the mockup's dark nav bar and
// staying visible instead of washing out. A translucent blur was tried first but
// read too light over dark content, so a solid surface is used deliberately.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import type { IconName } from "@/components/Icon";
import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export type BottomNavKey = "home" | "history" | "settings";

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

export type BottomNavProps = {
  active: BottomNavKey;
  onNavigate: (key: BottomNavKey) => void;
};

// Draws the three tabs and highlights whichever one is active in teal.
export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const { colors } = useTheme();

  // This bar is a custom tabBar, so react-navigation hands it no safe-area
  // padding of its own. Android has drawn edge to edge since SDK 35, which puts
  // the system navigation directly over the bottom of the app: on a gesture
  // phone that is a 24dp pill, but on three-button navigation it is a 48dp bar,
  // and the labels sat underneath it. The 18 is kept as a floor so the bar keeps
  // its designed breathing room on a device that reports no inset at all.
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
