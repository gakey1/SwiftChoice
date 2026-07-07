// Saves and loads the user's settings (diet, budget, work hours) on the device.
// They are kept in the on-device database as simple key and value rows.

import { getDb } from "@/services/localdb/db";

// The shape of the settings stored for a user.
export type UserPreferences = {
  dietaryRestrictions: string;
  defaultBudget: string;
  workHours: string;
};

// The values used before a user has set anything of their own.
export const DEFAULT_PREFERENCES: UserPreferences = {
  dietaryRestrictions: "None set",
  defaultBudget: "$20 - $50",
  workHours: "9am - 5pm",
};

// The keys each setting is saved under in the database.
const DIET_KEY = "preference_diet";
const BUDGET_KEY = "preference_budget";
const HOURS_KEY = "preference_hours";

// Saves all three settings. Using a transaction means they are written together,
// or none of them are if something fails partway through.
export async function savePreferences(
  preferences: UserPreferences
): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
      [DIET_KEY, preferences.dietaryRestrictions]
    );

    await db.runAsync(
      "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
      [BUDGET_KEY, preferences.defaultBudget]
    );

    await db.runAsync(
      "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
      [HOURS_KEY, preferences.workHours]
    );
  });
}

// Reads the three settings back. If one has never been set, its default is used.
export async function loadPreferences(): Promise<UserPreferences> {
  const db = await getDb();

  const dietRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM preferences WHERE key = ?",
    [DIET_KEY]
  );

  const budgetRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM preferences WHERE key = ?",
    [BUDGET_KEY]
  );

  const hoursRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM preferences WHERE key = ?",
    [HOURS_KEY]
  );

  return {
    dietaryRestrictions:
      dietRow?.value ?? DEFAULT_PREFERENCES.dietaryRestrictions,
    defaultBudget: budgetRow?.value ?? DEFAULT_PREFERENCES.defaultBudget,
    workHours: hoursRow?.value ?? DEFAULT_PREFERENCES.workHours,
  };
}

// Deletes all saved settings.
export async function clearPreferences(): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM preferences");
}

// Same as loadPreferences. Kept under a clearer name for where it is used.
export async function getPreferenceDefaults(): Promise<UserPreferences> {
  return loadPreferences();
}