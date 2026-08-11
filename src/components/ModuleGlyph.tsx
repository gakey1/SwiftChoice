// The line icon that stands for each module, matching the Arcade mockup: Fuel is
// a fork and knife, Focus is a target, Priority is a flag. These come from
// MaterialCommunityIcons, already bundled with @expo/vector-icons, which has the
// exact shapes the mockup draws by hand.

// The icon set underneath.
import { MaterialCommunityIcons } from "@expo/vector-icons";
// Used to borrow the set's own list of valid names.
import type { ComponentProps } from "react";

// The three module keys, so only a real module can be asked for.
import type { ModuleKey } from "@/theme/modules";

// Every name the set accepts, taken from the set itself so a typo fails to
// compile rather than rendering nothing.
type MCIName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// One glyph per module. Keyed by ModuleKey, so adding a module without giving
// it an icon is a compile error.
const GLYPH: Record<ModuleKey, MCIName> = {
  fuel: "silverware-fork-knife",
  focus: "target",
  priority: "flag",
};

// Which module's glyph to draw, how big, and in what colour.
export type ModuleGlyphProps = {
  moduleKey: ModuleKey;
  size?: number;
  color: string;
};

// Draws the glyph for the given module.
export function ModuleGlyph({ moduleKey, size = 22, color }: ModuleGlyphProps) {
  return <MaterialCommunityIcons name={GLYPH[moduleKey]} size={size} color={color} />;
}
