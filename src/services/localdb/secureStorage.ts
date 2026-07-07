// A small wrapper around the device's secure storage (the keychain). The rest of
// the app uses these functions instead of the library directly, so if we ever
// change how sensitive values are stored, we only change it here. Everything is
// saved as plain text, so whatever calls these turns objects into strings first.

import * as SecureStore from "expo-secure-store";

// Saves a value securely under the given key.
export async function setItem(key: string, value: string): Promise<void> {
  SecureStore.setItem(key, value);
}

// Reads a value back, or null if nothing is saved under that key.
export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItem(key);
}

// Deletes whatever is stored under the given key.
export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

// Same as removeItem. Kept under a second name so it reads clearly where it is used.
export async function clearItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
