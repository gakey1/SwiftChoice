// Saves and loads the user's chosen colour theme on the device, so the app opens
// in the same theme next time. It uses AsyncStorage, the same on-device store
// that keeps the user signed in. A theme choice is an ordinary preference, not a
// secret, so it does not belong in Secure Store.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_THEME, THEME_NAMES, type ThemeName } from "@/theme/themes";

const THEME_KEY = "swiftchoice.theme";

function isThemeName(value: string | null): value is ThemeName {
  return value !== null && (THEME_NAMES as readonly string[]).includes(value);
}

// Returns the saved theme, or the default if nothing valid is stored. Never
// throws: a storage error just falls back to the default so the app still opens.
export async function loadThemeName(): Promise<ThemeName> {
  try {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    if (isThemeName(stored)) {
      return stored;
    }
  } catch {
    // Fall through to the default.
  }
  return DEFAULT_THEME;
}

// Persists the chosen theme. Non-fatal on failure: the choice just will not
// survive this restart, which is not worth crashing the app over.
export async function saveThemeName(name: ThemeName): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, name);
  } catch {
    // Ignore: persistence is best-effort.
  }
}
