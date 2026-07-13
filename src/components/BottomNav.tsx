// The bar of three tabs at the bottom of the app: Home, History and Settings.
// The tab you are on is shown in teal. This bar shows on every main screen, so
// it always uses teal rather than one module's colour.

import { Pressable, StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.cardLine }]}>
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
            <Text style={[styles.label, { color: tint }]}>{item.label}</Text>
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
    paddingBottom: 18,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontFamily: T.font.semibold,
    fontSize: T.fontSize.micro,
  },
});
