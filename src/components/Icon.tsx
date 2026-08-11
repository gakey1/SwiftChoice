// The app's icon component. It wraps the Feather set, so the rest of the app
// writes <Icon name="..." /> and never names the icon library.

// The icon set underneath.
import { Feather } from "@expo/vector-icons";
// Used to borrow Feather's own list of valid names.
import type { ComponentProps } from "react";

// The active theme's colours, for the default tint.
import { useTheme } from "@/theme/ThemeProvider";

// Every name Feather accepts, taken from the set itself so a typo fails to
// compile rather than rendering nothing.
export type IconName = ComponentProps<typeof Feather>["name"];

// Which icon to draw, how big, and in what colour.
export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
};

// Draws the icon. With no colour given it falls back to the theme's primary
// text colour, so icons match the text they sit beside.
export function Icon({ name, size = 22, color }: IconProps) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.ink} />;
}
