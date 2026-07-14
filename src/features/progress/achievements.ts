// The canonical achievement set. Defining it in one place means the Home player
// card, the Priority screen and (later) the History gallery all show the same
// badges with the same unlock rules, rather than each screen inventing its own.
//
// The core badges are computed only from the shared progress store, so they read
// identically on every screen. Streak is always present (listed first).

import type { GameGlyph } from "@/components/GameIcon";
import type { Progress } from "@/services/localdb/progressStorage";

export type Achievement = {
  id: string;
  name: string;
  glyph: GameGlyph;
  earned: boolean;
};

// The four core achievements shown on Home and Priority.
export function coreAchievements(p: Progress): Achievement[] {
  return [
    { id: "streak", name: "Streak", glyph: "fire", earned: p.completedCount >= 3 },
    { id: "finisher", name: "Finisher", glyph: "check", earned: p.completedCount >= 1 },
    { id: "ranked", name: "Ranked", glyph: "trophy", earned: p.ranked },
    { id: "lv5", name: "Lv 5", glyph: "star", earned: p.level >= 5 },
  ];
}

// Puts earned achievements before locked ones, keeping each group's own order
// (Array.sort is stable), so unlocked badges lead the row.
export function earnedFirst(list: Achievement[]): Achievement[] {
  return [...list].sort((a, b) => Number(b.earned) - Number(a.earned));
}
