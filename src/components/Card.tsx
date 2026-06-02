// White card with a hairline border, soft shadow, and configurable padding.
// The most-repeated object in the design system; used for home module cards,
// result-screen recommendation cards, settings rows, history entries.

import { Pressable, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { T } from "@/theme/tokens";

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  pad?: number;
  // Deeper shadow variant — used on the centrepiece recommendation card.
  rest?: boolean;
  style?: StyleProp<ViewStyle>;
};

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
