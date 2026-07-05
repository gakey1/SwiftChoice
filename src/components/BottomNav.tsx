// Three-tab bottom navigation bar.
// Tabs: Home, History, Settings.
// Active tab uses the universal teal accent and a slightly heavier icon stroke.
// Module-colour scoping does NOT apply here - bottom nav is cross-screen
// and always uses teal.

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import type { IconName } from "@/components/Icon";
import { T } from "@/theme/tokens";

export type BottomNavKey = "home" | "history" | "settings";

type Item = {
  key: BottomNavKey;
  label: "Home" | "History" | "Settings";
  icon: IconName;
};

const ITEMS: readonly Item[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "history", label: "History", icon: "clock" },
  { key: "settings", label: "Settings", icon: "settings" },
] as const;

export type BottomNavProps = {
  active: BottomNavKey;
  onNavigate: (key: BottomNavKey) => void;
};

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <View style={styles.bar}>
      {ITEMS.map((item) => {
        const on = item.key === active;
        const tint = on ? T.teal : T.fg3;
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
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
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
