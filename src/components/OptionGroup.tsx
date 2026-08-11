// A pick-one input: a label, the chosen value, and a row of equal-width
// buttons. Used for the Fuel choices (budget, prep time, distance). The chosen
// button is tinted in its module's colour, which the type system enforces.

// Tap handling, the labels, and the row layout.
import { Pressable, StyleSheet, Text, View } from "react-native";

// The module type, which carries the key the accent is looked up by.
import type { Module } from "@/theme/modules";
// Looks up a module's accent in the active theme.
import { moduleAccent } from "@/theme/themes";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";
// Design tokens: fonts, spacing, radii.
import { T } from "@/theme/tokens";

// Generic over the option type, so a caller passing budget levels gets back a
// budget level. Without the generic every caller would receive a bare string
// and have to cast it, which is where the wrong value gets in.
export type OptionGroupProps<TValue extends string> = {
  label: string;
  options: readonly TValue[];
  value: TValue;
  onChange: (next: TValue) => void;
  module: Module;
};

// Controlled, like TextField: the chosen value comes in as a prop and changes
// go out through onChange, so this never disagrees with the screen's state.
export function OptionGroup<TValue extends string>({
  label,
  options,
  value,
  onChange,
  module,
}: OptionGroupProps<TValue>) {
  const { colors } = useTheme();

  // The accent is looked up from the module rather than passed in as a colour,
  // which is what keeps the module-colour rule enforceable: a Fuel group cannot
  // be handed green, because the caller never chooses the colour at all.
  const accent = moduleAccent(colors, module.key);
  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.value, { color: accent.color }]}>{value}</Text>
      </View>
      {/* Each option is flex: 1 inside a row, so the buttons share the width
          evenly however many there are, rather than being sized by their text. */}
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
              // Announced as a radio, because that is what this is: one choice
              // from a set. Passing selected as state rather than baking it
              // into the label lets the screen reader phrase it its own way.
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

// The label-and-value header, the row of buttons, and one button. Colours are
// set above, since they depend on which option is selected.
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
