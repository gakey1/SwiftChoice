import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initialiseDatabase();
  }

  return dbPromise;
}

async function initialiseDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync("swiftchoice.db");

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