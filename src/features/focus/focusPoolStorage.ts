// Focus Pool storage functions.
// Handles CRUD operations for user study/work locations stored in SQLite.

import { getDb } from "@/services/localdb/db";

export type FocusEnergy = "low" | "medium" | "high";
export type FocusVibe = "silent" | "background" | "collaborative";

export interface FocusPoolItem {
  id: number;
  name: string;
  energy: FocusEnergy;
  vibe: FocusVibe;
}

// Returns all saved Focus pool items ordered alphabetically.
export async function getFocusPool(): Promise<FocusPoolItem[]> {
  const db = await getDb();

  return await db.getAllAsync<FocusPoolItem>(
    `SELECT
      id,
      name,
      energy,
      vibe
    FROM focus_pool
    ORDER BY name`
  );
}

// Adds a new study/work location to the Focus pool.
export async function addFocusItem(
  name: string,
  energy: FocusEnergy = "medium",
  vibe: FocusVibe = "background"
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Focus item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync(
    "INSERT INTO focus_pool (name, energy, vibe) VALUES (?, ?, ?)",
    [trimmedName, energy, vibe]
  );
}

// Updates an existing Focus pool item.
export async function updateFocusItem(
  id: number,
  name: string,
  energy: FocusEnergy = "medium",
  vibe: FocusVibe = "background"
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Focus item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync(
    "UPDATE focus_pool SET name = ?, energy = ?, vibe = ? WHERE id = ?",
    [trimmedName, energy, vibe, id]
  );
}

// Deletes a single location from the Focus pool.
export async function deleteFocusItem(id: number): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM focus_pool WHERE id = ?", [id]);
}

// Removes all locations from the Focus pool.
export async function clearFocusPool(): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM focus_pool");
}

// Returns Focus items in the format needed by the Focus recommendation logic.
export async function getFocusRecommendationPool(): Promise<FocusPoolItem[]> {
  return getFocusPool();
}

// Checks if the Focus pool has no saved options.
// The UI can use this to show a friendly empty state.
export async function isFocusPoolEmpty(): Promise<boolean> {
  const items = await getFocusPool();

  return items.length === 0;
}