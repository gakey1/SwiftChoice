// The one place task text leaves the device: a request to the tie-break Worker,
// which calls the model. Everything here is written so a failure is silent and
// the deterministic ranking simply stands.

import type { PriorityTaskForRanking } from "./priorityRanking";

export interface PriorityAITieBreakResult {
  orderedTaskIds: number[];
  reason: string;
}

// A decision aid is worth nothing if the board hangs on it, so the request is
// abandoned after eight seconds. MAX_TASKS caps how much text one request can
// carry, which bounds both the cost and the size of what is sent off-device.
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

// The endpoint, or null when it is unset or blank. Trailing slashes are
// stripped so the path joined on below cannot produce a doubled slash.
function getWorkerUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_PRIORITY_AI_URL?.trim();

  if (!value) {
    return null;
  }

  return value.replace(/\/+$/, "");
}

// Validates the reply before any of it is trusted. A type predicate rather than
// a plain boolean, so a true return also narrows the type for the caller and
// the parsed JSON cannot be read as a result until it has passed every check.
//
// The reply crosses a trust boundary twice over, being both network data and
// model output, so the checks below are deliberately exhaustive: shape, then
// contents, then that the ids are exactly the ones that were sent.
function isValidResult(
  value: unknown,
  submittedTasks: PriorityTaskForRanking[],
): value is PriorityAITieBreakResult {
  // Typed unknown rather than any, which forces each property to be proved
  // before it is used. typeof null is "object", hence the explicit null test.
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

  // Same count as was sent, and every entry a whole number. This rejects a
  // reply that dropped a task, added one, or answered with a decimal or string.
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

  // The reply must be a permutation of what was sent: the same ids, each once.
  // Comparing Set sizes is what catches a duplicate, since a repeated id keeps
  // the array length right while collapsing the Set. Sets also make this a
  // constant-time membership test rather than a scan per id.
  if (
    returnedIds.size !== submittedIds.size ||
    returnedTaskIds.some((id) => !submittedIds.has(id))
  ) {
    return false;
  }

  // The explanation is shown to the user, so an empty string is no better than
  // no reply, and the upper bound stops an over-long answer from taking over
  // the screen.
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

  // Cheap refusals before any network work. Fewer than two tasks is not a tie,
  // and more than MAX_TASKS is more than one request should carry.
  if (!workerUrl || tasks.length < 2 || tasks.length > MAX_TASKS) {
    return null;
  }

  // AbortController is what makes the timeout real. Without it the timer would
  // fire while the request carried on in the background, so the board could
  // still be updated long after the user had been told it would not be.
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
      // Only the fields the tie-break actually needs are sent, picked out one
      // by one rather than passing the task through. Anything added to a task
      // later therefore stays on the device until somebody chooses otherwise.
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
    // Every failure lands here and looks the same to the caller: a refused
    // connection, a timeout abort, malformed JSON. The board must not break
    // because an optional helper did, and null means the deterministic order
    // stands, which is a correct board rather than an error state.
    return null;
  } finally {
    // finally, so the timer is cleared on the success path too. Left running,
    // it would abort a request that had already completed.
    clearTimeout(timeout);
  }
}