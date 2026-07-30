// Saves and loads which profile avatar the user picked, on the device, so their
// chosen robot shows on Home and in Settings next time. It uses AsyncStorage,
// the same on-device store as the theme and the sign-in session; the avatar
// choice is an ordinary preference, not a secret. Part of the on-device storage
// slice. The stored value is just the avatar's index in the AVATARS list.

import AsyncStorage from "@react-native-async-storage/async-storage";

const AVATAR_KEY = "swiftchoice.avatarIndex";

// Returns the saved avatar index, or 0 (the first avatar) if nothing valid is
// stored. Never throws: any storage error falls back to the default.
export async function loadAvatarIndex(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(AVATAR_KEY);
    if (stored !== null) {
      const n = Number(stored);
      if (Number.isInteger(n) && n >= 0) {
        return n;
      }
    }
  } catch {
    // Fall through to the default.
  }
  return 0;
}

// Persists the chosen avatar index. Best-effort: on failure the choice just will
// not survive this restart, which is not worth crashing the app over.
export async function saveAvatarIndex(index: number): Promise<void> {
  try {
    await AsyncStorage.setItem(AVATAR_KEY, String(index));
  } catch {
    // Ignore: persistence is best-effort.
  }
}

// Forgets the chosen avatar, so it goes back to the first one. Used by the
// clear-local-data and delete-account flows. Never throws, for the same reason
// as the progress version: one failing key must not stop the rest of the wipe.
export async function clearAvatarIndex(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AVATAR_KEY);
  } catch {
    // Nothing to do. The next read falls back to the first avatar.
  }
}

