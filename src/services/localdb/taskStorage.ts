// Saves and loads the Priority screen's task board on the device, so a list
// survives leaving the screen and closing the app. It uses AsyncStorage, the
// same on-device store as the theme, the preferences and the gamification
// progress; a task is an ordinary note, not a secret, so it does not belong in
// Secure Store. Part of the on-device storage slice.
//
// This existed nowhere until now. Priority held its tasks in component state
// and nothing else, so navigating away lost them, which was found by using the
// app rather than by any test. Nothing in the WBS asked for the tasks to be
// stored, and nothing in the app said they were not.
//
// The whole board is one record rather than three. A ranked order, the fact
// that it is ranked, and the sentence explaining it only make sense together:
// tasks restored without `isRanked` would offer to rank an already ranked list,
// and `isRanked` restored without its reason would claim an explanation the
// screen could not show.

import AsyncStorage from "@react-native-async-storage/async-storage";

const BOARD_KEY = "swiftchoice.priorityBoard";

// Structurally the screen's Task, declared here rather than imported from it.
// A service importing a type back out of the screen that consumes it reads
// backwards, and this module has to validate the shape on load anyway, so it
// needs its own statement of what a good record looks like.
export type StoredTask = {
  taskId: number;
  userId: number;
  taskName: string;
  urgency: "High" | "Medium" | "Low";
  importance: "High" | "Medium" | "Low";
  status: "Pending" | "InProgress" | "Completed";
};

export type TaskBoard = {
  tasks: StoredTask[];
  isRanked: boolean;
  // The sentences shown under the ranked list. Plural because the ranking can
  // return one reason per tie it broke.
  reasons: string[];
};

export const EMPTY_BOARD: TaskBoard = { tasks: [], isRanked: false, reasons: [] };

const LEVELS = ["High", "Medium", "Low"] as const;
const STATUSES = ["Pending", "InProgress", "Completed"] as const;

// True only for a well-formed task. A corrupt or hand-edited store must not be
// able to feed a half-built object into the screen, where a missing urgency
// would rank as undefined and sort unpredictably rather than fail loudly.
function isStoredTask(value: unknown): value is StoredTask {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.taskId === "number" &&
    Number.isFinite(t.taskId) &&
    typeof t.userId === "number" &&
    Number.isFinite(t.userId) &&
    typeof t.taskName === "string" &&
    t.taskName.trim().length > 0 &&
    LEVELS.includes(t.urgency as (typeof LEVELS)[number]) &&
    LEVELS.includes(t.importance as (typeof LEVELS)[number]) &&
    STATUSES.includes(t.status as (typeof STATUSES)[number])
  );
}

// Returns the saved board, or an empty one if nothing valid is stored. Never
// throws: any storage or parse error just falls back to empty so the screen
// still opens. A single bad task drops that task rather than the whole board,
// because losing one row is a better outcome than losing the list.
export async function loadTaskBoard(): Promise<TaskBoard> {
  try {
    const stored = await AsyncStorage.getItem(BOARD_KEY);
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === "object" && parsed !== null) {
        const board = parsed as Record<string, unknown>;
        const tasks = Array.isArray(board.tasks) ? board.tasks.filter(isStoredTask) : [];
        // A board with no tasks cannot be ranked, whatever the flag says.
        const isRanked = tasks.length > 0 && board.isRanked === true;
        const reasons =
          isRanked && Array.isArray(board.reasons)
            ? board.reasons.filter((r): r is string => typeof r === "string" && r.length > 0)
            : [];
        return { tasks, isRanked, reasons };
      }
    }
  } catch {
    // Fall through to empty.
  }
  return EMPTY_BOARD;
}

// Persists the board. Best-effort: on failure the tasks just will not survive
// this restart, which is not worth crashing the app over.
export async function saveTaskBoard(board: TaskBoard): Promise<void> {
  try {
    await AsyncStorage.setItem(BOARD_KEY, JSON.stringify(board));
  } catch {
    // Ignore: persistence is best-effort.
  }
}

// Forgets the saved board. Used by the clear-local-data and delete-account
// flows. Never throws: a failure here must not stop the rest of the wipe.
export async function clearTaskBoard(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BOARD_KEY);
  } catch {
    // Nothing to do. The next read falls back to empty anyway.
  }
}
