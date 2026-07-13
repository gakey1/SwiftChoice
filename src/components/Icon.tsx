// A simple icon component. It wraps the Feather icon set so the rest of the app
// just uses <Icon name="..." /> and does not need to know which icon library is
// underneath.

import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { useTheme } from "@/theme/ThemeProvider";

export type IconName = ComponentProps<typeof Feather>["name"];

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

// Shows a Feather icon at the given size and colour. When no colour is given it
// falls back to the active theme's primary text colour.
export function Icon({ name, size = 22, color }: IconProps) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.ink} />;
}
