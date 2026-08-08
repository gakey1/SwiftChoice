import { requestPriorityAITieBreak } from "./priorityAI";
import {
  getPriorityScore,
  rankTasksWithoutAI,
  type PriorityTaskForRanking,
} from "./priorityRanking";

export interface PriorityRankingResult<T extends PriorityTaskForRanking> {
  tasks: T[];
  aiReasons: string[];
}

function getDeadlineKey(task: PriorityTaskForRanking): string {
  if (!task.deadline) {
    return "no-deadline";
  }

  const timestamp = Date.parse(task.deadline);

  return Number.isNaN(timestamp)
    ? "no-deadline"
    : String(timestamp);
}

/**
 * Finds tasks that remain tied after both:
 * 1. urgency + importance score
 * 2. deadline ordering
 *
 * Gemini is only allowed to reorder tasks inside these remaining tie groups.
 */
function findAITieGroups<T extends PriorityTaskForRanking>(
  tasks: T[],
): T[][] {
  const groups = new Map<string, T[]>();

  for (const task of tasks) {
    const key = `${getPriorityScore(task)}:${getDeadlineKey(task)}`;
    const existing = groups.get(key) ?? [];

    existing.push(task);
    groups.set(key, existing);
  }

  return [...groups.values()].filter((group) => group.length > 1);
}

function applyAIOrder<T extends PriorityTaskForRanking>(
  rankedTasks: T[],
  tiedTasks: T[],
  orderedTaskIds: number[],
): T[] {
  const tasksById = new Map(
    tiedTasks.map((task) => [task.taskId, task]),
  );

  const orderedGroup = orderedTaskIds
    .map((taskId) => tasksById.get(taskId))
    .filter((task): task is T => task !== undefined);

  if (orderedGroup.length !== tiedTasks.length) {
    return rankedTasks;
  }

  const tiedTaskIds = new Set(
    tiedTasks.map((task) => task.taskId),
  );

  let replacementIndex = 0;

  return rankedTasks.map((task) => {
    if (!tiedTaskIds.has(task.taskId)) {
      return task;
    }

    const replacement = orderedGroup[replacementIndex];

    if (!replacement) {
      return task;
    }
    
    replacementIndex += 1;

    return replacement;
  });
}

/**
 * Ranks all tasks deterministically first, then asks Gemini to resolve only
 * the groups that remain tied after score and deadline comparison.
 *
 * When Gemini is missing, unavailable or invalid, the deterministic ranking
 * remains unchanged.
 */
export async function rankTasksWithAI<
  T extends PriorityTaskForRanking,
>(
  tasks: T[],
): Promise<PriorityRankingResult<T>> {
  let rankedTasks = rankTasksWithoutAI(tasks);
  const tieGroups = findAITieGroups(rankedTasks);
  const aiReasons: string[] = [];

  for (const tieGroup of tieGroups) {
    const result = await requestPriorityAITieBreak(tieGroup);

    if (!result) {
      continue;
    }

    rankedTasks = applyAIOrder(
      rankedTasks,
      tieGroup,
      result.orderedTaskIds,
    );

    aiReasons.push(result.reason);
  }

  return {
    tasks: rankedTasks,
    aiReasons,
  };
}