// A small rounded square, tinted in a module's colour, with the module's glyph
// inside. Shown on the home cards, in the history list, and on module headers.
// It takes a whole module rather than a colour, so the tint and the glyph can
// never come from different modules.

// The badge itself and the glyph text inside it.
import { StyleSheet, Text, View } from "react-native";

// The module type, which carries both the key and the glyph.
import type { Module } from "@/theme/modules";
// Looks up a module's accent in the active theme.
import { moduleAccent } from "@/theme/themes";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// Which module to draw, and how big.
export type ModuleIconProps = {
  module: Module;
  // How big the badge is. The corner rounding is worked out from the size, so it
  // looks right whatever size is used.
  size?: number;
};

// Draws the tinted square with the module's glyph centred in it.
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

// Centres the glyph. Size, rounding and tint are set above, since they all
// depend on the size prop and the module.
const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
});
