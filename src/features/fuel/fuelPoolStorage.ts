// Fuel Pool storage functions.
// Handles CRUD operations for user food options stored in SQLite.

import { getDb } from "@/services/localdb/db";

export type FuelBudget = "$" | "$$" | "$$$";
export type FuelPrepTime = "short" | "medium" | "long";
export type FuelDistance = "near" | "mid" | "far";

export interface FuelPoolItem {
  id: number;
  name: string;
  budget: FuelBudget;
  prepTime: FuelPrepTime;
  distance: FuelDistance;
}

// Returns all saved Fuel pool items ordered alphabetically.
export async function getFuelPool(): Promise<FuelPoolItem[]> {
  const db = await getDb();

  return await db.getAllAsync<FuelPoolItem>(
    `SELECT
      id,
      name,
      budget,
      prep_time AS prepTime,
      distance
    FROM fuel_pool
    ORDER BY name`
  );
}

// Adds a new food option to the Fuel pool.
export async function addFuelItem(
  name: string,
  budget: FuelBudget = "$$",
  prepTime: FuelPrepTime = "medium",
  distance: FuelDistance = "mid"
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Fuel item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync(
    "INSERT INTO fuel_pool (name, budget, prep_time, distance) VALUES (?, ?, ?, ?)",
    [trimmedName, budget, prepTime, distance]
  );
}

// Updates an existing food option.
export async function updateFuelItem(
  id: number,
  name: string,
  budget: FuelBudget = "$$",
  prepTime: FuelPrepTime = "medium",
  distance: FuelDistance = "mid"
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Fuel item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync(
    "UPDATE fuel_pool SET name = ?, budget = ?, prep_time = ?, distance = ? WHERE id = ?",
    [trimmedName, budget, prepTime, distance, id]
  );
}

// Deletes a single food option from the Fuel pool.
export async function deleteFuelItem(id: number): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM fuel_pool WHERE id = ?", [id]);
}

// Removes all food options from the Fuel pool.
export async function clearFuelPool(): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM fuel_pool");
}

// Returns Fuel items in the format needed by the recommendation engine.
export async function getFuelRecommendationPool(): Promise<FuelPoolItem[]> {
  return getFuelPool();
}

// Checks if the Fuel pool has no saved options.
// The UI can use this to show a friendly empty state.
export async function isFuelPoolEmpty(): Promise<boolean> {
  const items = await getFuelPool();

  return items.length === 0;
}