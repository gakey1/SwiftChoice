// The line icon that stands for each module, matching the Arcade mockup: Fuel is
// a fork and knife, Focus is a target, Priority is a flag. These come from the
// MaterialCommunityIcons set (already bundled with @expo/vector-icons, so no new
// dependency), which has the exact shapes the mockup draws by hand.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { ModuleKey } from "@/theme/modules";

type MCIName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const GLYPH: Record<ModuleKey, MCIName> = {
  fuel: "silverware-fork-knife",
  focus: "target",
  priority: "flag",
};

export type ModuleGlyphProps = {
  moduleKey: ModuleKey;
  size?: number;
  color: string;
};

export function ModuleGlyph({ moduleKey, size = 22, color }: ModuleGlyphProps) {
  return <MaterialCommunityIcons name={GLYPH[moduleKey]} size={size} color={color} />;
}
