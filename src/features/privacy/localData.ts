// Clears everything this app has stored on the phone, in one place so there is a
// single answer to "what is on my device", and so deleting an account is this
// plus the cloud rather than a second list that drifts.
//
// It does NOT touch the cloud. What the user is told has to say so.

// Every on-device store, one import per thing that gets cleared. The list below
// is the only place that decides what "everything on this phone" means.
import { clearFocusPool } from "@/features/focus/focusPoolStorage";
import { clearFuelPool } from "@/features/fuel/fuelPoolStorage";
import { clearDecisions } from "@/features/history/historyStorage";
import { clearPreferences } from "@/services/localdb/preferencesStorage";
import { clearAvatarIndex } from "@/services/localdb/profileStorage";
import { clearProgress } from "@/services/localdb/progressStorage";
import { clearTaskBoard } from "@/services/localdb/taskStorage";

// What was cleared, and what was left behind on purpose. Returned rather than
// thrown so the caller can tell the user the truth either way.
export type ClearLocalDataResult = {
  ok: boolean;
  // Any step that failed, by name. A partial wipe is reported rather than
  // hidden, because telling somebody their data is gone when some of it is not
  // is the one outcome this feature must never produce.
  failed: string[];
};

// The theme is deliberately absent from this list. It is a look, not personal
// data, and silently flipping somebody's app from dark to light is a confusing
// side effect of a privacy action. Written down here so it reads as a decision
// rather than an oversight.
//
// The names are user-facing, since a failed step is reported by name.
const STEPS: { name: string; run: () => Promise<void> }[] = [
  { name: "preferences", run: clearPreferences },
  { name: "fuel pool", run: clearFuelPool },
  { name: "focus pool", run: clearFocusPool },
  { name: "decision history on this device", run: clearDecisions },
  { name: "progress", run: clearProgress },
  { name: "priority tasks", run: clearTaskBoard },
  { name: "avatar", run: clearAvatarIndex },
];

// Clears every on-device store, and keeps going if one of them fails, so a
// single broken step cannot leave the rest of the data behind. Safe to run more
// than once: clearing something already empty does nothing.
export async function clearLocalData(): Promise<ClearLocalDataResult> {
  const failed: string[] = [];

  for (const step of STEPS) {
    try {
      await step.run();
    } catch {
      failed.push(step.name);
    }
  }

  return { ok: failed.length === 0, failed };
}
