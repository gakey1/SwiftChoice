// Tests for the history dashboard aggregations. All fixtures are anchored to a
// fixed "now" by millisecond offsets rather than fixed UTC strings, because the
// aggregations bucket by local calendar day: a fixed UTC time can fall on a
// different local day depending on the machine's timezone, so offsets from now
// keep the test correct in any zone.

import {
  ASSUMED_MINUTES_WITHOUT_APP,
  averageDecideSeconds,
  averageSavedSeconds,
  computeHistoryStats,
  formatDuration,
} from "./historyStats";
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
    startedAt: null,
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

// Decide time. Not shown on any screen today, but the start times are still
// recorded and cannot be backfilled, so this stays covered rather than rotting
// until US27 wants it.
describe("averageDecideSeconds", () => {
  function withGap(startedMsAgo: number | null): DecisionRecord {
    const decidedAt = new Date(NOW).toISOString();
    return {
      historyId: `dh_${startedMsAgo}`,
      moduleType: "fuel",
      fuelId: null,
      focusId: null,
      taskId: null,
      itemSnapshot: { name: "Item", details: {} },
      appliedFilters: {},
      rerolled: false,
      decidedAt,
      startedAt: startedMsAgo === null ? null : new Date(NOW - startedMsAgo).toISOString(),
    };
  }

  it("averages the gap between starting and deciding", () => {
    expect(averageDecideSeconds([withGap(20_000), withGap(40_000)])).toBe(30);
  });

  it("returns null rather than zero when nothing recorded a start", () => {
    // The distinction that matters: no data and "every decision was instant"
    // are different claims, and only one of them is true.
    expect(averageDecideSeconds([withGap(null), withGap(null)])).toBeNull();
  });

  it("returns null for an empty history", () => {
    expect(averageDecideSeconds([])).toBeNull();
  });

  it("ignores rows with no start instead of counting them as zero", () => {
    expect(averageDecideSeconds([withGap(30_000), withGap(null)])).toBe(30);
  });

  it("discards a gap longer than an hour", () => {
    // That is somebody leaving the screen open, not deliberating, and one such
    // row would drag the average somewhere meaningless.
    expect(averageDecideSeconds([withGap(30_000), withGap(3 * 60 * 60 * 1000)])).toBe(30);
  });

  it("discards a negative gap from a device clock that moved", () => {
    expect(averageDecideSeconds([withGap(30_000), withGap(-5_000)])).toBe(30);
  });
});

describe("formatDuration", () => {
  it("shows seconds under a minute and whole minutes above", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(138)).toBe("2min");
  });

  it("shows a dash when there is nothing to report", () => {
    expect(formatDuration(null)).toBe("-");
  });
});

// Time saved. The only figure the app reports that is not wholly measured, so
// these pin the parts that could quietly become a false claim: the floor at
// zero, the rows that are excluded, and that the baseline is the single
// documented constant rather than a number typed in twice.
describe("averageSavedSeconds", () => {
  const ASSUMED_SECONDS = ASSUMED_MINUTES_WITHOUT_APP * 60;

  function tookSeconds(seconds: number | null): DecisionRecord {
    const decidedAt = new Date(NOW).toISOString();
    return {
      historyId: `dh_${seconds}`,
      moduleType: "fuel",
      fuelId: null,
      focusId: null,
      taskId: null,
      itemSnapshot: { name: "Item", details: {} },
      appliedFilters: {},
      rerolled: false,
      decidedAt,
      startedAt: seconds === null ? null : new Date(NOW - seconds * 1000).toISOString(),
    };
  }

  it("subtracts the measured time from the assumed time without the app", () => {
    expect(averageSavedSeconds([tookSeconds(60)])).toBe(ASSUMED_SECONDS - 60);
  });

  it("averages across the week's decisions", () => {
    const saved = averageSavedSeconds([tookSeconds(60), tookSeconds(120)]);
    expect(saved).toBe(ASSUMED_SECONDS - 90);
  });

  it("never reports a negative saving", () => {
    // Somebody who laboured for half an hour did not save minus twenty minutes.
    // Floored at zero, so the card cannot show a figure that reads as a penalty.
    expect(averageSavedSeconds([tookSeconds(30 * 60)])).toBe(0);
  });

  it("returns null when no decision recorded a start", () => {
    // There is nothing to subtract from, and assuming the full baseline was
    // saved would be claiming the decision took no time at all.
    expect(averageSavedSeconds([tookSeconds(null)])).toBeNull();
  });

  it("ignores rows with no start rather than treating them as instant", () => {
    // Counting them as zero-length would silently inflate the average towards
    // the full baseline, which is the exact overstatement this figure must avoid.
    expect(averageSavedSeconds([tookSeconds(60), tookSeconds(null)])).toBe(ASSUMED_SECONDS - 60);
  });

  it("discards an implausible gap, the same rows the decide time discards", () => {
    // Both aggregations share one definition of a countable row, so they can
    // never disagree about which decisions exist.
    expect(averageSavedSeconds([tookSeconds(60), tookSeconds(3 * 60 * 60)])).toBe(
      ASSUMED_SECONDS - 60
    );
  });

  it("keeps the baseline conservative against the survey it cites", () => {
    // The survey figure is 20 minutes for 38% of respondents. The baseline is
    // deliberately well under it, because the claim should understate. If
    // somebody raises this later, the number has to stay defensible.
    expect(ASSUMED_MINUTES_WITHOUT_APP).toBeLessThan(20);
    expect(ASSUMED_MINUTES_WITHOUT_APP).toBeGreaterThan(0);
  });
});
