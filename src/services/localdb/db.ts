// Sets up the small database that lives on the phone itself (SQLite). Anything
// that needs the on-device database asks for it through getDb, which opens and
// prepares it once and then reuses the same one.

import * as SQLite from "expo-sqlite";

// Holds the one database connection once it is opened, so it is never opened twice.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

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
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS focus_pool (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
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
      decided_at TEXT NOT NULL
    );
  `);

  return db;
}