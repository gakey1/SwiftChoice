// A pick-one input: a label, the value currently chosen, and a row of
// equal-width buttons to choose from. Used for the Fuel choices (budget, prep
// time, distance) and any similar pick-one input. The chosen button is tinted in
// the module's colour (from the active theme), and the type makes sure the right
// module is used.

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Module } from "@/theme/modules";
import { moduleAccent } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";
import { T } from "@/theme/tokens";

export type OptionGroupProps<TValue extends string> = {
  label: string;
  options: readonly TValue[];
  value: TValue;
  onChange: (next: TValue) => void;
  module: Module;
};

// Draws the label and the row of options, highlighting the one that is chosen.
export function OptionGroup<TValue extends string>({
  label,
  options,
  value,
  onChange,
  module,
}: OptionGroupProps<TValue>) {
  const { colors } = useTheme();
  const accent = moduleAccent(colors, module.key);
  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.value, { color: accent.color }]}>{value}</Text>
      </View>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? accent.tint : colors.chip,
                  borderColor: selected ? accent.color : colors.cardLine,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option}
            >
              <Text style={[styles.optionLabel, { color: selected ? accent.color : colors.ink2 }]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: T.spacing[3],
  },
  label: {
    fontFamily: T.font.bold,
    fontSize: 18,
  },
  value: {
    fontFamily: T.font.bold,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    gap: T.spacing[3],
  },
  option: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: T.radii.button,
    paddingVertical: 18,
    paddingHorizontal: T.spacing[1],
    alignItems: "center",
  },
  optionLabel: {
    fontFamily: T.font.semibold,
    fontSize: 15,
  },
});
