// Sets up the small database that lives on the phone itself (SQLite). Anything
// that needs the on-device database asks for it through getDb, which opens and
// prepares it once and then reuses the same one.

import * as SQLite from "expo-sqlite";

// Holds the one database connection once it is opened, so it is never opened twice.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

type TableColumn = {
  name: string;
};

// Returns the database. The first call opens and sets it up; every call after
// that gets back the same one.
//
// A failed setup is NOT kept. Caching the rejected promise meant one bad step
// during initialisation permanently broke every store behind this connection
// for the rest of the app's run: history, pools, preferences and progress all
// call getDb, so all of them failed together and the app looked like it had
// lost the user's data. It had not; nothing could reach it.
//
// Clearing the handle means the next caller retries. A problem that is really
// permanent just fails again, which is the same outcome minus the cascade.
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initialiseDatabase().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

// Drops the cached connection so each test starts from a database that has not
// been opened yet. Only the tests call this.
export function resetDbForTests(): void {
  dbPromise = null;
}

// Opens the database file and makes sure all the tables exist. "IF NOT EXISTS"
// means it is safe to run every time, since it only creates a table that is
// missing and leaves the rest alone.
async function initialiseDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync("swiftchoice.db");

  // The tables the app uses:
  //  preferences - the user's saved settings, stored as key and value pairs.
  //  fuel_pool   - the user's saved meal options.
  //  focus_pool  - the user's saved study or work spots.
  //  decisions   - a record of every recommendation the user has accepted.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fuel_pool (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      budget TEXT NOT NULL,
      prep_time TEXT NOT NULL,
      effort TEXT NOT NULL DEFAULT 'Easy',
      distance TEXT NOT NULL DEFAULT 'mid'
    );

    CREATE TABLE IF NOT EXISTS focus_pool (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      energy TEXT NOT NULL DEFAULT 'medium',
      vibe TEXT NOT NULL DEFAULT 'background'
    );

    CREATE TABLE IF NOT EXISTS decisions (
      history_id TEXT PRIMARY KEY NOT NULL,
      module_type TEXT NOT NULL,
      fuel_id TEXT,
      focus_id TEXT,
      task_id TEXT,
      item_snapshot TEXT NOT NULL,
      applied_filters TEXT NOT NULL,
      rerolled INTEGER NOT NULL,
      decided_at TEXT NOT NULL,
      started_at TEXT
    );
  `);

  // When the user opened the module, so the gap to decided_at is how long the
  // decision actually took. Nullable on purpose: every decision saved before
  // this existed has no start, and guessing one would invent the very number
  // the Home screen reports. Those rows are skipped in the average instead.
  await ensureColumn(db, "decisions", "started_at", "TEXT");

  await ensureColumn(db, "fuel_pool", "budget", "TEXT NOT NULL DEFAULT '$$'");
  await ensureColumn(db, "fuel_pool", "prep_time", "TEXT NOT NULL DEFAULT 'medium'");
  await ensureColumn(db, "fuel_pool", "distance", "TEXT NOT NULL DEFAULT 'mid'");
  // How much work the meal is. Added to the CREATE TABLE above at the same time,
  // which does nothing at all on a phone that already has this table, and every
  // phone that has ever run the app does. Without this line the seed below fails
  // with "table fuel_pool has no column named effort" on every existing install.
  await ensureColumn(db, "fuel_pool", "effort", "TEXT NOT NULL DEFAULT 'Easy'");

  await seedFuelPool(db);

  await ensureColumn(db, "focus_pool", "energy", "TEXT NOT NULL DEFAULT 'medium'");
  await ensureColumn(db, "focus_pool", "vibe", "TEXT NOT NULL DEFAULT 'background'");
  // Whether the spot is outside. SQLite has no boolean, so 0 is no and 1 is yes.
  // Used by the Focus rain warning, which only applies to outdoor spots.
  await ensureColumn(db, "focus_pool", "outdoor", "INTEGER NOT NULL DEFAULT 0");
  // The picture on the result card. Stored per spot so a library and a park
  // bench do not look identical, which is what the design asks for.
  await ensureColumn(db, "focus_pool", "icon", "TEXT NOT NULL DEFAULT 'map-pin'");

  return db;
}

// Puts a starter set of meals in the Fuel pool on a database that has none, so
// Eat In has something to recommend before the user has added anything.
//
// Deliberately cannot fail the whole setup. Sample data is a convenience; the
// user's own history, preferences and progress are not, and they all sit behind
// the same connection. A seed that throws used to take every one of them with
// it. Warned about rather than swallowed silently, because an empty Eat In pool
// with no explanation is its own kind of confusing.
async function seedFuelPool(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const fuelCountResult = await db.getAllAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM fuel_pool"
    );
    if (fuelCountResult[0]?.count !== 0) return;

    const defaultFuelItems = [
      ["Home-cooked Instant Noodles", "$", "short", "Easy", "near"],
      ["Microwave Fried Rice", "$", "short", "Easy", "mid"],
      ["Toasted Cheese Sandwich", "$", "short", "Easy", "far"],
      ["Gourmet Homemade Pasta", "$$", "medium", "Medium", "near"],
      ["Avocado Toast with Poached Egg", "$$", "medium", "Medium", "mid"],
      ["Creamy Chicken Alfredo", "$$", "medium", "Medium", "far"],
      ["Slow-roasted Home BBQ", "$$$", "long", "Hard", "near"],
      ["Traditional Beef Stew", "$$$", "long", "Hard", "mid"],
      ["Oven-Baked Salmon Dinner", "$$$", "long", "Hard", "far"]
    ];

    for (const item of defaultFuelItems) {
      await db.runAsync(
        "INSERT INTO fuel_pool (name, budget, prep_time, effort, distance) VALUES (?, ?, ?, ?, ?)",
        item
      );
    }
  } catch (error) {
    console.warn("Could not seed the starter meals; Eat In starts empty.", error);
  }
}

// Existing local databases may already have the old tables.
// This adds the new filter columns without deleting saved data.
async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  const columns = await db.getAllAsync<TableColumn>(`PRAGMA table_info(${tableName})`);
  const alreadyExists = columns.some((column) => column.name === columnName);

  if (!alreadyExists) {
    await db.execAsync(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
    );
  }
}