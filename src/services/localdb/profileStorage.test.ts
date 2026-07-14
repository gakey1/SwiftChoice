// Tests for the profile avatar persistence layer. AsyncStorage is mocked so the
// tests do not touch a real device store, and check that a saved index is read
// back, that missing or invalid values fall back to the first avatar, and that a
// save writes the key.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadAvatarIndex, saveAvatarIndex } from "@/services/localdb/profileStorage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

describe("profileStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the saved avatar index", async () => {
    mockGetItem.mockResolvedValue("2");

    await expect(loadAvatarIndex()).resolves.toBe(2);
  });

  it("falls back to 0 when nothing is stored", async () => {
    mockGetItem.mockResolvedValue(null);

    await expect(loadAvatarIndex()).resolves.toBe(0);
  });

  it("falls back to 0 when the stored value is not a valid index", async () => {
    mockGetItem.mockResolvedValue("nope");

    await expect(loadAvatarIndex()).resolves.toBe(0);
  });

  it("falls back to 0 when the store throws", async () => {
    mockGetItem.mockRejectedValue(new Error("storage unavailable"));

    await expect(loadAvatarIndex()).resolves.toBe(0);
  });

  it("saves the chosen index under the avatar key", async () => {
    await saveAvatarIndex(3);

    expect(mockSetItem).toHaveBeenCalledWith("swiftchoice.avatarIndex", "3");
  });
});
