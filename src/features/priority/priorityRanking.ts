// Ranks the Priority board with no network: a points score from urgency and
// importance, then a tie-break chain that makes the order total and stable.
// priorityAIRanking.ts layers the AI tie-break on top and never replaces this.

export type PriorityLevel = "High" | "Medium" | "Low";

export interface PriorityTaskForRanking {
  taskId: number;
  taskName: string;
  urgency: PriorityLevel;
  importance: PriorityLevel;
  deadline?: string | null;
  context?: string | null;
  createdAt?: string | null;
}

// The three levels as numbers, so urgency and importance can be added. Evenly
// spaced and one point apart, which is what makes the two weigh equally: a
// High/Low task and a Medium/Medium task both score 4 and tie deliberately.
const LEVEL_POINTS: Record<PriorityLevel, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

// Urgency plus importance, so the score runs 2 (Low/Low) to 6 (High/High).
// This is the Eisenhower idea flattened to one number the board can sort on.
export function getPriorityScore(task: PriorityTaskForRanking): number {
  return LEVEL_POINTS[task.urgency] + LEVEL_POINTS[task.importance];
}

// Dates arrive as strings and may be absent or malformed, so everything is
// normalised to a number or null here. Returning null rather than NaN means
// the callers below can test for a usable date with a plain !== null.
function parseDate(value?: string | null): number | null {
  if (!value) return null;

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * Non-AI fallback used when Gemini is unavailable or returns invalid data.
 *
 * Order:
 * 1. Earlier deadline
 * 2. Oldest task
 * 3. Lowest task ID for a stable final order
 */
export function compareTieFallback(
  first: PriorityTaskForRanking,
  second: PriorityTaskForRanking,
): number {
  const firstDeadline = parseDate(first.deadline);
  const secondDeadline = parseDate(second.deadline);

  if (firstDeadline !== null && secondDeadline !== null) {
    const deadlineDifference = firstDeadline - secondDeadline;

    if (deadlineDifference !== 0) {
      return deadlineDifference;
    }
  } else if (firstDeadline !== null) {
    return -1;
  } else if (secondDeadline !== null) {
    return 1;
  }

  const firstCreated = parseDate(first.createdAt);
  const secondCreated = parseDate(second.createdAt);

  if (firstCreated !== null && secondCreated !== null) {
    const createdDifference = firstCreated - secondCreated;

    if (createdDifference !== 0) {
      return createdDifference;
    }
  } else if (firstCreated !== null) {
    return -1;
  } else if (secondCreated !== null) {
    return 1;
  }

  return first.taskId - second.taskId;
}

// The whole board, highest score first, ties settled by the chain above.
//
// Sorts a copy rather than the array passed in, because Array.sort mutates in
// place and the caller's list is React state that must not be edited directly.
//
// second minus first reverses the usual comparator so the higher score sorts
// earlier, which is what a priority list wants.
export function rankTasksWithoutAI<T extends PriorityTaskForRanking>(
  tasks: T[],
): T[] {
  return [...tasks].sort((first, second) => {
    const scoreDifference =
      getPriorityScore(second) - getPriorityScore(first);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return compareTieFallback(first, second);
  });
}

// Which tasks share a score, used to tell the user where the order was a
// judgement call rather than a clear win.
//
// Buckets by score into a Map in one pass, which is O(n), rather than comparing
// every task against every other. The final filter drops groups of one, since a
// task that ties with nothing is not a tie.
export function findScoreTieGroups<T extends PriorityTaskForRanking>(
  tasks: T[],
): T[][] {
  const groups = new Map<number, T[]>();

  for (const task of tasks) {
    const score = getPriorityScore(task);
    const existing = groups.get(score) ?? [];

    existing.push(task);
    groups.set(score, existing);
  }

  return [...groups.entries()]
    .sort(([firstScore], [secondScore]) => secondScore - firstScore)
    .map(([, group]) => group)
    .filter((group) => group.length > 1);
}