import { getItem, setItem } from "@/services/localdb/secureStorage";

export type UserPreferences = {
  dietaryRestrictions: string;
  defaultBudget: string;
  workHours: string;
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  dietaryRestrictions: "None set",
  defaultBudget: "$$",
  workHours: "9am - 5pm",
};

const DIET_KEY = "preference_diet";
const BUDGET_KEY = "preference_budget";
const HOURS_KEY = "preference_hours";

export async function savePreferences(
  preferences: UserPreferences
): Promise<void> {
  await setItem(DIET_KEY, preferences.dietaryRestrictions);
  await setItem(BUDGET_KEY, preferences.defaultBudget);
  await setItem(HOURS_KEY, preferences.workHours);
}

export async function loadPreferences(): Promise<UserPreferences> {
  const savedDiet = await getItem(DIET_KEY);
  const savedBudget = await getItem(BUDGET_KEY);
  const savedHours = await getItem(HOURS_KEY);

  return {
    dietaryRestrictions:
      savedDiet ?? DEFAULT_PREFERENCES.dietaryRestrictions,
    defaultBudget:
      savedBudget ?? DEFAULT_PREFERENCES.defaultBudget,
    workHours:
      savedHours ?? DEFAULT_PREFERENCES.workHours,
  };
}