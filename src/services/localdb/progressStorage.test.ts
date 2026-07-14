// Tests for the Priority progress persistence layer. AsyncStorage is mocked so
// the tests do not touch a real device store, and check that saved progress is
// read back, that missing or corrupt values fall back to a fresh default, and
// that a save writes the key as JSON.

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_PROGRESS,
  loadProgress,
  saveProgress,
} from "@/services/localdb/progressStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe("progressStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the saved progress when a valid one is stored", async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ xp: 120, level: 3, completedCount: 4, coins: 60, ranked: true })
    );

    await expect(loadProgress()).resolves.toEqual({
      xp: 120,
      level: 3,
      completedCount: 4,
      coins: 60,
      ranked: true,
    });
  });

  it("defaults coins and ranked for progress saved before they existed", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ xp: 10, level: 1, completedCount: 0 }));

    await expect(loadProgress()).resolves.toEqual({
      xp: 10,
      level: 1,
      completedCount: 0,
      coins: 0,
      ranked: false,
    });
  });

  it("falls back to the default when nothing is stored", async () => {
    mockGetItem.mockResolvedValue(null);

    await expect(loadProgress()).resolves.toEqual(DEFAULT_PROGRESS);
  });

  it("falls back to the default when the stored value is malformed", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ xp: -5, level: 0 }));

    await expect(loadProgress()).resolves.toEqual(DEFAULT_PROGRESS);
  });

  it("falls back to the default when the stored JSON is unparseable", async () => {
    mockGetItem.mockResolvedValue("not json");

    await expect(loadProgress()).resolves.toEqual(DEFAULT_PROGRESS);
  });

  it("falls back to the default when the store throws", async () => {
    mockGetItem.mockRejectedValue(new Error("storage unavailable"));

    await expect(loadProgress()).resolves.toEqual(DEFAULT_PROGRESS);
  });

  it("saves progress as JSON under the progress key", async () => {
    await saveProgress({ xp: 50, level: 2, completedCount: 1, coins: 8, ranked: true });

    expect(mockSetItem).toHaveBeenCalledWith(
      "swiftchoice.priorityProgress",
      JSON.stringify({ xp: 50, level: 2, completedCount: 1, coins: 8, ranked: true })
    );
  });
});
