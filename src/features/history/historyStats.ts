// Pure aggregations over the decision history, the numbers the History dashboard
// shows: this-week count, reroll rate, the most active time of day, per-module
// counts, and a seven-day bar series. They are plain functions of a decision
// list (and, where time matters, an explicit "now"), so they never read the
// clock during render and are trivial to unit test.
//
// These are the canonical definitions of "this week", "reroll rate" and so on.
// When Bikash's dashboard backend (US27) produces an aggregated summary, it
// should return these same field names so there is one definition, not two (see
// briefs/sprint-3/gamification-data-shape-for-dashboard.md).

import type { DecisionModuleType, DecisionRecord } from "@/features/history/historyStorage";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type ModuleCounts = Record<DecisionModuleType, number>;

// One bar in the seven-day chart: a weekday letter, how many decisions fell on
// that day, and whether it is today (highlighted in the chart).
export type DayBar = {
  // Single-letter weekday label (M, T, W, ...). Not unique across the week, which
  // is fine: the chart shows seven bars in order, it does not key on the letter.
  label: string;
  count: number;
  isToday: boolean;
};

export type HistoryStats = {
  weekCount: number;
  allTime: number;
  // Percentage (0-100) of this week's decisions that were rerolled before accepting.
  rerollRate: number;
  // A short label for the hour most decisions happen in, e.g. "2pm", or null when
  // there is no history yet.
  mostActive: string | null;
  moduleCounts: ModuleCounts;
  // Seven bars, oldest first, ending on today.
  weekBars: DayBar[];
};

const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"] as const;

// Parses an ISO timestamp to epoch millis, or null if it is unusable, so a single
// bad row can never throw while aggregating.
function timeOf(iso: string): number | null {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

// Formats an hour (0-23) as a short 12-hour label: 0 -> "12am", 14 -> "2pm".
function hourLabel(hour: number): string {
  const period = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

// Same calendar day as `now`.
function isSameDay(t: number, now: number): boolean {
  const a = new Date(t);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function computeHistoryStats(decisions: DecisionRecord[], now: number): HistoryStats {
  const weekAgo = now - WEEK_MS;

  const moduleCounts: ModuleCounts = { fuel: 0, focus: 0, priority: 0 };
  const hourTally = new Array<number>(24).fill(0);

  // Seven day buckets, oldest first, aligned to today's calendar day.
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const bars: DayBar[] = Array.from({ length: 7 }, (_, i) => {
    const dayStart = startOfToday.getTime() - (6 - i) * DAY_MS;
    return {
      label: WEEKDAY_LETTER[new Date(dayStart).getDay()] ?? "",
      count: 0,
      isToday: i === 6,
    };
  });

  let weekCount = 0;
  let weekRerolled = 0;

  for (const d of decisions) {
    moduleCounts[d.moduleType] += 1;

    const t = timeOf(d.decidedAt);
    if (t === null) continue;

    const hour = new Date(t).getHours();
    hourTally[hour] = (hourTally[hour] ?? 0) + 1;

    if (t >= weekAgo && t <= now) {
      weekCount += 1;
      if (d.rerolled) weekRerolled += 1;
    }

    // Drop into a day bucket if it falls in the visible seven-day window.
    const daysAgo = Math.floor((startOfToday.getTime() - new Date(t).setHours(0, 0, 0, 0)) / DAY_MS);
    if (daysAgo >= 0 && daysAgo <= 6) {
      const bar = bars[6 - daysAgo];
      if (bar) bar.count += 1;
    }
  }

  // Most active hour: the fullest bucket, or null if there is no history at all.
  let mostActive: string | null = null;
  let best = 0;
  for (let h = 0; h < 24; h += 1) {
    const n = hourTally[h] ?? 0;
    if (n > best) {
      best = n;
      mostActive = hourLabel(h);
    }
  }

  return {
    weekCount,
    allTime: decisions.length,
    rerollRate: weekCount > 0 ? Math.round((weekRerolled / weekCount) * 100) : 0,
    mostActive,
    moduleCounts,
    weekBars: bars,
  };
}

// Re-exported for callers that only need to know if a timestamp is today.
export { isSameDay };
