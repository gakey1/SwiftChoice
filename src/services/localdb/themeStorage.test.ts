// Tests for the theme persistence layer. AsyncStorage is mocked so the tests do
// not touch a real device store, and check that a saved theme is read back, that
// an unusable value falls back to the default, and that a save writes the key.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadThemeName, saveThemeName } from "@/services/localdb/themeStorage";
import { DEFAULT_THEME } from "@/theme/themes";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe("themeStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the saved theme when a valid one is stored", async () => {
    mockGetItem.mockResolvedValue("arcadeLight");

    await expect(loadThemeName()).resolves.toBe("arcadeLight");
  });

  it("falls back to the default when nothing is stored", async () => {
    mockGetItem.mockResolvedValue(null);

    await expect(loadThemeName()).resolves.toBe(DEFAULT_THEME);
  });

  it("falls back to the default when the stored value is not a real theme", async () => {
    mockGetItem.mockResolvedValue("neonMode");

    await expect(loadThemeName()).resolves.toBe(DEFAULT_THEME);
  });

  it("falls back to the default when the store throws", async () => {
    mockGetItem.mockRejectedValue(new Error("storage unavailable"));

    await expect(loadThemeName()).resolves.toBe(DEFAULT_THEME);
  });

  it("saves the chosen theme under the theme key", async () => {
    await saveThemeName("arcadeLight");

    expect(mockSetItem).toHaveBeenCalledWith("swiftchoice.theme", "arcadeLight");
  });
});
