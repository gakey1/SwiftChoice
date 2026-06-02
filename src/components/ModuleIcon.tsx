// Tinted rounded-square badge containing the module's glyph emoji.
// Used on Home module cards, in the History list rows, and on module headers.
//
// Module-colour scoping: this component accepts only a valid Module object,
// so the tinted background and glyph always come from the right module.
// Passing an invalid module fails to compile.

import { StyleSheet, Text, View } from "react-native";

import type { Module } from "@/theme/modules";

export type ModuleIconProps = {
  module: Module;
  // Size in points. The radius is computed as size * 0.27 to keep the
  // visual rhythm regardless of size.
  size?: number;
};

export function ModuleIcon({ module, size = 44 }: ModuleIconProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.27,
          backgroundColor: module.tint,
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.46 }}>{module.glyph}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
});
