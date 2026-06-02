// Single-icon component. Wraps @expo/vector-icons' Feather family so the
// rest of the codebase consumes a stable API regardless of which native
// icon font ships underneath.

import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { colors } from "@/theme/tokens";

export type IconName = ComponentProps<typeof Feather>["name"];

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 22, color = colors.fg1 }: IconProps) {
  return <Feather name={name} size={size} color={color} />;
}
