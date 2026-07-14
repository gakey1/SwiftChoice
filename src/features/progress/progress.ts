// Shared gamification maths for the XP / level reward system. The Priority
// screen and the Home player card both read progress from progressStorage and
// show a level, a title and an XP bar, so the level curve, titles and the
// bar fraction live here in one place to stay in step.

// Level titles shown next to the level number as you climb.
export const LEVEL_TITLES = [
  "Rookie",
  "Starter",
  "Planner",
  "Decider",
  "Strategist",
  "Master",
  "Legend",
] as const;

// XP needed to clear a given level. Grows a little each level.
export function capFor(level: number): number {
  return 400 + (level - 1) * 120;
}

// The title for a level, clamped to the last title once past the top.
export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] ?? "Legend";
}

// How full the XP bar is for the current level, as a 0-1 fraction.
export function xpFraction(xp: number, level: number): number {
  return Math.max(0, Math.min(1, xp / capFor(level)));
}
