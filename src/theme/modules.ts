// SwiftChoice module registry.
// Source of truth for module-colour scoping and module-specific copy.
// Module-colour scoping is a brand law: amber only on Fuel screens,
// green only on Focus, purple only on Priority. Teal is the only
// universal accent.
//
// Components that legitimately render across all modules accept NO
// `module` prop and use T.teal exclusively.
//
// Components scoped to one module accept `module: Module` and use its
// colours only. The discriminated-union type below makes invalid
// modules fail to compile.

import { colors } from "@/theme/tokens";

export type ModuleKey = "fuel" | "focus" | "priority";

export type Module = {
  key: ModuleKey;
  name: "Fuel" | "Focus" | "Priority";
  // Glyph: the three module-glyph emoji. The only emoji that ever appear
  // in the product (per the design system brand law). Used as visual
  // shorthand inside ModuleIcon and elsewhere.
  glyph: string;
  color: string; // base hex
  c700: string; // pressed / darker variant
  tint: string; // ~12% alpha background
  sub: string; // home-card subtitle
  prompt: string; // module-screen prompt
};

export const MODULES: Record<ModuleKey, Module> = {
  fuel: {
    key: "fuel",
    name: "Fuel",
    glyph: "🍽️",
    color: colors.fuel,
    c700: colors.fuel700,
    tint: colors.fuelTint,
    sub: "Decide what to eat",
    prompt: "What should you eat?",
  },
  focus: {
    key: "focus",
    name: "Focus",
    glyph: "📍",
    color: colors.focus,
    c700: colors.focus700,
    tint: colors.focusTint,
    sub: "Find your ideal workspace",
    prompt: "Find your ideal workspace",
  },
  priority: {
    key: "priority",
    name: "Priority",
    glyph: "✓",
    color: colors.priority,
    c700: colors.priority700,
    tint: colors.priorityTint,
    sub: "Know what to tackle first",
    prompt: "What should you do first?",
  },
};

// Helper to look up a module by its key with type safety.
export function getModule(key: ModuleKey): Module {
  return MODULES[key];
}
