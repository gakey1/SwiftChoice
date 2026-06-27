import {
  addFuelItem,
  clearFuelPool,
  deleteFuelItem,
  getFuelPool,
  updateFuelItem,
} from "@/features/fuel/fuelPoolStorage";
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
    if (sql.startsWith("INSERT INTO fuel_pool")) {
      rows.push({ id: nextId, name: params?.[0] as string });
      nextId += 1;
      return;
    }

    if (sql.startsWith("UPDATE fuel_pool")) {
      const name = params?.[0] as string;
      const id = params?.[1] as number;
      rows = rows.map((row) => (row.id === id ? { ...row, name } : row));
      return;
    }

    if (sql.startsWith("DELETE FROM fuel_pool WHERE id")) {
      const id = params?.[0] as number;
      rows = rows.filter((row) => row.id !== id);
      return;
    }

    if (sql.startsWith("DELETE FROM fuel_pool")) {
      rows = [];
    }
  }),
};

describe("fuelPoolStorage", () => {
  beforeEach(() => {
    rows = [];
    nextId = 1;
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(mockDb);
  });

  it("adds and returns Fuel pool items", async () => {
    await addFuelItem("Momo");
    await addFuelItem("Pasta");

    await expect(getFuelPool()).resolves.toEqual([
      { id: 1, name: "Momo" },
      { id: 2, name: "Pasta" },
    ]);
  });

  it("trims Fuel pool item names before saving", async () => {
    await addFuelItem("  Momo  ");

    await expect(getFuelPool()).resolves.toEqual([
      { id: 1, name: "Momo" },
    ]);
  });

  it("does not add an empty Fuel pool item", async () => {
    await expect(addFuelItem("   ")).rejects.toThrow(
      "Fuel item name cannot be empty."
    );

    expect(rows).toEqual([]);
  });

  it("updates a Fuel pool item", async () => {
    await addFuelItem("Pizza");

    await updateFuelItem(1, "Pepperoni Pizza");

    await expect(getFuelPool()).resolves.toEqual([
      { id: 1, name: "Pepperoni Pizza" },
    ]);
  });

  it("deletes a single Fuel pool item", async () => {
    await addFuelItem("Pizza");
    await addFuelItem("Burger");

    await deleteFuelItem(1);

    await expect(getFuelPool()).resolves.toEqual([{ id: 2, name: "Burger" }]);
  });

  it("clears all Fuel pool items", async () => {
    await addFuelItem("Pizza");
    await addFuelItem("Burger");

    await clearFuelPool();

    await expect(getFuelPool()).resolves.toEqual([]);
  });
});