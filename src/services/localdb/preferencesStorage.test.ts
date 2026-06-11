import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
} from "@/services/localdb/preferencesStorage";
import { getItem, setItem } from "@/services/localdb/secureStorage";

jest.mock("@/services/localdb/secureStorage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGet = getItem as jest.Mock;
const mockSet = setItem as jest.Mock;

describe("preferencesStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("writes each preference field under its own key", async () => {
    mockSet.mockResolvedValue(undefined);

    await savePreferences({
      dietaryRestrictions: "Vegetarian",
      defaultBudget: "$50 - $100",
      workHours: "Flexible",
    });

    expect(mockSet).toHaveBeenCalledWith("preference_diet", "Vegetarian");
    expect(mockSet).toHaveBeenCalledWith("preference_budget", "$50 - $100");
    expect(mockSet).toHaveBeenCalledWith("preference_hours", "Flexible");
  });

  it("returns stored values when present", async () => {
    mockGet
      .mockResolvedValueOnce("Halal")
      .mockResolvedValueOnce("$100+")
      .mockResolvedValueOnce("7am - 3pm");

    await expect(loadPreferences()).resolves.toEqual({
      dietaryRestrictions: "Halal",
      defaultBudget: "$100+",
      workHours: "7am - 3pm",
    });
  });

  it("falls back to defaults when a key is missing", async () => {
    mockGet.mockResolvedValue(null);

    await expect(loadPreferences()).resolves.toEqual(DEFAULT_PREFERENCES);
  });
});
