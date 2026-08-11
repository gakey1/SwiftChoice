// Tests for the on-device wipe. Every store it touches is mocked, so these
// check the things that matter for a privacy action: that nothing personal is
// missed, that the theme is deliberately left alone, that one broken store does
// not stop the rest, and that a partial wipe is reported rather than hidden.

// The function under test.
import { clearLocalData } from "@/features/privacy/localData";
// Every store it clears, mocked below. Importing all of them is what lets a
// case prove nothing personal was missed.
import { clearFocusPool } from "@/features/focus/focusPoolStorage";
import { clearFuelPool } from "@/features/fuel/fuelPoolStorage";
import { clearDecisions } from "@/features/history/historyStorage";
import { clearPreferences } from "@/services/localdb/preferencesStorage";
import { clearAvatarIndex } from "@/services/localdb/profileStorage";
import { clearProgress } from "@/services/localdb/progressStorage";

jest.mock("@/features/focus/focusPoolStorage", () => ({ clearFocusPool: jest.fn() }));
jest.mock("@/features/fuel/fuelPoolStorage", () => ({ clearFuelPool: jest.fn() }));
jest.mock("@/features/history/historyStorage", () => ({ clearDecisions: jest.fn() }));
jest.mock("@/services/localdb/preferencesStorage", () => ({ clearPreferences: jest.fn() }));
jest.mock("@/services/localdb/profileStorage", () => ({ clearAvatarIndex: jest.fn() }));
jest.mock("@/services/localdb/progressStorage", () => ({ clearProgress: jest.fn() }));

// The theme module is intentionally not imported by the code under test. This
// mock exists so the test can prove it is never reached.
jest.mock("@/services/localdb/themeStorage", () => ({
  saveThemeName: jest.fn(),
  loadThemeName: jest.fn(),
}));

const all = [
  clearPreferences,
  clearFuelPool,
  clearFocusPool,
  clearDecisions,
  clearProgress,
  clearAvatarIndex,
] as jest.Mock[];

beforeEach(() => {
  jest.clearAllMocks();
  all.forEach((fn) => fn.mockResolvedValue(undefined));
});

describe("clearLocalData", () => {
  it("clears every on-device store that holds something personal", async () => {
    await expect(clearLocalData()).resolves.toEqual({ ok: true, failed: [] });

    // Named individually rather than counted, so adding a new store without
    // adding it here shows up as a gap instead of passing quietly.
    expect(clearPreferences).toHaveBeenCalledTimes(1);
    expect(clearFuelPool).toHaveBeenCalledTimes(1);
    expect(clearFocusPool).toHaveBeenCalledTimes(1);
    expect(clearDecisions).toHaveBeenCalledTimes(1);
    expect(clearProgress).toHaveBeenCalledTimes(1);
    expect(clearAvatarIndex).toHaveBeenCalledTimes(1);
  });

  it("leaves the theme alone", async () => {
    // A deliberate choice, not an oversight: resetting somebody's dark mode is a
    // confusing side effect of a privacy action, and a theme is not personal data.
    const themeStorage = jest.requireMock("@/services/localdb/themeStorage");

    await clearLocalData();

    expect(themeStorage.saveThemeName).not.toHaveBeenCalled();
  });

  it("keeps going when one store fails, so the rest is still cleared", async () => {
    (clearFuelPool as jest.Mock).mockRejectedValue(new Error("database locked"));

    const result = await clearLocalData();

    expect(result.ok).toBe(false);
    // The steps after the failing one still ran.
    expect(clearFocusPool).toHaveBeenCalledTimes(1);
    expect(clearAvatarIndex).toHaveBeenCalledTimes(1);
  });

  it("reports which store failed rather than claiming success", async () => {
    // Telling somebody their data is gone when some of it is not is the one
    // outcome this feature must never produce.
    (clearDecisions as jest.Mock).mockRejectedValue(new Error("no such table"));

    await expect(clearLocalData()).resolves.toEqual({
      ok: false,
      failed: ["decision history on this device"],
    });
  });

  it("can be run twice without complaining", async () => {
    await clearLocalData();
    await expect(clearLocalData()).resolves.toEqual({ ok: true, failed: [] });
  });
});
