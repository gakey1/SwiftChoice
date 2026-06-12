import {
  clearPreferences,
  DEFAULT_PREFERENCES,
  getPreferenceDefaults,
  loadPreferences,
  savePreferences,
} from "@/services/localdb/preferencesStorage";
import { getDb } from "@/services/localdb/db";


const rows = new Map<string, string>();

const mockDb = {
  withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => {
    await callback();
  }),

  runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.startsWith("INSERT OR REPLACE")) {
      const [key, value] = params as [string, string];
      rows.set(key, value);
      return;
    }

    if (sql.startsWith("DELETE FROM preferences")) {
      rows.clear();
    }
  }),

  getFirstAsync: jest.fn(async (_sql: string, params?: unknown[]) => {
    const [key] = params as [string];

    const value = rows.get(key);

    if (!value) return null;

    return { value };
  }),

  getAllAsync: jest.fn(async () => {
    return Array.from(rows.entries()).map(([key, value]) => ({
      key,
      value,
    }));
  }),
};

jest.mock("@/services/localdb/db", () => ({
  getDb: jest.fn(),
}));

const mockGetDb = getDb as jest.Mock;

describe("preferencesStorage", () => {
  beforeEach(() => {
    rows.clear();
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(mockDb);
  });

  it("writes each preference field into SQLite", async () => {
    await savePreferences({
      dietaryRestrictions: "Vegetarian",
      defaultBudget: "$50 - $100",
      workHours: "Flexible",
    });

    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
      ["preference_diet", "Vegetarian"]
    );

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
      ["preference_budget", "$50 - $100"]
    );

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
      ["preference_hours", "Flexible"]
    );
  });

  it("returns stored values when present", async () => {
    rows.set("preference_diet", "Halal");
    rows.set("preference_budget", "$100+");
    rows.set("preference_hours", "7am - 3pm");

    await expect(loadPreferences()).resolves.toEqual({
      dietaryRestrictions: "Halal",
      defaultBudget: "$100+",
      workHours: "7am - 3pm",
    });
  });

  it("falls back to defaults when a preference value is missing", async () => {
    rows.set("preference_diet", "No beef");

    await expect(loadPreferences()).resolves.toEqual({
      ...DEFAULT_PREFERENCES,
      dietaryRestrictions: "No beef",
    });
  });

  it("clears all saved preferences", async () => {
    rows.set("preference_diet", "Vegetarian");
    rows.set("preference_budget", "$50 - $100");
    rows.set("preference_hours", "Flexible");

    await clearPreferences();

    expect(rows.size).toBe(0);
    expect(mockDb.runAsync).toHaveBeenCalledWith("DELETE FROM preferences");
  });

  it("returns saved preferences as defaults for module screens", async () => {
    rows.set("preference_diet", "Halal");
    rows.set("preference_budget", "$20 - $50");
    rows.set("preference_hours", "Flexible");

    await expect(getPreferenceDefaults()).resolves.toEqual({
      dietaryRestrictions: "Halal",
      defaultBudget: "$20 - $50",
      workHours: "Flexible",
    });
  });

  it("keeps values available after storage is read again", async () => {
    await savePreferences({
      dietaryRestrictions: "Vegetarian",
      defaultBudget: "Under $20",
      workHours: "7am - 3pm",
    });

    await expect(loadPreferences()).resolves.toEqual({
      dietaryRestrictions: "Vegetarian",
      defaultBudget: "Under $20",
      workHours: "7am - 3pm",
    });
  });
});