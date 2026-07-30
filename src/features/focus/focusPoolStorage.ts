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
  // Whether the spot is outside. Only outdoor spots get the rain warning on the
  // Focus result card, since a forecast is irrelevant to a library desk.
  outdoor: boolean;
}

// The shape SQLite actually returns. It has no boolean type, so outdoor comes
// back as 0 or 1 and is converted before the rest of the app sees it.
interface FocusPoolRow {
  id: number;
  name: string;
  energy: FocusEnergy;
  vibe: FocusVibe;
  outdoor: number;
}

// Returns all saved Focus pool items ordered alphabetically.
export async function getFocusPool(): Promise<FocusPoolItem[]> {
  const db = await getDb();

  const rows = await db.getAllAsync<FocusPoolRow>(
    `SELECT
      id,
      name,
      energy,
      vibe,
      outdoor
    FROM focus_pool
    ORDER BY name`
  );

  return rows.map((row) => ({ ...row, outdoor: row.outdoor === 1 }));
}

// Adds a new study/work location to the Focus pool.
export async function addFocusItem(
  name: string,
  energy: FocusEnergy = "medium",
  vibe: FocusVibe = "background",
  outdoor = false
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Focus item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync(
    "INSERT INTO focus_pool (name, energy, vibe, outdoor) VALUES (?, ?, ?, ?)",
    [trimmedName, energy, vibe, outdoor ? 1 : 0]
  );
}

// Updates an existing Focus pool item.
export async function updateFocusItem(
  id: number,
  name: string,
  energy: FocusEnergy = "medium",
  vibe: FocusVibe = "background",
  outdoor = false
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Focus item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync(
    "UPDATE focus_pool SET name = ?, energy = ?, vibe = ?, outdoor = ? WHERE id = ?",
    [trimmedName, energy, vibe, outdoor ? 1 : 0, id]
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