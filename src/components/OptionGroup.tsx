// Module-scoped option picker: a label, the currently-selected value, and a
// row of equal-width selectable cards. Used for Fuel constraints (Budget,
// Prep Time, Distance) and any similar pick-one input.
//
// Module-colour scoping: the selected state's tint and border come from the
// supplied `module`. Passing the wrong module's colour mid-render is
// prevented at compile time by the Module type.

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Module } from "@/theme/modules";
import { T } from "@/theme/tokens";

export type OptionGroupProps<TValue extends string> = {
  label: string;
  options: readonly TValue[];
  value: TValue;
  onChange: (next: TValue) => void;
  module: Module;
};

export function OptionGroup<TValue extends string>({
  label,
  options,
  value,
  onChange,
  module,
}: OptionGroupProps<TValue>) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: module.color }]}>{value}</Text>
      </View>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option === value;
          const borderColor = selected ? module.color : T.border;
          const backgroundColor = selected ? module.tint : T.surface;
          const textColor = selected ? module.color : T.fg2;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.option, { backgroundColor, borderColor }]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option}
            >
              <Text style={[styles.optionLabel, { color: textColor }]}>{option}</Text>
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
    color: T.fg1,
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
