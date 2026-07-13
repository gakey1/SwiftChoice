// A small bold heading used inside cards and forms to name a section, like
// "This Week" above the stats on the home screen.

import { StyleSheet, Text } from "react-native";
import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";

import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export type SectionLabelProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
};

// Shows the heading text using the shared section-heading styling, in the mono
// font for the coded Arcade look. Its colour comes from the active theme.
export function SectionLabel({ children, style }: SectionLabelProps) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.ink3 }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: T.font.mono,
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: T.spacing[3],
  },
});
