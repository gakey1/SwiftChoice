// Tests for the decision history layer. The on-device database is replaced with
// a small in-memory fake, so these check that a decision is saved and read back,
// that it gets a history id and timestamp, that unused ids default to null, and
// that bad input is rejected.

import {
  clearDecisions,
  getDecisions,
  logDecision,
  type DecisionInput,
} from "@/features/history/historyStorage";
import { getDb } from "@/services/localdb/db";

jest.mock("@/services/localdb/db", () => ({
  getDb: jest.fn(),
}));

const mockGetDb = getDb as jest.Mock;

interface DecisionRow {
  history_id: string;
  module_type: string;
  fuel_id: string | null;
  focus_id: string | null;
  task_id: string | null;
  item_snapshot: string;
  applied_filters: string;
  rerolled: number;
  decided_at: string;
}

let rows: DecisionRow[] = [];

// A stand-in for the real database: it keeps rows in a plain array and answers
// the same read, insert, and delete calls the code makes.
const mockDb = {
  getAllAsync: jest.fn(async () =>
    [...rows].sort((a, b) => b.decided_at.localeCompare(a.decided_at))
  ),

  runAsync: jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.trimStart().startsWith("INSERT INTO decisions")) {
      const p = params as unknown[];

      rows.push({
        history_id: p[0] as string,
        module_type: p[1] as string,
        fuel_id: p[2] as string | null,
        focus_id: p[3] as string | null,
        task_id: p[4] as string | null,
        item_snapshot: p[5] as string,
        applied_filters: p[6] as string,
        rerolled: p[7] as number,
        decided_at: p[8] as string,
      });
      return;
    }

    if (sql.startsWith("DELETE FROM decisions")) {
      rows = [];
    }
  }),
};

// A sample fuel decision reused across the tests.
const fuelDecision: DecisionInput = {
  moduleType: "fuel",
  fuelId: "in_4",
  itemSnapshot: { name: "Gourmet Homemade Pasta", details: { rating: "4.5" } },
  appliedFilters: { mode: "in", budget: "$$", prepTime: "medium", distance: "near" },
  rerolled: false,
};

describe("historyStorage", () => {
  beforeEach(() => {
    rows = [];
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(mockDb);
  });

  it("records a decision and reads it back", async () => {
    await logDecision(fuelDecision);

    const stored = await getDecisions();

    expect(stored).toHaveLength(1);
    expect(stored[0]?.moduleType).toBe("fuel");
    expect(stored[0]?.fuelId).toBe("in_4");
    expect(stored[0]?.itemSnapshot).toEqual({
      name: "Gourmet Homemade Pasta",
      details: { rating: "4.5" },
    });
    expect(stored[0]?.appliedFilters).toEqual({
      mode: "in",
      budget: "$$",
      prepTime: "medium",
      distance: "near",
    });
    expect(stored[0]?.rerolled).toBe(false);
  });

  it("stamps a history id and an ISO timestamp on write", async () => {
    const record = await logDecision(fuelDecision);

    expect(record.historyId).toMatch(/^dh_/);
    expect(new Date(record.decidedAt).toISOString()).toBe(record.decidedAt);
  });

  it("defaults the non-matching soft foreign keys to null", async () => {
    const record = await logDecision(fuelDecision);

    expect(record.fuelId).toBe("in_4");
    expect(record.focusId).toBeNull();
    expect(record.taskId).toBeNull();
  });

  it("round-trips the reroll flag and a focus decision", async () => {
    await logDecision({
      moduleType: "focus",
      focusId: "focus_5",
      itemSnapshot: { name: "Cafe With Soft Music", details: { rating: "4.4" } },
      appliedFilters: { energyLevel: "medium", vibe: "background" },
      rerolled: true,
    });

    const stored = await getDecisions();

    expect(stored[0]?.moduleType).toBe("focus");
    expect(stored[0]?.focusId).toBe("focus_5");
    expect(stored[0]?.fuelId).toBeNull();
    expect(stored[0]?.rerolled).toBe(true);
  });

  it("rejects a decision with no item name", async () => {
    await expect(
      logDecision({ ...fuelDecision, itemSnapshot: { name: "   ", details: {} } })
    ).rejects.toThrow("A decision must record the accepted item's name.");

    expect(rows).toEqual([]);
  });

  it("rejects an unknown module type", async () => {
    await expect(
      logDecision({
        ...fuelDecision,
        moduleType: "sleep" as DecisionInput["moduleType"],
      })
    ).rejects.toThrow("Unknown decision module type: sleep");

    expect(rows).toEqual([]);
  });

  it("clears all recorded decisions", async () => {
    await logDecision(fuelDecision);

    await clearDecisions();

    await expect(getDecisions()).resolves.toEqual([]);
  });
});
