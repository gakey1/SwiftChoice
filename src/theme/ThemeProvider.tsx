// The single source of truth for which colour theme is showing, shaped like
// AuthProvider: one provider near the top, one useTheme() hook below it. The
// choice is loaded on boot and saved on change.
//
// Colours only. Spacing, radii and font names do not vary by theme, so they
// stay in tokens.ts.

// React itself, plus the hooks the provider is built from.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// The palettes, their names, and the one that applies before a choice loads.
import {
  DEFAULT_THEME,
  themes,
  type ThemeColors,
  type ThemeName,
} from "@/theme/themes";
// Where the choice is persisted between app opens.
import { loadThemeName, saveThemeName } from "@/services/localdb/themeStorage";

// What every consumer of useTheme() gets: the active colours, which theme they
// belong to, and the two ways to change it.
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

// The context defaults to the dark Arcade theme with no-op setters. This means a
// component that reads useTheme() outside a ThemeProvider (in a unit test, say)
// gets a sensible theme rather than crashing. In the real app, App.tsx always
// mounts the provider at the root, so the live theme always wins.
const DEFAULT_VALUE: ThemeContextValue = {
  colors: themes[DEFAULT_THEME],
  name: DEFAULT_THEME,
  isDark: DEFAULT_THEME === "arcadeDark",
  setThemeName: () => undefined,
  toggleDark: () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_VALUE);

// Wraps the app, owns the current theme, and persists every change.
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

  // Memoised because a context value rebuilt on every render re-renders every
  // consumer, which here is every screen in the app.
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
  return useContext(ThemeContext);
}
