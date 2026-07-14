// Saves and loads the Priority screen's gamification progress (XP, level, and the
// running count of completed tasks) on the device, so the reward bar, level and
// badges carry over between app opens. It uses AsyncStorage, the same on-device
// store as the theme choice and the sign-in session; progress is an ordinary
// preference, not a secret, so it does not belong in Secure Store. Part of the
// on-device storage slice.

import AsyncStorage from "@react-native-async-storage/async-storage";

const PROGRESS_KEY = "swiftchoice.priorityProgress";

export type Progress = {
  xp: number;
  level: number;
  completedCount: number;
  // Coins earned alongside XP, shown in the top-right HUD.
  coins: number;
  // Whether the user has ranked their tasks at least once. Persisted so the
  // "Ranked" achievement reads the same on every screen, not just on Priority.
  ranked: boolean;
};

// A fresh player: level 1, no XP, no coins, nothing completed or ranked yet.
export const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  level: 1,
  completedCount: 0,
  coins: 0,
  ranked: false,
};

// True only for a well-formed progress object with sensible numbers, so a
// corrupt or hand-edited store cannot feed bad values into the screen. `ranked`
// is optional for backward compatibility with progress saved before it existed.
function hasValidNumbers(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.xp === "number" &&
    Number.isFinite(p.xp) &&
    p.xp >= 0 &&
    typeof p.level === "number" &&
    Number.isFinite(p.level) &&
    p.level >= 1 &&
    typeof p.completedCount === "number" &&
    Number.isFinite(p.completedCount) &&
    p.completedCount >= 0
  );
}

// Returns the saved progress, or a fresh default if nothing valid is stored.
// Never throws: any storage or parse error just falls back to the default so
// the screen still opens.
export async function loadProgress(): Promise<Progress> {
  try {
    const stored = await AsyncStorage.getItem(PROGRESS_KEY);
    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);
      if (hasValidNumbers(parsed)) {
        return {
          xp: parsed.xp as number,
          level: parsed.level as number,
          completedCount: parsed.completedCount as number,
          coins:
            typeof parsed.coins === "number" && Number.isFinite(parsed.coins) && parsed.coins >= 0
              ? parsed.coins
              : 0,
          ranked: parsed.ranked === true,
        };
      }
    }
  } catch {
    // Fall through to the default.
  }
  return DEFAULT_PROGRESS;
}

// Persists the current progress. Best-effort: on failure the progress just will
// not survive this restart, which is not worth crashing the app over.
export async function saveProgress(progress: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore: persistence is best-effort.
  }
}
