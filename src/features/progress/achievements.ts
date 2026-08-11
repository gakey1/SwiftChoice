// The canonical achievement set. Defining it in one place means the Home player
// card, the Priority screen and (later) the History gallery all show the same
// badges with the same unlock rules, rather than each screen inventing its own.
//
// The core badges are computed only from the shared progress store, so they read
// identically on every screen. Streak is always present (listed first).

// The icon names a badge may use.
import type { GameGlyph } from "@/components/GameIcon";
// Per-module decision counts, which only the fuller gallery needs.
import type { ModuleCounts } from "@/features/history/historyStats";
// The shared progress store the core badges are derived from.
import type { Progress } from "@/services/localdb/progressStorage";

// One badge. `earned` is computed on read rather than stored, so a badge can
// never be stale relative to the progress it describes.
export type Achievement = {
  id: string;
  name: string;
  glyph: GameGlyph;
  earned: boolean;
};

// The four core achievements shown on Home and Priority. Progress-only, so the
// two screens agree without needing the history.
export function coreAchievements(p: Progress): Achievement[] {
  return [
    { id: "streak", name: "Streak", glyph: "fire", earned: p.completedCount >= 3 },
    { id: "finisher", name: "Finisher", glyph: "check", earned: p.completedCount >= 1 },
    { id: "ranked", name: "Ranked", glyph: "trophy", earned: p.ranked },
    { id: "lv5", name: "Lv 5", glyph: "star", earned: p.level >= 5 },
  ];
}

// The fuller eight-badge gallery shown on the History dashboard. It layers a few
// history-derived badges (Foodie, Explorer) on top of the progress-only core, so
// it needs the per-module decision counts as well as the progress store. Every
// badge is computed, none is stored, so the gallery always reflects live state.
export function galleryAchievements(p: Progress, counts: ModuleCounts): Achievement[] {
  const decisions = counts.fuel + counts.focus + counts.priority;
  return [
    { id: "firstStep", name: "First step", glyph: "award", earned: true },
    { id: "streak", name: "Streak", glyph: "fire", earned: p.completedCount >= 3 },
    {
      id: "finisher",
      name: "Finisher",
      glyph: "check",
      earned: p.completedCount >= 1 || decisions >= 5,
    },
    { id: "ranked", name: "Ranked", glyph: "trophy", earned: p.ranked },
    { id: "foodie", name: "Foodie", glyph: "fork", earned: counts.fuel >= 5 },
    { id: "explorer", name: "Explorer", glyph: "compass", earned: counts.focus >= 4 },
    { id: "lv5", name: "Lv 5", glyph: "star", earned: p.level >= 5 },
    { id: "legend", name: "Legend", glyph: "crown", earned: p.level >= 7 },
  ];
}

// Puts earned achievements before locked ones, keeping each group's own order
// (Array.sort is stable), so unlocked badges lead the row.
export function earnedFirst(list: Achievement[]): Achievement[] {
  return [...list].sort((a, b) => Number(b.earned) - Number(a.earned));
}
