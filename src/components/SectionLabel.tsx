// Small bold heading used inside cards and forms to label a section.
// E.g. "This Week" on the Home screen above the stats panel.

import { StyleSheet, Text } from "react-native";
import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";

import { T } from "@/theme/tokens";

export type SectionLabelProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
};

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
