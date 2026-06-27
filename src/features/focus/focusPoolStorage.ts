// Focus Pool storage functions.
// Handles CRUD operations for user study/work locations stored in SQLite.

import { getDb } from "@/services/localdb/db";

export interface FocusPoolItem {
  id: number;
  name: string;
}

// Returns all saved Focus pool items ordered alphabetically.
export async function getFocusPool(): Promise<FocusPoolItem[]> {
  const db = await getDb();

  return await db.getAllAsync<FocusPoolItem>(
    "SELECT * FROM focus_pool ORDER BY name"
  );
}

// Adds a new study/work location to the Focus pool.
export async function addFocusItem(name: string): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Focus item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync("INSERT INTO focus_pool (name) VALUES (?)", [trimmedName]);
}

// Updates an existing Focus pool item.
export async function updateFocusItem(
  id: number,
  name: string
): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    "UPDATE focus_pool SET name = ? WHERE id = ?",
    [name, id]
  );
}

// Deletes a single location from the Focus pool.
export async function deleteFocusItem(id: number): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    "DELETE FROM focus_pool WHERE id = ?",
    [id]
  );
}

// Removes all locations from the Focus pool.
export async function clearFocusPool(): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    "DELETE FROM focus_pool"
  );
}