// Tests for the Focus pool storage. The on-device database is replaced with a
// small in-memory fake, so these check that spots are added, listed in order,
// trimmed, updated, deleted, and cleared, and that an empty name is rejected.

import {
  addFocusItem,
  clearFocusPool,
  deleteFocusItem,
  getFocusPool,
  getFocusRecommendationPool,
  isFocusPoolEmpty,
  updateFocusItem,
} from "@/features/focus/focusPoolStorage";
import { getDb } from "@/services/localdb/db";

jest.mock("@/services/localdb/db", () => ({
  getDb: jest.fn(),
}));

const mockGetDb = getDb as jest.Mock;

let rows: { id: number; name: string; energy: string; vibe: string; outdoor: number }[] = [];
let nextId = 1;

// A stand-in for the real database: it keeps the pool items in an array and
// answers the same read, insert, update, and delete calls the code makes.
const mockDb = {
  getAllAsync: jest.fn(async () =>
    [...rows].sort((a, b) => a.name.localeCompare(b.name))
  ),

  runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.startsWith("INSERT INTO focus_pool")) {
      rows.push({
        id: nextId,
        name: params?.[0] as string,
        energy: params?.[1] as string,
        vibe: params?.[2] as string,
        // SQLite stores this as 0 or 1, not a boolean, so the fake does too.
        outdoor: params?.[3] as number,
      });
      nextId += 1;
      return;
    }

    if (sql.startsWith("UPDATE focus_pool")) {
      const name = params?.[0] as string;
      const energy = params?.[1] as string;
      const vibe = params?.[2] as string;
      const outdoor = params?.[3] as number;
      const id = params?.[4] as number;

      rows = rows.map((row) =>
        row.id === id ? { ...row, name, energy, vibe, outdoor } : row
      );
      return;
    }

    if (sql.startsWith("DELETE FROM focus_pool WHERE id")) {
      const id = params?.[0] as number;
      rows = rows.filter((row) => row.id !== id);
      return;
    }

    if (sql.startsWith("DELETE FROM focus_pool")) {
      rows = [];
    }
  }),
};

describe("focusPoolStorage", () => {
  beforeEach(() => {
    rows = [];
    nextId = 1;
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(mockDb);
  });

  it("adds and returns Focus pool items", async () => {
    await addFocusItem("Library", "low", "silent");
    await addFocusItem("Cafe", "medium", "background");

    await expect(getFocusPool()).resolves.toEqual([
      { id: 2, name: "Cafe", energy: "medium", vibe: "background", outdoor: false },
      { id: 1, name: "Library", energy: "low", vibe: "silent", outdoor: false },
    ]);
  });

  it("uses default Focus filter values when only a name is provided", async () => {
    await addFocusItem("Library");

    await expect(getFocusPool()).resolves.toEqual([
      { id: 1, name: "Library", energy: "medium", vibe: "background", outdoor: false },
    ]);
  });

  it("returns Focus items for the recommendation engine", async () => {
    await addFocusItem("Library", "low", "silent");

    await expect(getFocusRecommendationPool()).resolves.toEqual([
      { id: 1, name: "Library", energy: "low", vibe: "silent", outdoor: false },
    ]);
  });

  it("checks whether the Focus pool is empty", async () => {
    await expect(isFocusPoolEmpty()).resolves.toBe(true);

    await addFocusItem("Library");

    await expect(isFocusPoolEmpty()).resolves.toBe(false);
  });

  it("trims Focus pool item names before saving", async () => {
    await addFocusItem("  Library  ", "low", "silent");

    await expect(getFocusPool()).resolves.toEqual([
      { id: 1, name: "Library", energy: "low", vibe: "silent", outdoor: false },
    ]);
  });

  it("does not add an empty Focus pool item", async () => {
    await expect(addFocusItem("   ")).rejects.toThrow(
      "Focus item name cannot be empty."
    );

    expect(rows).toEqual([]);
  });

  it("updates a Focus pool item", async () => {
    await addFocusItem("Library");

    await updateFocusItem(1, "Quiet Library", "high", "collaborative");

    await expect(getFocusPool()).resolves.toEqual([
      {
        id: 1,
        name: "Quiet Library",
        energy: "high",
        vibe: "collaborative",
        outdoor: false,
      },
    ]);
  });

  it("deletes a single Focus pool item", async () => {
    await addFocusItem("Library");
    await addFocusItem("Cafe");

    await deleteFocusItem(1);

    await expect(getFocusPool()).resolves.toEqual([
      { id: 2, name: "Cafe", energy: "medium", vibe: "background", outdoor: false },
    ]);
  });

  it("clears all Focus pool items", async () => {
    await addFocusItem("Library");
    await addFocusItem("Cafe");

    await clearFocusPool();

    await expect(getFocusPool()).resolves.toEqual([]);
  });

  it("stores and reads back an outdoor spot", async () => {
    // Outdoor is what the Focus rain warning keys off, so it has to survive the
    // round trip through the database rather than being dropped on the way.
    await addFocusItem("Park Bench", "low", "silent", true);

    await expect(getFocusPool()).resolves.toEqual([
      { id: 1, name: "Park Bench", energy: "low", vibe: "silent", outdoor: true },
    ]);
  });

  it("treats a spot as indoors unless it is said to be outdoors", async () => {
    await addFocusItem("Library");

    const [item] = await getFocusPool();
    expect(item?.outdoor).toBe(false);
  });

  it("can turn an outdoor spot back into an indoor one", async () => {
    await addFocusItem("Courtyard", "medium", "background", true);
    await updateFocusItem(1, "Courtyard Cafe", "medium", "background", false);

    await expect(getFocusPool()).resolves.toEqual([
      { id: 1, name: "Courtyard Cafe", energy: "medium", vibe: "background", outdoor: false },
    ]);
  });
});
