// Holds the app's active colour theme and hands it to every screen below it.
// This is the single source of truth for which theme is showing. It mirrors the
// shape of AuthProvider: one provider near the top of the tree, one hook
// (useTheme) that screens read from.
//
// On boot it loads the saved choice from the device; when the theme changes it
// saves the new choice. Screens read colours with useTheme().colors, so flipping
// the theme re-renders the whole app in the new palette. Only colours live here;
// spacing, radii and font names never change between themes and stay in tokens.ts.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_THEME,
  themes,
  type ThemeColors,
  type ThemeName,
} from "@/theme/themes";
import { loadThemeName, saveThemeName } from "@/services/localdb/themeStorage";

type ThemeContextValue = {
  // The active theme's colours. This is what screens read.
  colors: ThemeColors;
  // The active theme's name, e.g. for showing which one is selected in Settings.
  name: ThemeName;
  // True when the dark Arcade theme is active.
  isDark: boolean;
  // Set a specific theme by name (persists the choice).
  setThemeName: (name: ThemeName) => void;
  // Flip between the dark and light Arcade themes (persists the choice). This is
  // what the Settings dark-mode switch calls.
  toggleDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>(DEFAULT_THEME);

  // Load the saved choice once on boot. The `active` guard stops a late load from
  // setting state after the provider has unmounted.
  useEffect(() => {
    let active = true;
    void loadThemeName().then((saved) => {
      if (active) setName(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  const setThemeName = useCallback((next: ThemeName) => {
    setName(next);
    void saveThemeName(next);
  }, []);

  const toggleDark = useCallback(() => {
    setName((current) => {
      const next: ThemeName = current === "arcadeDark" ? "arcadeLight" : "arcadeDark";
      void saveThemeName(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: themes[name],
      name,
      isDark: name === "arcadeDark",
      setThemeName,
      toggleDark,
    }),
    [name, setThemeName, toggleDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// The hook screens use to read the active theme. Returns the whole context, so a
// screen can also flip the theme (the Settings toggle uses toggleDark).
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return ctx;
}
