// The shared button, in four looks, so buttons across the app stay consistent.
// Colours come from the active theme, so it follows the dark/light toggle.
//  - accept:  filled teal. The main "Accept" button on a result screen.
//  - module:  filled with a module's own colour, for the main button on a module
//             screen (like "Decide for Me" on Fuel).
//  - reroll:  plain chip fill. The secondary button next to Accept.
//  - outline: see-through with a coloured border, for less important actions.

// Tap handling, the label, and the row that holds label and sub-label.
import { Pressable, StyleSheet, Text, View } from "react-native";
// The type for whatever a caller puts inside the button.
import type { ReactNode } from "react";

// Design tokens: fonts, spacing, radii.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// The four looks a button can take.
type Variant = "accept" | "module" | "reroll" | "outline";

// Everything a caller can set. Only the label is required.
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

// Picks the fill, label colour and sub-label colour for the chosen look, then
// draws the button.
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

  // The background, or border, for each look.
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

  // The main label colour. On the filled looks the label sits on the accent, so
  // it uses the theme's on-accent colour.
  const labelStyle =
    variant === "outline"
      ? { color: accent, fontFamily: T.font.semibold }
      : variant === "reroll"
        ? { color: colors.ink }
        : { color: colors.onAccent };

  // The smaller side-label colour. On the filled looks it is the on-accent
  // colour, dimmed so it reads as secondary.
  const subStyle =
    variant === "reroll"
      ? { color: colors.ink3 }
      : variant === "outline"
        ? { color: colors.ink2 }
        : { color: colors.onAccent, opacity: 0.75 };

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

// Size and shape shared by all four looks, plus the two text sizes and the
// dimming applied when disabled. Colours are set above, not here.
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
