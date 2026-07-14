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
