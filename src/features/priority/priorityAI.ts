import type { PriorityTaskForRanking } from "./priorityRanking";

export interface PriorityAITieBreakResult {
  orderedTaskIds: number[];
  reason: string;
}

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_TASKS = 8;

/**
 * True when a tie-break endpoint is configured, which is the only condition
 * under which any task text leaves the device.
 *
 * Exported so the screen can tell the user what is about to happen at the
 * moment they ask for it. Without this the rank confirmation would have to
 * either stay silent, or warn about a request that is skipped entirely when
 * EXPO_PUBLIC_PRIORITY_AI_URL is unset, and a warning about something the app
 * is not doing is its own kind of dishonest.
 */
export function isPriorityTieBreakEnabled(): boolean {
  return getWorkerUrl() !== null;
}

function getWorkerUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_PRIORITY_AI_URL?.trim();

  if (!value) {
    return null;
  }

  return value.replace(/\/+$/, "");
}

function isValidResult(
  value: unknown,
  submittedTasks: PriorityTaskForRanking[],
): value is PriorityAITieBreakResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    !Array.isArray(record.orderedTaskIds) ||
    typeof record.reason !== "string"
  ) {
    return false;
  }

  const orderedTaskIds = record.orderedTaskIds as unknown[];

  if (
    orderedTaskIds.length !== submittedTasks.length ||
    !orderedTaskIds.every((id) => Number.isInteger(id))
  ) {
    return false;
  }

  const submittedIds = new Set(
    submittedTasks.map((task) => task.taskId),
  );

  const returnedTaskIds = orderedTaskIds as number[];
  const returnedIds = new Set(returnedTaskIds);

  if (
    returnedIds.size !== submittedIds.size ||
    returnedTaskIds.some((id) => !submittedIds.has(id))
  ) {
    return false;
  }

  const reason = record.reason.trim();

  return reason.length > 0 && reason.length <= 240;
}

/**
 * Requests an AI-assisted order for tasks that already have the same
 * urgency and importance score.
 *
 * Returns null when the Worker is unavailable or the response is invalid,
 * allowing the deterministic fallback ranking to remain in use.
 */
export async function requestPriorityAITieBreak(
  tasks: PriorityTaskForRanking[],
): Promise<PriorityAITieBreakResult | null> {
  const workerUrl = getWorkerUrl();

  if (!workerUrl || tasks.length < 2 || tasks.length > MAX_TASKS) {
    return null;
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${workerUrl}/tie-break`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: tasks.map((task) => ({
          taskId: task.taskId,
          taskName: task.taskName,
          deadline: task.deadline ?? null,
          context: task.context ?? null,
          createdAt: task.createdAt ?? null,
        })),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();

    if (!isValidResult(data, tasks)) {
      return null;
    }

    return {
      orderedTaskIds: data.orderedTaskIds,
      reason: data.reason.trim(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}