// A small bold heading used inside cards and forms to name a section, like
// "This Week" above the stats on the home screen.

// The heading text and its stylesheet.
import { StyleSheet, Text } from "react-native";
// The type for the heading's contents.
import type { ReactNode } from "react";
// The types for the style a caller can pass in.
import type { StyleProp, TextStyle } from "react-native";

// Design tokens: fonts, spacing.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// The heading text, plus an optional style override.
export type SectionLabelProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
};

// Draws the heading in the shared section styling, tinted by the active theme.
export function SectionLabel({ children, style }: SectionLabelProps) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.ink2 }, style]}>{children}</Text>;
}

// The mono font and letter spacing give the coded Arcade look. The colour is
// set above, so it follows the dark/light toggle.
const styles = StyleSheet.create({
  label: {
    fontFamily: T.font.monoMedium,
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: T.spacing[3],
  },
});
