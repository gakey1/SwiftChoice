// The three modules with their colours and wording: amber for Fuel, green for
// Focus, purple for Priority, and teal on anything shared between them.
//
// The types below are what enforce the module-colour rule. A single-module
// screen takes a Module and gets only that colour; a wrong one fails to build.

import { colors } from "@/theme/tokens";

export type ModuleKey = "fuel" | "focus" | "priority";

export type Module = {
  key: ModuleKey;
  name: "Fuel" | "Focus" | "Priority";
  // The small picture for each module (the plate, the pin, the tick). These are
  // the only picture characters used anywhere in the app. Shown inside ModuleIcon
  // and a few other places as a quick visual label.
  glyph: string;
  color: string; // the main colour, as a hex code
  c700: string; // a darker shade, used when a button is pressed
  tint: string; // a very faint version of the colour, for backgrounds
  sub: string; // the small line under the module's card on the home screen
  prompt: string; // the question shown at the top of the module's screen
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

// Looks up a module by its key. The type makes sure the key is a real module.
export function getModule(key: ModuleKey): Module {
  return MODULES[key];
}
