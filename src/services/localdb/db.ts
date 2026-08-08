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
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initialiseDatabase();
  }

  return dbPromise;
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

  // Check if fuel_pool is empty and seed default recipes if it is
  const fuelCountResult = await db.getAllAsync<{ count: number }>("SELECT COUNT(*) as count FROM fuel_pool");
  if (fuelCountResult[0]?.count === 0) {
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
  }

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