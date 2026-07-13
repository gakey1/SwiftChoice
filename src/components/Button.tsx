// A reusable button with four looks, so buttons across the app stay consistent.
// Colours come from the active theme (via useTheme), so buttons follow the
// dark/light Arcade toggle.
//  - accept:  filled teal. The main "Accept" button on a result screen.
//  - module:  filled with a module's own colour, for the main button on a module
//             screen (like "Decide for Me" on Fuel).
//  - reroll:  plain chip fill. The secondary button that is next to Accept.
//  - outline: see-through with a coloured border, for less important actions.

import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

type Variant = "accept" | "module" | "reroll" | "outline";

export type ButtonProps = {
  variant?: Variant;
  // Needed for the module and outline looks, where the colour comes from a
  // module. When not given, accept / outline fall back to the theme's teal.
  color?: string;
  c700?: string;
  onPress?: () => void;
  children: ReactNode;
  // An optional smaller label shown to the right of the main one, like the count
  // in "Reroll (1 remaining)".
  sub?: string;
  disabled?: boolean;
};

// Dark ink sits on top of the bright accent fills (accept / module) so the label
// stays readable on the accent in both the dark and light Arcade themes.
const ACCENT_TEXT = "#141026";

export function Button({
  variant = "accept",
  color,
  c700,
  onPress,
  children,
  sub,
  disabled = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const accent = color ?? colors.teal;
  const accentPressed = c700 ?? accent;

  // The background (or border) colour for each look.
  function fillStyle(pressed: boolean) {
    switch (variant) {
      case "accept":
      case "module":
        return { backgroundColor: pressed ? accentPressed : accent };
      case "reroll":
        return { backgroundColor: colors.chip };
      case "outline":
        return { backgroundColor: "transparent", borderWidth: 1.5, borderColor: accent };
    }
  }

  // The main label colour for each look.
  const labelStyle =
    variant === "outline"
      ? { color: accent, fontFamily: T.font.semibold }
      : variant === "reroll"
        ? { color: colors.ink }
        : { color: ACCENT_TEXT };

  // The smaller side-label colour for each look.
  const subStyle =
    variant === "reroll"
      ? { color: colors.ink3 }
      : variant === "outline"
        ? { color: colors.ink2 }
        : { color: "rgba(20,16,38,0.7)" };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        fillStyle(pressed),
        disabled ? styles.disabled : null,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <Text style={[styles.label, labelStyle]}>{children}</Text>
        {sub ? <Text style={[styles.sub, subStyle]}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
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
