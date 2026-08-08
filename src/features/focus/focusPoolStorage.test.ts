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

let rows: { id: number; name: string; energy: string; vibe: string; outdoor: number; icon: string }[] = [];
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
        icon: params?.[4] as string,
      });
      nextId += 1;
      return;
    }

    if (sql.startsWith("UPDATE focus_pool")) {
      const name = params?.[0] as string;
      const energy = params?.[1] as string;
      const vibe = params?.[2] as string;
      const outdoor = params?.[3] as number;
      const icon = params?.[4] as string;
      const id = params?.[5] as number;

      rows = rows.map((row) =>
        row.id === id ? { ...row, name, energy, vibe, outdoor, icon } : row
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
      { id: 2, name: "Cafe", energy: "medium", vibe: "background", outdoor: false, icon: "map-pin" },
      { id: 1, name: "Library", energy: "low", vibe: "silent", outdoor: false, icon: "map-pin" },
    ]);
  });

  it("uses default Focus filter values when only a name is provided", async () => {
    await addFocusItem("Library");

    await expect(getFocusPool()).resolves.toEqual([
      { id: 1, name: "Library", energy: "medium", vibe: "background", outdoor: false, icon: "map-pin" },
    ]);
  });

  it("returns Focus items for the recommendation engine", async () => {
    await addFocusItem("Library", "low", "silent");

    await expect(getFocusRecommendationPool()).resolves.toEqual([
      { id: 1, name: "Library", energy: "low", vibe: "silent", outdoor: false, icon: "map-pin" },
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
      { id: 1, name: "Library", energy: "low", vibe: "silent", outdoor: false, icon: "map-pin" },
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
        icon: "map-pin",
      },
    ]);
  });

  it("deletes a single Focus pool item", async () => {
    await addFocusItem("Library");
    await addFocusItem("Cafe");

    await deleteFocusItem(1);

    await expect(getFocusPool()).resolves.toEqual([
      { id: 2, name: "Cafe", energy: "medium", vibe: "background", outdoor: false, icon: "map-pin" },
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
      { id: 1, name: "Park Bench", energy: "low", vibe: "silent", outdoor: true, icon: "map-pin" },
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
      { id: 1, name: "Courtyard Cafe", energy: "medium", vibe: "background", outdoor: false, icon: "map-pin" },
    ]);
  });
});

// The seed is the difference between a fresh install having spots to recommend
// and having none, so these check the count, the contents, and that it cannot
// run twice over the same pool.
describe("seeding the Focus pool", () => {
  beforeEach(() => {
    rows = [];
    nextId = 1;
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(mockDb);
  });

  it("fills an empty pool the first time the recommendation reads it", async () => {
    await expect(isFocusPoolEmpty()).resolves.toBe(true);

    const pool = await getFocusRecommendationPool();

    expect(pool.length).toBeGreaterThan(0);
  });

  it("leaves a pool that already has spots alone", async () => {
    // Somebody's own saved spots must not be joined by a set of defaults.
    await addFocusItem("My Own Desk", "low", "silent");

    const pool = await getFocusRecommendationPool();

    expect(pool).toEqual([
      { id: 1, name: "My Own Desk", energy: "low", vibe: "silent", outdoor: false, icon: "map-pin" },
    ]);
  });

  it("does not seed a second time on a later read", async () => {
    const first = await getFocusRecommendationPool();
    const second = await getFocusRecommendationPool();

    expect(second).toHaveLength(first.length);
  });

  it("does not double-seed when two reads arrive at once", async () => {
    // Both would otherwise see an empty pool and both would fill it.
    const [first, second] = await Promise.all([
      getFocusRecommendationPool(),
      getFocusRecommendationPool(),
    ]);

    expect(second).toHaveLength(first?.length ?? 0);
    expect(new Set(first?.map((spot) => spot.name)).size).toBe(first?.length);
  });

  it("includes outdoor spots, without which the conditions strip never appears", async () => {
    const pool = await getFocusRecommendationPool();
    const outdoor = pool.filter((spot) => spot.outdoor);

    expect(outdoor.length).toBeGreaterThanOrEqual(2);
  });

  it("spreads the outdoor spots across more than one energy and vibe pairing", async () => {
    // Clustered in one pairing they would be unreachable from most filters.
    const pool = await getFocusRecommendationPool();
    const pairings = new Set(
      pool.filter((spot) => spot.outdoor).map((spot) => `${spot.energy}/${spot.vibe}`)
    );

    expect(pairings.size).toBeGreaterThanOrEqual(2);
  });

  it("gives the seeded spots more than one icon between them", async () => {
    // The whole point of storing an icon per spot is that a library and a park
    // bench do not arrive looking identical. One icon across the seed would meet
    // every other test here and defeat that entirely.
    const pool = await getFocusRecommendationPool();
    const icons = new Set(pool.map((spot) => spot.icon));

    expect(icons.size).toBeGreaterThanOrEqual(5);
  });

  it("gives the two silent low-energy spots different icons", async () => {
    // This is the case vibe alone cannot serve, and the reason the icon is
    // stored rather than derived: in the design a library and a park bench are
    // both silent and look nothing alike.
    const pool = await getFocusRecommendationPool();
    const silent = pool.filter((spot) => spot.vibe === "silent" && spot.energy === "low");
    const icons = new Set(silent.map((spot) => spot.icon));

    expect(silent.length).toBeGreaterThan(1);
    expect(icons.size).toBeGreaterThan(1);
  });

  it("keeps medium and collaborative resolving to a single outdoor spot", async () => {
    // This is the one pairing guaranteed to reach the conditions strip, so it is
    // how the weather feature gets demonstrated on purpose. A later edit that
    // adds an indoor spot here would remove the guarantee silently.
    const pool = await getFocusRecommendationPool();
    const matches = pool.filter(
      (spot) => spot.energy === "medium" && spot.vibe === "collaborative"
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.outdoor).toBe(true);
  });
});
