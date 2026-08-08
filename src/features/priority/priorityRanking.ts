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

const LEVEL_POINTS: Record<PriorityLevel, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export function getPriorityScore(task: PriorityTaskForRanking): number {
  return LEVEL_POINTS[task.urgency] + LEVEL_POINTS[task.importance];
}

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