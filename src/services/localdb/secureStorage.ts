// Thin wrapper over expo-secure-store. Keeps the rest of the app from
// importing the SDK directly, so the storage backend can change in one place.
// Values are read and written as plain strings; callers serialise structured
// data themselves.

import * as SecureStore from "expo-secure-store";

export async function setItem(key: string, value: string): Promise<void> {
  SecureStore.setItem(key, value);
}

export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItem(key);
}

export async function removeItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function clearItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
