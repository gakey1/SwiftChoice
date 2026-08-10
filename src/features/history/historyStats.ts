// Pure aggregations over the decision history, and the canonical definitions of
// "this week", "reroll rate" and the rest. Every one is a plain function of a
// decision list plus an explicit "now", so none reads the clock during render.

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

// How long the average decision took, in seconds, or null when nothing can be
// measured. null rather than 0, because no data and "instant" are different
// answers and 0s would be a claim the app cannot support.
//
// Rows with no start stamp are skipped rather than guessed at, as are negative
// or absurd gaps: those come from the device clock moving between the two
// stamps, and one bad row would drag the average somewhere meaningless.
export function averageDecideSeconds(decisions: DecisionRecord[]): number | null {
  const gaps: number[] = [];

  for (const d of decisions) {
    const took = decideSeconds(d);
    if (took !== null) gaps.push(took);
  }

  if (gaps.length === 0) return null;

  return Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length);
}

// An hour. Past this the user almost certainly left the screen open rather than
// spent the time deciding, so counting it would say more about backgrounding an
// app than about the decision.
const MAX_PLAUSIBLE_DECISION_MS = 60 * 60 * 1000;

// How long the same decision is assumed to take WITHOUT SwiftChoice. This is the
// one number here that is not measured, and everything about the saved-time
// figure rests on it, so it lives alone with its reasoning attached.
//
// It is deliberately conservative. The Sem 1 survey (21 respondents) found 38%
// spend more than 20 minutes deliberating before acting, but that is a threshold
// for a minority rather than an average, and it covers decisions in general.
// This app competes for micro-decisions, which research.md's own context-of-use
// section puts at "seconds to a few minutes". Eight minutes sits well under the
// survey figure on purpose: the claim understates, which is the safe direction
// for a number the app makes about itself.
//
// Change it here and nowhere else. The basis is written down in the Terms of use
// screen and in briefs/sprint-4/settings-home-and-priority-history.md, and both
// should change with it.
export const ASSUMED_MINUTES_WITHOUT_APP = 8;

// Average time saved per decision this week, in seconds, or null when no
// decision recorded a start and there is therefore nothing to subtract from.
//
// saved = assumed time without the app - measured time with it, floored at zero
// so a decision somebody laboured over never reports as a negative saving.
export function averageSavedSeconds(decisions: DecisionRecord[]): number | null {
  const assumedSeconds = ASSUMED_MINUTES_WITHOUT_APP * 60;
  const saved: number[] = [];

  for (const d of decisions) {
    const took = decideSeconds(d);
    if (took === null) continue;
    saved.push(Math.max(0, assumedSeconds - took));
  }

  if (saved.length === 0) return null;

  return Math.round(saved.reduce((sum, v) => sum + v, 0) / saved.length);
}

// The measured length of one decision, or null when it cannot be trusted: no
// recorded start, an unparseable stamp, or a gap that is negative or absurd.
// Shared by both aggregations so they can never disagree about which rows count.
function decideSeconds(d: DecisionRecord): number | null {
  if (!d.startedAt) return null;

  const started = new Date(d.startedAt).getTime();
  const decided = new Date(d.decidedAt).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(decided)) return null;

  const gap = decided - started;
  if (gap < 0 || gap > MAX_PLAUSIBLE_DECISION_MS) return null;

  return gap / 1000;
}

// A duration as it appears on the card. Seconds up to a minute, then whole
// minutes, because "138s" is not how anybody reads a duration. A dash when there
// is nothing to show, which is honest and takes the same space as a figure.
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}min`;
}

// Re-exported for callers that only need to know if a timestamp is today.
export { isSameDay };
