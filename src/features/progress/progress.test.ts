// Tests for the shared gamification maths used by the Priority screen and the
// Home player card: the level cap curve, the level titles, and the XP-bar
// fraction (which must stay clamped between 0 and 1).

import { capFor, levelTitle, LEVEL_TITLES, xpFraction } from "@/features/progress/progress";

describe("progress maths", () => {
  it("grows the level cap by 120 each level", () => {
    expect(capFor(1)).toBe(400);
    expect(capFor(2)).toBe(520);
    expect(capFor(5)).toBe(880);
  });

  it("maps a level to its title and clamps past the top", () => {
    expect(levelTitle(1)).toBe("Rookie");
    expect(levelTitle(5)).toBe("Strategist");
    expect(levelTitle(99)).toBe(LEVEL_TITLES[LEVEL_TITLES.length - 1]);
  });

  it("clamps the XP fraction between 0 and 1", () => {
    expect(xpFraction(0, 1)).toBe(0);
    expect(xpFraction(200, 1)).toBe(0.5);
    expect(xpFraction(9999, 1)).toBe(1);
  });
});
