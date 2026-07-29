// Tests for the history dashboard aggregations. All fixtures are anchored to a
// fixed "now" by millisecond offsets rather than fixed UTC strings, because the
// aggregations bucket by local calendar day: a fixed UTC time can fall on a
// different local day depending on the machine's timezone, so offsets from now
// keep the test correct in any zone.

import { computeHistoryStats } from "./historyStats";
import type { DecisionModuleType, DecisionRecord } from "./historyStorage";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// A fixed "now": an arbitrary instant. Offsets below are relative to it.
const NOW = new Date("2026-07-08T02:00:00.000Z").getTime();

// A decision at `now + offsetMs`, with the fields the aggregations read.
function decision(
  moduleType: DecisionModuleType,
  offsetMs: number,
  rerolled = false
): DecisionRecord {
  const decidedAt = new Date(NOW + offsetMs).toISOString();
  return {
    historyId: `dh_${decidedAt}_${moduleType}`,
    moduleType,
    fuelId: null,
    focusId: null,
    taskId: null,
    itemSnapshot: { name: "Item", details: {} },
    appliedFilters: {},
    rerolled,
    decidedAt,
  };
}

describe("computeHistoryStats", () => {
  it("returns an all-zero summary for an empty history", () => {
    const s = computeHistoryStats([], NOW);
    expect(s.weekCount).toBe(0);
    expect(s.allTime).toBe(0);
    expect(s.rerollRate).toBe(0);
    expect(s.mostActive).toBeNull();
    expect(s.moduleCounts).toEqual({ fuel: 0, focus: 0, priority: 0 });
    expect(s.weekBars).toHaveLength(7);
    expect(s.weekBars.every((b) => b.count === 0)).toBe(true);
  });

  it("counts per module across all time", () => {
    const s = computeHistoryStats(
      [
        decision("fuel", 0),
        decision("fuel", -1 * DAY),
        decision("focus", -2 * DAY),
        decision("priority", -400 * DAY),
      ],
      NOW
    );
    expect(s.moduleCounts).toEqual({ fuel: 2, focus: 1, priority: 1 });
    expect(s.allTime).toBe(4);
  });

  it("counts only the last seven days for the weekly figure and reroll rate", () => {
    const s = computeHistoryStats(
      [
        decision("fuel", 0, true), // this week, rerolled
        decision("focus", -3 * DAY, false), // this week
        decision("fuel", -400 * DAY, true), // old, ignored by week
      ],
      NOW
    );
    expect(s.weekCount).toBe(2);
    // One of the two weekly decisions was rerolled -> 50%.
    expect(s.rerollRate).toBe(50);
  });

  it("reports the most active hour as a short label", () => {
    // Two decisions in the same clock hour (now and exactly a day earlier), one
    // three hours before that.
    const s = computeHistoryStats(
      [decision("fuel", 0), decision("focus", -1 * DAY), decision("priority", -1 * DAY - 3 * HOUR)],
      NOW
    );
    const hour = new Date(NOW).getHours();
    const expected = `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "am" : "pm"}`;
    expect(s.mostActive).toBe(expected);
  });

  it("marks the last of the seven day bars as today", () => {
    const s = computeHistoryStats([decision("fuel", 0)], NOW);
    expect(s.weekBars[6]?.isToday).toBe(true);
    expect(s.weekBars.slice(0, 6).every((b) => b.isToday === false)).toBe(true);
    // Today's decision lands in the last bucket.
    expect(s.weekBars[6]?.count).toBe(1);
  });
});
