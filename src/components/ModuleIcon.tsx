// A small rounded square, tinted in a module's colour, with the module's little
// picture inside. Shown on the home cards, in the history list, and on module
// headers. It only accepts a real module, so the colour and picture always match
// the right module.

import { StyleSheet, Text, View } from "react-native";

import type { Module } from "@/theme/modules";
import { moduleAccent } from "@/theme/themes";
import { useTheme } from "@/theme/ThemeProvider";

export type ModuleIconProps = {
  module: Module;
  // How big the badge is. The corner rounding is worked out from the size, so it
  // looks right whatever size is used.
  size?: number;
};

export function ModuleIcon({ module, size = 44 }: ModuleIconProps) {
  const { colors } = useTheme();
  const accent = moduleAccent(colors, module.key);
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.27,
          backgroundColor: accent.tint,
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
