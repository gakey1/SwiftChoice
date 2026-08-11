// The AI layer over priorityRanking.ts. It never ranks the board itself: the
// deterministic ranking runs first, and the model is only allowed to reorder
// tasks that are still tied after score and deadline have both been applied.

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

// A task's deadline reduced to a string that can be part of a grouping key.
// Missing and unparseable dates both collapse to the same "no-deadline" value,
// so two tasks with no deadline group together instead of being told apart by
// how their date happened to be malformed.
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

// Writes the model's order for one tie group back into the full ranked list.
//
// The positions the tied tasks already occupy are kept and only their contents
// are swapped, so the group cannot escape the slots its score earned. A model
// that tried to promote a task above a higher-scoring one simply cannot.
function applyAIOrder<T extends PriorityTaskForRanking>(
  rankedTasks: T[],
  tiedTasks: T[],
  orderedTaskIds: number[],
): T[] {
  const tasksById = new Map(
    tiedTasks.map((task) => [task.taskId, task]),
  );

  // Ids the model returned, resolved back to tasks. Anything it invented is
  // dropped here, because an unknown id looks up as undefined.
  const orderedGroup = orderedTaskIds
    .map((taskId) => tasksById.get(taskId))
    .filter((task): task is T => task !== undefined);

  // The reply has to be a permutation of the group, not a subset. If any task
  // went missing or was invented, the whole reply is discarded and the
  // deterministic order stands. Trusting a partial answer would silently drop
  // a task off the board.
  if (orderedGroup.length !== tiedTasks.length) {
    return rankedTasks;
  }

  const tiedTaskIds = new Set(
    tiedTasks.map((task) => task.taskId),
  );

  // Walks the full list and, at each slot a tied task occupies, substitutes the
  // next task from the reordered group. The counter advances only on those
  // slots, which is what keeps the group's new order in the group's old places.
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
  // Deterministic ranking first, so there is already a complete, defensible
  // board before the network is involved at all.
  let rankedTasks = rankTasksWithoutAI(tasks);
  const tieGroups = findAITieGroups(rankedTasks);
  const aiReasons: string[] = [];

  // One request per tie group, and each is optional. A null result means the
  // model was unreachable or its reply failed validation, and continue leaves
  // that group in its deterministic order while the other groups still get
  // their turn. No group can fail the whole ranking.
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