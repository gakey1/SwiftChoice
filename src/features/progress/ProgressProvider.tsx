// Holds the player's gamification progress (XP, level, tasks completed, whether
// they have ranked) as one shared source of truth for the whole app, the same
// shape as AuthProvider and ThemeProvider. Home, Priority and the global XP HUD
// all read from here, so earning XP on one screen updates it everywhere at once,
// and it is persisted so it survives a restart.

// React itself, plus the hooks the provider is built from.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// The level curve, which decides when XP rolls over into a new level.
import { capFor } from "@/features/progress/progress";
// The stored shape, and the reads and writes that persist it.
import {
  DEFAULT_PROGRESS,
  loadProgress,
  saveProgress,
  type Progress,
} from "@/services/localdb/progressStorage";

// What every consumer of useProgress() gets: the current state, whether it has
// finished loading, and the three ways to change it.
type ProgressContextValue = {
  progress: Progress;
  hydrated: boolean;
  // Adds XP and rolls the level over when the bar fills.
  awardXp: (amount: number) => void;
  // Records that a task was completed.
  bumpCompleted: () => void;
  // Records that the user has ranked their tasks at least once.
  markRanked: () => void;
};

// undefined rather than a default value, so useProgress below can tell "outside
// a provider" apart from "inside one that happens to hold the defaults".
const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

// Wraps the app, owns the progress, and persists every change.
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [hydrated, setHydrated] = useState(false);

  // Load saved progress once on mount.
  useEffect(() => {
    let active = true;
    void loadProgress().then((p) => {
      if (!active) return;
      setProgress(p);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist whenever progress changes, once the initial load is done (the guard
  // stops the default overwriting stored progress before it loads).
  useEffect(() => {
    if (!hydrated) return;
    void saveProgress(progress);
  }, [hydrated, progress]);

  // Adds XP and rolls the level over as many times as the amount covers, so a
  // single large award cannot leave the bar past its cap.
  const awardXp = useCallback((amount: number) => {
    setProgress((prev) => {
      let xp = prev.xp + amount;
      let level = prev.level;
      let cap = capFor(level);
      while (xp >= cap) {
        xp -= cap;
        level += 1;
        cap = capFor(level);
      }
      // Coins accrue alongside XP (a fraction of the XP earned), shown in the HUD.
      const coins = prev.coins + Math.max(1, Math.round(amount / 6));
      return { ...prev, xp, level, coins };
    });
  }, []);

  // One more completed task.
  const bumpCompleted = useCallback(() => {
    setProgress((prev) => ({ ...prev, completedCount: prev.completedCount + 1 }));
  }, []);

  // Set once and never unset, so the achievement cannot flicker. Returns the
  // same object when already true, which avoids a pointless re-render.
  const markRanked = useCallback(() => {
    setProgress((prev) => (prev.ranked ? prev : { ...prev, ranked: true }));
  }, []);

  // Memoised because a context value rebuilt on every render re-renders every
  // consumer, which here is every screen in the app.
  const value = useMemo<ProgressContextValue>(
    () => ({ progress, hydrated, awardXp, bumpCompleted, markRanked }),
    [progress, hydrated, awardXp, bumpCompleted, markRanked]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

// Reads the shared progress. Outside a provider it returns a static default with
// no-op mutators, so shared components and unit tests render without wrapping
// every one in a ProgressProvider (the same fallback approach as useTheme).
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (ctx) return ctx;
  return {
    progress: DEFAULT_PROGRESS,
    hydrated: true,
    awardXp: () => {},
    bumpCompleted: () => {},
    markRanked: () => {},
  };
}
