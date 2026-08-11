// The icon set for the gamification UI: streak flame, achievement badges,
// module glyphs. Some shapes the mockup draws by hand are not in Feather (a
// flame, a trophy, a fork and knife), so those come from MaterialCommunityIcons
// and the rest from Feather. Both ship with @expo/vector-icons, so neither is a
// new dependency. Callers give one semantic name and this picks the set.

// The two icon sets this component draws from.
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
// Used to borrow each set's own list of valid names.
import type { ComponentProps } from "react";

// The names each set accepts, taken from the set itself so a typo fails to
// compile rather than rendering nothing.
type FeatherName = ComponentProps<typeof Feather>["name"];
type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// The glyphs that come from MaterialCommunityIcons, because Feather has no
// shape close enough to the mockup.
const MCI: Record<string, MciName> = {
  fire: "fire",
  trophy: "trophy",
  medal: "medal",
  crown: "crown",
  fork: "silverware-fork-knife",
  target: "target",
  flag: "flag",
};

// The glyphs that come from Feather, which matches the app's line-icon look.
const FEATHER: Record<string, FeatherName> = {
  check: "check-circle",
  star: "star",
  compass: "compass",
  award: "award",
  lock: "lock",
  zap: "zap",
};

// The names callers use. One list across both sets, so a screen never has to
// know which library a glyph comes from.
export type GameGlyph =
  | "fire"
  | "trophy"
  | "medal"
  | "crown"
  | "fork"
  | "target"
  | "flag"
  | "check"
  | "star"
  | "compass"
  | "award"
  | "lock"
  | "zap";

// Which glyph to draw, how big, and in what colour.
export type GameIconProps = {
  glyph: GameGlyph;
  size?: number;
  color: string;
};

// Looks the name up in MaterialCommunityIcons first, then Feather, falling back
// to a star so an unmapped name still draws something.
export function GameIcon({ glyph, size = 20, color }: GameIconProps) {
  const mci = MCI[glyph];
  if (mci) {
    return <MaterialCommunityIcons name={mci} size={size} color={color} />;
  }
  const feather = FEATHER[glyph] ?? "star";
  return <Feather name={feather} size={size} color={color} />;
}
