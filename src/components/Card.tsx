// A plain white card with a light border and a soft shadow. It is used all over
// the app: the module cards on the home screen, the recommendation card, the
// settings rows, and the history list. The amount of padding can be set.

import { Pressable, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { T } from "@/theme/tokens";

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
  const elevation = rest ? T.elevation.rest : T.elevation.card;
  const baseStyle = [styles.card, { padding: pad }, elevation, style];

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
    backgroundColor: T.surface,
    borderRadius: T.radii.card,
    borderWidth: 1,
    borderColor: T.border,
  },
  pressed: {
    opacity: 0.92,
  },
});
