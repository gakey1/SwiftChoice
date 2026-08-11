// A card surface with a border and a soft shadow, used all over the app: the
// module cards on Home, the recommendation card, the settings rows, the history
// list. Colours come from the active theme, so it follows the dark/light toggle.

// The plain box, the tappable version, and the shared stylesheet.
import { Pressable, StyleSheet, View } from "react-native";
// The type for whatever a caller puts inside the card.
import type { ReactNode } from "react";
// The types for the style a caller can pass in.
import type { StyleProp, ViewStyle } from "react-native";

// Design tokens: spacing, radii, elevation presets.
import { T } from "@/theme/tokens";
// The active theme's colours.
import { useTheme } from "@/theme/ThemeProvider";

// Everything a caller can set. Only the contents are required.
export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  pad?: number;
  // When true, uses a slightly stronger shadow, for the main recommendation card.
  rest?: boolean;
  style?: StyleProp<ViewStyle>;
};

// If an onPress is given the card can be tapped, otherwise it is a plain box.
export function Card({ children, onPress, pad = T.spacing[4], rest = false, style }: CardProps) {
  const { colors } = useTheme();
  const elevation = rest ? T.elevation.rest : T.elevation.card;
  // Themed surface and border by default; a passed `style` still overrides them.
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

// The card's shape, and the dimming shown while a tappable card is held.
// Colours, padding and shadow are applied above, not here.
const styles = StyleSheet.create({
  card: {
    borderRadius: T.radii.card,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
  },
});
