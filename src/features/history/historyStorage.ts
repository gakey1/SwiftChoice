// This is where a saved decision gets written. When a user accepts a
// recommendation on the Fuel or Focus screen, that screen calls logDecision
// here and this file saves it. The screens do not need to know how or where it
// is stored, they just call this one function. Right now it is saved in the
// on-device database.
//
// Each saved decision keeps a frozen copy of the chosen item (its name and some
// details) in itemSnapshot. That way the history stays correct even if the
// original item is later changed or deleted. The fuelId, focusId and taskId are
// just an optional link back to the original item, and reading the history never
// relies on them.

import { getDb } from "@/services/localdb/db";

export type DecisionModuleType = "fuel" | "focus" | "priority";

export interface ItemSnapshot {
  name: string;
  details: Record<string, unknown>;
}

// What a caller (a module's Accept / Complete handler) provides. The writer
// stamps the historyId and decidedAt, so callers do not supply them.
export interface DecisionInput {
  moduleType: DecisionModuleType;
  // Soft foreign key to the source pool item. Provide the one that matches
  // moduleType; leave the others undefined or null.
  fuelId?: string | null;
  focusId?: string | null;
  taskId?: string | null;
  itemSnapshot: ItemSnapshot;
  appliedFilters: Record<string, unknown>;
  rerolled: boolean;
}

// A stored decision, including the fields the writer stamps.
export interface DecisionRecord {
  historyId: string;
  moduleType: DecisionModuleType;
  fuelId: string | null;
  focusId: string | null;
  taskId: string | null;
  itemSnapshot: ItemSnapshot;
  appliedFilters: Record<string, unknown>;
  rerolled: boolean;
  // The moment the decision was accepted, saved as a standard date string so the
  // list can be sorted by time.
  decidedAt: string;
}

const MODULE_TYPES: readonly DecisionModuleType[] = ["fuel", "focus", "priority"];

// Raw row shape as stored in SQLite (snake_case columns, JSON-encoded objects,
// rerolled as 0 or 1).
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

// Records an accepted or completed decision. Returns the stored record, with the
// generated id and timestamp, so the caller can confirm what was written.
export async function logDecision(input: DecisionInput): Promise<DecisionRecord> {
  if (!MODULE_TYPES.includes(input.moduleType)) {
    throw new Error(`Unknown decision module type: ${input.moduleType}`);
  }

  if (!input.itemSnapshot.name.trim()) {
    throw new Error("A decision must record the accepted item's name.");
  }

  const record: DecisionRecord = {
    historyId: generateHistoryId(),
    moduleType: input.moduleType,
    fuelId: input.fuelId ?? null,
    focusId: input.focusId ?? null,
    taskId: input.taskId ?? null,
    itemSnapshot: input.itemSnapshot,
    appliedFilters: input.appliedFilters,
    rerolled: input.rerolled,
    decidedAt: new Date().toISOString(),
  };

  const db = await getDb();

  await db.runAsync(
    `INSERT INTO decisions
       (history_id, module_type, fuel_id, focus_id, task_id, item_snapshot, applied_filters, rerolled, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.historyId,
      record.moduleType,
      record.fuelId,
      record.focusId,
      record.taskId,
      JSON.stringify(record.itemSnapshot),
      JSON.stringify(record.appliedFilters),
      record.rerolled ? 1 : 0,
      record.decidedAt,
    ]
  );

  return record;
}

// Returns every saved decision, newest first. This is what the History screen
// reads to show the list.
export async function getDecisions(): Promise<DecisionRecord[]> {
  const db = await getDb();

  const rows = await db.getAllAsync<DecisionRow>(
    "SELECT * FROM decisions ORDER BY decided_at DESC"
  );

  return rows.map(rowToRecord);
}

// Removes all recorded decisions. Used by tests and by full account deletion.
export async function clearDecisions(): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM decisions");
}

// Turns a raw database row back into the nicer DecisionRecord shape, including
// turning the saved text back into real objects.
function rowToRecord(row: DecisionRow): DecisionRecord {
  return {
    historyId: row.history_id,
    moduleType: row.module_type as DecisionModuleType,
    fuelId: row.fuel_id,
    focusId: row.focus_id,
    taskId: row.task_id,
    itemSnapshot: JSON.parse(row.item_snapshot) as ItemSnapshot,
    appliedFilters: JSON.parse(row.applied_filters) as Record<string, unknown>,
    rerolled: row.rerolled === 1,
    decidedAt: row.decided_at,
  };
}

// Makes a unique id for a saved decision, built from the current time plus a bit
// of randomness, so two decisions never end up with the same id.
function generateHistoryId(): string {
  const random = Math.random().toString(36).slice(2, 10);

  return `dh_${Date.now().toString(36)}_${random}`;
}
