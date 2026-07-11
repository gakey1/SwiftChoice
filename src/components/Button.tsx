// A reusable button with four looks, so buttons across the app stay consistent.
//  - accept:  filled teal. The main "Accept" button on a result screen.
//  - module:  filled with a module's own colour, for the main button on a module
//             screen (like "Decide for Me" on Fuel).
//  - reroll:  plain grey. The secondary button that is next to Accept.
//  - outline: see-through with a coloured border, for less important actions.

import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

import { T } from "@/theme/tokens";

type Variant = "accept" | "module" | "reroll" | "outline";

export type ButtonProps = {
  variant?: Variant;
  // Needed for the module and outline looks, where the colour comes from a
  // module. For accept and reroll the colour is always teal or grey, so it is
  // ignored.
  color?: string;
  c700?: string;
  onPress?: () => void;
  children: ReactNode;
  // An optional smaller label shown to the right of the main one, like the count
  // in "Reroll (1 remaining)".
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

// Works out the background (or border) colour for each button look.
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

// Works out the text colour for each button look.
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

// Works out the colour of the smaller side label.
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
