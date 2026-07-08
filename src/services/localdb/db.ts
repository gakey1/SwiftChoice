import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

type TableColumn = {
  name: string;
};

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
      name TEXT NOT NULL,
      budget TEXT NOT NULL DEFAULT '$$',
      prep_time TEXT NOT NULL DEFAULT 'medium',
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
      decided_at TEXT NOT NULL
    );
  `);

  await ensureColumn(db, "fuel_pool", "budget", "TEXT NOT NULL DEFAULT '$$'");
  await ensureColumn(db, "fuel_pool", "prep_time", "TEXT NOT NULL DEFAULT 'medium'");
  await ensureColumn(db, "fuel_pool", "distance", "TEXT NOT NULL DEFAULT 'mid'");

  await ensureColumn(db, "focus_pool", "energy", "TEXT NOT NULL DEFAULT 'medium'");
  await ensureColumn(db, "focus_pool", "vibe", "TEXT NOT NULL DEFAULT 'background'");

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