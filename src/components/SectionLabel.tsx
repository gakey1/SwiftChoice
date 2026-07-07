// A small bold heading used inside cards and forms to name a section, like
// "This Week" above the stats on the home screen.

import { StyleSheet, Text } from "react-native";
import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";

import { T } from "@/theme/tokens";

export type SectionLabelProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
};

// Shows the heading text using the shared section-heading styling.
export function SectionLabel({ children, style }: SectionLabelProps) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: T.font.bold,
    fontSize: 13,
    color: T.fg1,
    marginBottom: T.spacing[3],
  },
});
