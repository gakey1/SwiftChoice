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

let rows: { id: number; name: string }[] = [];
let nextId = 1;

const mockDb = {
  getAllAsync: jest.fn(async () =>
    [...rows].sort((a, b) => a.name.localeCompare(b.name))
  ),

  runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.startsWith("INSERT INTO focus_pool")) {
      rows.push({ id: nextId, name: params?.[0] as string });
      nextId += 1;
      return;
    }

    if (sql.startsWith("UPDATE focus_pool")) {
      const name = params?.[0] as string;
      const id = params?.[1] as number;

      rows = rows.map((row) => (row.id === id ? { ...row, name } : row));
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
    await addFocusItem("Library");
    await addFocusItem("Cafe");

    await expect(getFocusPool()).resolves.toEqual([
      { id: 2, name: "Cafe" },
      { id: 1, name: "Library" },
    ]);
  });

  it("returns Focus items for the recommendation logic", async () => {
    await addFocusItem("Library");

    await expect(getFocusRecommendationPool()).resolves.toEqual([
      { id: 1, name: "Library" },
    ]);
  });

  it("checks whether the Focus pool is empty", async () => {
    await expect(isFocusPoolEmpty()).resolves.toBe(true);

    await addFocusItem("Library");

    await expect(isFocusPoolEmpty()).resolves.toBe(false);
  });

  it("trims Focus pool item names before saving", async () => {
    await addFocusItem("  Library  ");

    await expect(getFocusPool()).resolves.toEqual([
      { id: 1, name: "Library" },
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

    await updateFocusItem(1, "University Library");

    await expect(getFocusPool()).resolves.toEqual([
      { id: 1, name: "University Library" },
    ]);
  });

  it("deletes a single Focus pool item", async () => {
    await addFocusItem("Library");
    await addFocusItem("Cafe");

    await deleteFocusItem(1);

    await expect(getFocusPool()).resolves.toEqual([
      { id: 2, name: "Cafe" },
    ]);
  });

  it("clears all Focus pool items", async () => {
    await addFocusItem("Library");
    await addFocusItem("Cafe");

    await clearFocusPool();

    await expect(getFocusPool()).resolves.toEqual([]);
  });
});