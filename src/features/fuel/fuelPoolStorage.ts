// Fuel Pool storage functions.
// Handles CRUD operations for user food options stored in SQLite.

import { getDb } from "@/services/localdb/db";

export interface FuelPoolItem {
  id: number;
  name: string;
}

// Returns all saved Fuel pool items ordered alphabetically.
export async function getFuelPool(): Promise<FuelPoolItem[]> {
  const db = await getDb();

  return await db.getAllAsync<FuelPoolItem>(
    "SELECT * FROM fuel_pool ORDER BY name"
  );
}

// Adds a new food option to the Fuel pool.
export async function addFuelItem(name: string): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Fuel item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync("INSERT INTO fuel_pool (name) VALUES (?)", [trimmedName]);
}

// Updates an existing food option.
export async function updateFuelItem(
  id: number,
  name: string
): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    "UPDATE fuel_pool SET name = ? WHERE id = ?",
    [name, id]
  );
}

// Deletes a single food option from the Fuel pool.
export async function deleteFuelItem(id: number): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    "DELETE FROM fuel_pool WHERE id = ?",
    [id]
  );
}

// Removes all food options from the Fuel pool.
export async function clearFuelPool(): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    "DELETE FROM fuel_pool"
  );
}