// Focus Pool storage functions.
// Handles CRUD operations for user study/work locations stored in SQLite.

import { getDb } from "@/services/localdb/db";
import { DEFAULT_SPOT_ICON, type SpotIcon } from "@/features/focus/spotIcons";

export type FocusEnergy = "low" | "medium" | "high";
export type FocusVibe = "silent" | "background" | "collaborative";

export interface FocusPoolItem {
  id: number;
  name: string;
  energy: FocusEnergy;
  vibe: FocusVibe;
  // Whether the spot is outside. Only outdoor spots get the rain warning on the
  // Focus result card, since a forecast is irrelevant to a library desk.
  outdoor: boolean;
  // The picture the result card shows. Validated by spotIcon() before use, never
  // read straight from here.
  icon: string;
}

// The shape SQLite actually returns. It has no boolean type, so outdoor comes
// back as 0 or 1 and is converted before the rest of the app sees it.
interface FocusPoolRow {
  id: number;
  name: string;
  energy: FocusEnergy;
  vibe: FocusVibe;
  outdoor: number;
  icon: string;
}

// Returns all saved Focus pool items ordered alphabetically.
export async function getFocusPool(): Promise<FocusPoolItem[]> {
  const db = await getDb();

  const rows = await db.getAllAsync<FocusPoolRow>(
    `SELECT
      id,
      name,
      energy,
      vibe,
      outdoor,
      icon
    FROM focus_pool
    ORDER BY name`
  );

  return rows.map((row) => ({ ...row, outdoor: row.outdoor === 1 }));
}

// Adds a new study/work location to the Focus pool.
export async function addFocusItem(
  name: string,
  energy: FocusEnergy = "medium",
  vibe: FocusVibe = "background",
  outdoor = false,
  icon: string = DEFAULT_SPOT_ICON
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Focus item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync(
    "INSERT INTO focus_pool (name, energy, vibe, outdoor, icon) VALUES (?, ?, ?, ?, ?)",
    [trimmedName, energy, vibe, outdoor ? 1 : 0, icon]
  );
}

// Updates an existing Focus pool item.
export async function updateFocusItem(
  id: number,
  name: string,
  energy: FocusEnergy = "medium",
  vibe: FocusVibe = "background",
  outdoor = false,
  icon: string = DEFAULT_SPOT_ICON
): Promise<void> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Focus item name cannot be empty.");
  }

  const db = await getDb();

  await db.runAsync(
    "UPDATE focus_pool SET name = ?, energy = ?, vibe = ?, outdoor = ?, icon = ? WHERE id = ?",
    [trimmedName, energy, vibe, outdoor ? 1 : 0, icon, id]
  );
}

// Deletes a single location from the Focus pool.
export async function deleteFocusItem(id: number): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM focus_pool WHERE id = ?", [id]);
}

// Removes all locations from the Focus pool.
export async function clearFocusPool(): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM focus_pool");
}

// The spots a fresh install starts with.
//
// Two things about this list are load-bearing rather than decorative.
//
// First, several spots are outdoors. The Focus result card shows conditions for
// an outdoor spot, so a pool with no outdoor spots in it turns that feature off
// with no error and nothing on screen to notice. Any future edit to this list
// has to keep some.
//
// Second, medium energy plus collaborative resolves to exactly one spot, and it
// is outdoor. That is the only combination guaranteed to reach the conditions
// strip, which makes it the path used to demonstrate the feature. Adding an
// indoor spot to that pairing would take the guarantee away.
const DEFAULT_FOCUS_SPOTS: readonly {
  name: string;
  energy: FocusEnergy;
  vibe: FocusVibe;
  outdoor: boolean;
  icon: SpotIcon;
}[] = [
  { name: "Quiet Library Desk", energy: "low", vibe: "silent", outdoor: false, icon: "book-open" },
  { name: "Library Quiet Corner", energy: "low", vibe: "silent", outdoor: false, icon: "book" },
  { name: "Calm Desk Near Window", energy: "low", vibe: "silent", outdoor: false, icon: "monitor" },
  { name: "Park Bench, Fresh Air", energy: "low", vibe: "silent", outdoor: true, icon: "wind" },
  { name: "Home Study Corner", energy: "low", vibe: "background", outdoor: false, icon: "home" },
  { name: "Small Group Study Room", energy: "low", vibe: "collaborative", outdoor: false, icon: "users" },
  { name: "University Library Floor", energy: "medium", vibe: "silent", outdoor: false, icon: "book-open" },
  { name: "Cafe With Soft Music", energy: "medium", vibe: "background", outdoor: false, icon: "coffee" },
  { name: "Courtyard Table", energy: "medium", vibe: "background", outdoor: true, icon: "sun" },
  { name: "Campus Common Area", energy: "medium", vibe: "collaborative", outdoor: true, icon: "users" },
  { name: "Silent Study Zone", energy: "high", vibe: "silent", outdoor: false, icon: "volume-x" },
  { name: "Busy Coffee Shop", energy: "high", vibe: "background", outdoor: false, icon: "coffee" },
  { name: "Rooftop Terrace", energy: "high", vibe: "background", outdoor: true, icon: "sun" },
  { name: "Group Project Room", energy: "high", vibe: "collaborative", outdoor: false, icon: "briefcase" },
];

// Held so two callers arriving at once cannot both decide the pool is empty and
// seed it twice. Mirrors how getDb caches its own setup.
let seeding: Promise<void> | null = null;

// Fills an empty pool with the starting spots.
//
// Empty is the only trigger, which is right today because nothing in the app can
// delete a spot yet. Once US12 adds that, someone clearing the pool on purpose
// would find it refilled on the next read, so this needs a flag recording that
// the seed has run rather than inferring it from the row count.
export async function seedFocusPoolIfEmpty(): Promise<void> {
  if (seeding !== null) {
    return seeding;
  }

  seeding = (async () => {
    try {
      const existing = await getFocusPool();

      if (existing.length > 0) {
        return;
      }

      for (const spot of DEFAULT_FOCUS_SPOTS) {
        await addFocusItem(spot.name, spot.energy, spot.vibe, spot.outdoor, spot.icon);
      }
    } finally {
      // Cleared either way, so a failed seed can be retried on the next read
      // rather than leaving the pool empty for the rest of the session.
      seeding = null;
    }
  })();

  return seeding;
}

// Returns Focus items in the format needed by the Focus recommendation logic.
//
// Seeds first, so the recommendation always has something to choose from. The
// seeding sits here rather than in getFocusPool because that one is the plain
// CRUD read behind the manage-pool screens, and a read that quietly writes would
// make its own tests lie.
export async function getFocusRecommendationPool(): Promise<FocusPoolItem[]> {
  await seedFocusPoolIfEmpty();

  return getFocusPool();
}

// Checks if the Focus pool has no saved options.
// The UI can use this to show a friendly empty state.
export async function isFocusPoolEmpty(): Promise<boolean> {
  const items = await getFocusPool();

  return items.length === 0;
}