// Four-variant button per the design system.
// - accept:  filled with the universal teal accent. The primary Accept action on result screens.
// - module:  filled with a module's colour. Use for module-screen primary actions
//            (e.g. "Find my meal" on Fuel input).
// - reroll:  neutral gray fill. Secondary action sibling to Accept on result screens.
// - outline: transparent fill with coloured border. Tertiary affordance ("Add task" etc.).

import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

import { T } from "@/theme/tokens";

type Variant = "accept" | "module" | "reroll" | "outline";

export type ButtonProps = {
  variant?: Variant;
  // Required for module/outline variants where the colour comes from a module.
  // For accept/reroll the colour is the universal teal or neutral and is ignored.
  color?: string;
  c700?: string;
  onPress?: () => void;
  children: ReactNode;
  // Optional sub-label rendered to the right of the main label.
  // Pattern used by "Reroll (1 remaining)".
  sub?: string;
  disabled?: boolean;
};

export function Button({
  variant = "accept",
  color = T.teal,
  c700 = T.teal700,
  onPress,
  children,
  sub,
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styleFor(variant, color, c700, pressed),
        disabled ? styles.disabled : null,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <Text style={[styles.label, labelStyleFor(variant, color)]}>{children}</Text>
        {sub ? <Text style={[styles.sub, subStyleFor(variant)]}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

function styleFor(variant: Variant, color: string, c700: string, pressed: boolean) {
  switch (variant) {
    case "accept":
    case "module":
      return { backgroundColor: pressed ? c700 : color };
    case "reroll":
      return { backgroundColor: pressed ? T.neutral700 : T.neutral };
    case "outline":
      return {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: color,
      };
  }
}

function labelStyleFor(variant: Variant, color: string) {
  switch (variant) {
    case "accept":
    case "module":
      return { color: "#FFFFFF" };
    case "reroll":
      return { color: T.fg1 };
    case "outline":
      return { color, fontFamily: T.font.semibold };
  }
}

function subStyleFor(variant: Variant) {
  if (variant === "reroll") return { color: T.fg3 };
  if (variant === "outline") return { color: T.fg2 };
  return { color: "rgba(255,255,255,0.85)" };
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    height: 54,
    borderRadius: T.radii.button,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.spacing[2],
  },
  label: {
    fontFamily: T.font.bold,
    fontSize: T.fontSize.subtitle,
  },
  sub: {
    fontFamily: T.font.medium,
    fontSize: T.fontSize.body,
  },
  disabled: {
    opacity: 0.5,
  },
});
