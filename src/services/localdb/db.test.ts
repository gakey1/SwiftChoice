// Tests for the on-device database setup. There were none before, which is why
// a missing migration reached a real phone and looked like the user's history
// had been deleted.
//
// What happened, so the shape is not forgotten: a column was added to the
// CREATE TABLE statement and nowhere else. "CREATE TABLE IF NOT EXISTS" does
// nothing to a table that already exists, so on every phone that had ever run
// the app the column was absent, an INSERT naming it threw, and the whole setup
// rejected. Every store lives behind this one connection, so history,
// preferences, pools and progress all failed together.
//
// SQLite is faked here. These check the migration and the failure handling
// around it, which is where that bug lived.

// The platform database, mocked below so no real file is opened.
import * as SQLite from "expo-sqlite";

// The connection under test, plus the hook that drops the cached handle between
// cases so each one starts from a database of its own age.
import { getDb, resetDbForTests } from "@/services/localdb/db";

jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn() }));

// Typed handle on the mock, so each case can hand back its own fake database.
const mockOpen = SQLite.openDatabaseAsync as jest.Mock;

// Columns each table reports through PRAGMA table_info. Set per test to stand in
// for a database at a particular age.
type FakeDbOptions = {
  columns?: Record<string, string[]>;
  fuelCount?: number;
  failInsert?: boolean;
  failCount?: boolean;
};

// A database at whatever age the options describe. It records the ALTERs and
// INSERTs it receives, which is what the migration cases assert on.
function fakeDb(options: FakeDbOptions = {}) {
  const altered: string[] = [];
  const inserted: unknown[][] = [];
  const columns = options.columns ?? {};

  const db = {
    execAsync: jest.fn(async (sql: string) => {
      const match = /ALTER TABLE (\w+) ADD COLUMN (\w+)/.exec(sql);
      if (match) {
        altered.push(`${match[1]}.${match[2]}`);
        // The column exists from now on, the way it would in a real database.
        (columns[match[1] as string] ??= []).push(match[2] as string);
      }
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      const pragma = /PRAGMA table_info\((\w+)\)/.exec(sql);
      if (pragma) {
        return (columns[pragma[1] as string] ?? []).map((name) => ({ name }));
      }
      if (sql.includes("COUNT(*)")) {
        if (options.failCount) throw new Error("no such table: fuel_pool");
        return [{ count: options.fuelCount ?? 0 }];
      }
      return [];
    }),
    runAsync: jest.fn(async (_sql: string, params: unknown[]) => {
      if (options.failInsert) {
        throw new Error("table fuel_pool has no column named effort");
      }
      inserted.push(params);
    }),
  };

  return { db, altered, inserted };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetDbForTests();
});

describe("the fuel_pool migration", () => {
  it("adds the effort column to a database that predates it", async () => {
    // The exact failure that reached a phone. Every existing install has
    // fuel_pool without effort, and the seed below names that column.
    const { db, altered } = fakeDb({
      columns: { fuel_pool: ["id", "name", "budget", "prep_time", "distance"] },
    });
    mockOpen.mockResolvedValue(db);

    await getDb();

    expect(altered).toContain("fuel_pool.effort");
  });

  it("adds effort before seeding, not after", async () => {
    // Order is the whole bug. Seeding first means the INSERT names a column
    // that does not exist yet, which is what threw.
    const { db } = fakeDb({
      columns: { fuel_pool: ["id", "name"] },
    });
    mockOpen.mockResolvedValue(db);

    await getDb();

    const calls = [
      ...db.execAsync.mock.calls.map((c) => String(c[0])),
      ...db.runAsync.mock.calls.map((c) => String(c[0])),
    ];
    const alterAt = calls.findIndex((sql) => sql.includes("ADD COLUMN effort"));
    const insertAt = calls.findIndex((sql) => sql.includes("INSERT INTO fuel_pool"));

    expect(alterAt).toBeGreaterThanOrEqual(0);
    expect(insertAt).toBeGreaterThan(alterAt);
  });

  it("does not add a column that is already there", async () => {
    const { db, altered } = fakeDb({
      columns: { fuel_pool: ["id", "name", "budget", "prep_time", "distance", "effort"] },
    });
    mockOpen.mockResolvedValue(db);

    await getDb();

    expect(altered).not.toContain("fuel_pool.effort");
  });

  it("seeds the starter meals only when the pool is empty", async () => {
    const { db, inserted } = fakeDb({ columns: { fuel_pool: ["id"] }, fuelCount: 4 });
    mockOpen.mockResolvedValue(db);

    await getDb();

    expect(inserted).toHaveLength(0);
  });
});

describe("when setup goes wrong", () => {
  it("does not let a failed seed take the database down with it", async () => {
    // Sample meals are a convenience. History, preferences and progress are not,
    // and they all sit behind this same connection.
    const { db } = fakeDb({ columns: { fuel_pool: ["id"] }, failInsert: true });
    mockOpen.mockResolvedValue(db);

    await expect(getDb()).resolves.toBe(db);
  });

  it("retries after a genuine failure instead of staying broken", async () => {
    // The second half of the bug. The rejected promise was cached, so one bad
    // step during setup broke every store for the rest of the app's run and it
    // looked like the user's data had been deleted. It had not; nothing could
    // reach it.
    mockOpen.mockRejectedValueOnce(new Error("disk busy"));
    await expect(getDb()).rejects.toThrow("disk busy");

    const { db } = fakeDb({ columns: { fuel_pool: ["id", "effort"] } });
    mockOpen.mockResolvedValue(db);

    await expect(getDb()).resolves.toBe(db);
  });

  it("still opens the database only once when setup works", async () => {
    const { db } = fakeDb({ columns: { fuel_pool: ["id", "effort"] } });
    mockOpen.mockResolvedValue(db);

    await getDb();
    await getDb();
    await getDb();

    expect(mockOpen).toHaveBeenCalledTimes(1);
  });
});

describe("the other migrations", () => {
  it("adds every column the app has added since the first release", async () => {
    // A database from the very first version, with only the original columns.
    // Anything missing here is a store that fails on somebody's phone and not
    // on ours.
    const { db, altered } = fakeDb({
      columns: {
        fuel_pool: ["id", "name"],
        focus_pool: ["id", "name"],
        decisions: ["history_id", "module_type"],
      },
    });
    mockOpen.mockResolvedValue(db);

    await getDb();

    expect(altered).toEqual(
      expect.arrayContaining([
        "decisions.started_at",
        "fuel_pool.budget",
        "fuel_pool.prep_time",
        "fuel_pool.distance",
        "fuel_pool.effort",
        "focus_pool.energy",
        "focus_pool.vibe",
        "focus_pool.outdoor",
        "focus_pool.icon",
      ])
    );
  });
});
