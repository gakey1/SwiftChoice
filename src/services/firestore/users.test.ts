// Tests for the budget level stored on the user's profile. Firestore itself is
// stubbed, so these check the logic around it: that a save only writes the one
// field, that an unanswered survey reads back as null, that a value saved in an
// older format is not trusted, and that the answer is remembered per user.

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";

import {
  clearBudgetTierCache,
  deleteAllDecisions,
  deleteUserDocument,
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
  collection: jest.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(async () => undefined),
  deleteDoc: jest.fn(async () => undefined),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(() => "server-time"),
}));

const mockDoc = doc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockGetDocs = getDocs as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockWriteBatch = writeBatch as jest.Mock;

// Stands in for Firestore's batch. Each one records what it was asked to delete
// and whether it was committed, so a test can see how the work was split up.
type FakeBatch = { deleted: unknown[]; commits: number };

function stubBatches(): FakeBatch[] {
  const batches: FakeBatch[] = [];
  mockWriteBatch.mockImplementation(() => {
    const batch: FakeBatch = { deleted: [], commits: 0 };
    batches.push(batch);
    return {
      delete: (ref: unknown) => batch.deleted.push(ref),
      commit: async () => {
        batch.commits += 1;
      },
    };
  });
  return batches;
}

// A snapshot holding n documents, each with a ref the batch can be handed.
function snapshotOf(n: number) {
  return {
    docs: Array.from({ length: n }, (_unused, i) => ({ ref: { id: `decision-${i}` } })),
  };
}

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

// Deleting the cloud copy of a user's decisions (US33). Firestore has no "delete
// this collection" call at any tier, so the documents are listed and removed in
// batches, and these check the splitting rather than Firestore itself.
describe("deleteAllDecisions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads the decisions belonging to that user and nobody else", async () => {
    stubBatches();
    mockGetDocs.mockResolvedValue(snapshotOf(2));

    await deleteAllDecisions("user-1");

    expect(mockCollection).toHaveBeenCalledWith({}, "users", "user-1", "decisions");
  });

  it("deletes every document and says how many there were", async () => {
    const batches = stubBatches();
    mockGetDocs.mockResolvedValue(snapshotOf(3));

    await expect(deleteAllDecisions("user-1")).resolves.toBe(3);

    expect(batches).toHaveLength(1);
    expect(batches[0]?.deleted).toHaveLength(3);
    expect(batches[0]?.commits).toBe(1);
  });

  it("commits nothing when there is nothing to delete", async () => {
    const batches = stubBatches();
    mockGetDocs.mockResolvedValue(snapshotOf(0));

    await expect(deleteAllDecisions("user-1")).resolves.toBe(0);

    // An empty batch is a wasted round trip, and on a brand new account this is
    // the common case.
    expect(batches).toHaveLength(0);
  });

  it("splits into batches of 500, because Firestore refuses more in one", async () => {
    // The exact boundary, since 500 is the limit rather than the first invalid
    // count. Off by one here means the batch is rejected outright and nothing at
    // all is deleted for a heavy user.
    const batches = stubBatches();
    mockGetDocs.mockResolvedValue(snapshotOf(500));

    await deleteAllDecisions("user-1");

    expect(batches).toHaveLength(1);
    expect(batches[0]?.deleted).toHaveLength(500);
  });

  it("uses a second batch once past the limit, leaving no document behind", async () => {
    const batches = stubBatches();
    mockGetDocs.mockResolvedValue(snapshotOf(501));

    await expect(deleteAllDecisions("user-1")).resolves.toBe(501);

    expect(batches).toHaveLength(2);
    expect(batches[0]?.deleted).toHaveLength(500);
    expect(batches[1]?.deleted).toHaveLength(1);
    // Both committed. A built-but-uncommitted batch deletes nothing while
    // looking, from the counts alone, like it worked.
    expect(batches.every((b) => b.commits === 1)).toBe(true);
  });
});

// The profile document, deleted after the decisions beneath it.
describe("deleteUserDocument", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes that user's own document", async () => {
    await deleteUserDocument("user-1");

    expect(mockDoc).toHaveBeenCalledWith({}, "users", "user-1");
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: "users/user-1" });
  });
});
