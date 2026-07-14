// A small icon set for the gamification UI (streak flame, achievement badges,
// module glyphs). Some shapes the mockup draws by hand do not exist in Feather
// (a flame, a trophy, a fork and knife), so those come from MaterialCommunityIcons
// and the rest from Feather. Both sets ship with @expo/vector-icons, so there is
// no new dependency. Callers use one semantic name and this picks the right set.

import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type FeatherName = ComponentProps<typeof Feather>["name"];
type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Semantic glyph names used across the gamification UI, mapped to whichever set
// has the shape that matches the mockup.
const MCI: Record<string, MciName> = {
  fire: "fire",
  trophy: "trophy",
  medal: "medal",
  crown: "crown",
  fork: "silverware-fork-knife",
  target: "target",
  flag: "flag",
};

const FEATHER: Record<string, FeatherName> = {
  check: "check-circle",
  star: "star",
  compass: "compass",
  award: "award",
  lock: "lock",
  zap: "zap",
};

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

export type GameIconProps = {
  glyph: GameGlyph;
  size?: number;
  color: string;
};

export function GameIcon({ glyph, size = 20, color }: GameIconProps) {
  const mci = MCI[glyph];
  if (mci) {
    return <MaterialCommunityIcons name={mci} size={size} color={color} />;
  }
  const feather = FEATHER[glyph] ?? "star";
  return <Feather name={feather} size={size} color={color} />;
}
