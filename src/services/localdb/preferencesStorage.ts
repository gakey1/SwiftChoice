import { getDb } from "@/services/localdb/db";

export type UserPreferences = {
  dietaryRestrictions: string;
  defaultBudget: string;
  workHours: string;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  dietaryRestrictions: "None set",
  defaultBudget: "$20 - $50",
  workHours: "9am - 5pm",
};

const DIET_KEY = "preference_diet";
const BUDGET_KEY = "preference_budget";
const HOURS_KEY = "preference_hours";

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

export async function clearPreferences(): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM preferences");
}

export async function getPreferenceDefaults(): Promise<UserPreferences> {
  return loadPreferences();
}