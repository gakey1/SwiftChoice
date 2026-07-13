// A card surface with a border and a soft shadow. Its colours come from the
// active theme (via useTheme), so it follows the dark/light Arcade toggle. It is
// used all over the app: the module cards on the home screen, the recommendation
// card, the settings rows, and the history list. The padding can be set, and a
// passed `style` still overrides the themed surface and border.

import { Pressable, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { T } from "@/theme/tokens";
import { useTheme } from "@/theme/ThemeProvider";

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  pad?: number;
  // When true, uses a slightly stronger shadow, for the main recommendation card.
  rest?: boolean;
  style?: StyleProp<ViewStyle>;
};

// If an onPress is given the card can be tapped, otherwise it is just a plain box.
export function Card({ children, onPress, pad = T.spacing[4], rest = false, style }: CardProps) {
  const { colors } = useTheme();
  const elevation = rest ? T.elevation.rest : T.elevation.card;
  // Themed surface + border by default; a passed `style` still overrides them.
  const themed = { backgroundColor: colors.card, borderColor: colors.cardLine };
  const baseStyle = [styles.card, themed, { padding: pad }, elevation, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [baseStyle, pressed ? styles.pressed : null]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: T.radii.card,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
  },
});
