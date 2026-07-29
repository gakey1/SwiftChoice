// Tests for the budget level stored on the user's profile. Firestore itself is
// stubbed, so these check the logic around it: that a save only writes the one
// field, that an unanswered survey reads back as null, that a value saved in an
// older format is not trusted, and that the answer is remembered per user.

import { doc, getDoc, setDoc } from "firebase/firestore";

import {
  clearBudgetTierCache,
  getBudgetTier,
  isBudgetTier,
  saveBudgetTier,
} from "@/services/firestore/users";

// The Firebase app is not started under Jest, so the database handle is stubbed.
jest.mock("@/services/firebase", () => ({ db: {} }));

// doc() records the path it was asked for. getDoc() and setDoc() are controlled
// by each test.
jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  getDoc: jest.fn(),
  setDoc: jest.fn(async () => undefined),
  serverTimestamp: jest.fn(() => "server-time"),
}));

const mockDoc = doc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;

// The remembered levels live for as long as the module does, so each test starts
// from empty or one case would decide the next one's answer.
beforeEach(() => {
  jest.clearAllMocks();
  clearBudgetTierCache();
});

describe("isBudgetTier", () => {
  it("accepts the three levels the survey offers", () => {
    expect(isBudgetTier("budget")).toBe(true);
    expect(isBudgetTier("moderate")).toBe(true);
    expect(isBudgetTier("premium")).toBe(true);
  });

  it("rejects anything else, including the older dollar-range format", () => {
    expect(isBudgetTier("$20 - $50")).toBe(false);
    expect(isBudgetTier("")).toBe(false);
    expect(isBudgetTier(undefined)).toBe(false);
    expect(isBudgetTier(2)).toBe(false);
  });
});

describe("saveBudgetTier", () => {
  it("writes only the budget field, so the rest of the profile is left alone", async () => {
    await saveBudgetTier("user-1", "premium");

    expect(mockDoc).toHaveBeenCalledWith({}, "users", "user-1");
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/user-1" },
      { budgetTier: "premium" },
      { merge: true }
    );
  });

  it("remembers the level, so reading it back does not go to the database", async () => {
    await saveBudgetTier("user-1", "budget");

    await expect(getBudgetTier("user-1")).resolves.toBe("budget");
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it("still remembers the level for this session when the write fails", async () => {
    mockSetDoc.mockRejectedValueOnce(new Error("offline"));

    await expect(saveBudgetTier("user-1", "moderate")).rejects.toThrow("offline");

    // The caller lets the user through on a failed save, so the level has to be
    // readable for the rest of the session rather than bouncing them back.
    await expect(getBudgetTier("user-1")).resolves.toBe("moderate");
  });
});

describe("getBudgetTier", () => {
  it("returns the saved level", async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ budgetTier: "premium" }) });

    await expect(getBudgetTier("user-1")).resolves.toBe("premium");
  });

  it("returns null when the user has never answered the survey", async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ userId: "user-1" }) });

    await expect(getBudgetTier("user-1")).resolves.toBeNull();
  });

  it("returns null when the profile document does not exist yet", async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => undefined });

    await expect(getBudgetTier("user-1")).resolves.toBeNull();
  });

  it("returns null for a value saved in the older dollar-range format", async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ budgetTier: "$20 - $50" }) });

    await expect(getBudgetTier("user-1")).resolves.toBeNull();
  });

  it("reads once and then remembers, including a null answer", async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({}) });

    await expect(getBudgetTier("user-1")).resolves.toBeNull();
    await expect(getBudgetTier("user-1")).resolves.toBeNull();

    expect(mockGetDoc).toHaveBeenCalledTimes(1);
  });

  it("reads a second user's own profile rather than reusing the first", async () => {
    mockGetDoc.mockResolvedValueOnce({ data: () => ({ budgetTier: "premium" }) });
    await expect(getBudgetTier("user-1")).resolves.toBe("premium");

    // Somebody else signing in on the same phone must be asked on their own
    // terms, which is the whole reason this is on the profile and not the device.
    mockGetDoc.mockResolvedValueOnce({ data: () => ({}) });
    await expect(getBudgetTier("user-2")).resolves.toBeNull();

    expect(mockGetDoc).toHaveBeenCalledTimes(2);
  });
});
