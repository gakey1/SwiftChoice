# On-device preferences storage (SQLite) - cheatsheet

Picking up the rest of US30 and US08. Your preferences screen and a first storage wrapper are already on main, so the shape is settled. The one change of direction: our proposal puts ordinary preferences in SQLite, not Secure Store. This brief is the step-by-step. Follow it top to bottom.

## The short version

Preferences (dietary restrictions, default budget, work hours) currently save into Secure Store. Move them to a small SQLite database, keep Secure Store only for sensitive values, and add a read function so the Sprint 2 module screens can use the saved preferences as defaults. The Settings screen does not change.

## Step 1 - Get the current project (do not re-clone)

You already have the repo, so just sync it. In a terminal, in the project folder:

```bash
git checkout main
git pull
```

That pulls in the latest main, including the preferences screen and the first wrapper. Then make your own branch to work on:

```bash
git checkout -b feature/preferences-sqlite
```

## Step 2 - Install what you need

Packages may have changed since you last pulled, so install first, then add the SQLite library:

```bash
npm install
npx expo install expo-sqlite
```

Then add the plugin in `app.json`, next to the one that is already there:

```json
"plugins": [
  "expo-font",
  "expo-secure-store",
  "expo-sqlite"
]
```

expo-sqlite is a native module, so you must run a development build, not Expo Go (`npx expo run:ios` or `npx expo run:android`).

## Step 3 - Where to make changes

| File | What to do |
|------|------------|
| `src/services/localdb/db.ts` | New file. Open the database and create the preferences table. |
| `src/services/localdb/preferencesStorage.ts` | Edit. Swap the Secure Store calls for SQLite. Keep the same exported function names. Add `clearPreferences` and `getPreferenceDefaults`. |
| `src/services/localdb/secureStorage.ts` | Leave it. It stays for sensitive values later. Do not delete it. |
| `src/services/localdb/preferencesStorage.test.ts` | Edit. Add a test proving values survive a reload. |
| `src/screens/settings/SettingsScreen.tsx` | Do not touch. It already calls `loadPreferences` and `savePreferences`, so if you keep those names it keeps working. |

## Step 4 - The contract (signatures to implement)

```ts
// src/services/localdb/db.ts
// Opens the database once and creates the preferences table if missing.
export function getDb(): Promise<SQLiteDatabase>;

// src/services/localdb/preferencesStorage.ts (same names, now SQLite backed)
export type UserPreferences = {
  dietaryRestrictions: string;
  defaultBudget: string;
  workHours: string;
};
export const DEFAULT_PREFERENCES: UserPreferences;
export function loadPreferences(): Promise<UserPreferences>;
export function savePreferences(preferences: UserPreferences): Promise<void>;
export function clearPreferences(): Promise<void>;

// Read API for the Sprint 2 module input screens (US08 8.3)
export function getPreferenceDefaults(): Promise<UserPreferences>;
```

What each one does:

- `getDb` opens the database once and creates one `preferences` table (a simple `key` text column and `value` text column is enough). Safe to call repeatedly.
- `loadPreferences` reads the three values, falling back to `DEFAULT_PREFERENCES` for anything missing.
- `savePreferences` writes all three in one transaction so a half-save cannot happen.
- `clearPreferences` deletes the saved preference rows (this is the clear in the get/set/clear the WBS asks for).
- `getPreferenceDefaults` returns the saved preferences, or the defaults if nothing is saved, for prefilling the Sprint 2 Fuel, Focus, and Priority input screens.

## Step 5 - Check your work

Run these in order. All must pass:

```bash
npx tsc --noEmit
npm run lint
npm test -- preferencesStorage
```

Then the manual test (US08 8.4) on each platform: open the app, change a preference in Settings, fully close the app, reopen it, and confirm the value stuck. Do this on both Android and iOS.

## Step 6 - Push and open a pull request

```bash
git add src/services/localdb app.json package.json package-lock.json
git commit -m "feat(settings): store preferences in sqlite"
git push -u origin feature/preferences-sqlite
```

Then open a pull request on GitHub from your branch into main, and ask for a review. Keep your own commit (do not let it get squashed) so your name stays on it.

## Traps

1. expo-sqlite is asynchronous. Use the async functions (`openDatabaseAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`) and `await` every call. Do not mix in the old synchronous API.
2. Bind values as parameters with `?` placeholders. Never build the SQL by joining strings, or a value like `$20 - $50` can break the query.
3. Keep `DEFAULT_PREFERENCES.defaultBudget` equal to one of the Settings budget options (`$20 - $50`), or the Settings row will not show the right default.
4. Nothing in `src/services/localdb` may import Firebase or make a network call. The US30 acceptance is that preference data never leaves the device unless the user opts in to sync. That is what 30.3 checks.
5. Do not delete `secureStorage.ts`. Only the preferences move to SQLite.

## Done when

- `npm test -- preferencesStorage` passes, including the reload test.
- US30 met: expo-sqlite added with database initialisation (30.1), the wrapper does get, set, and clear and preferences never touch the cloud (30.2), and a manual check shows no network traffic on a preference save (30.3).
- US08 met: saved preferences are exposed as readable defaults for the Sprint 2 screens (8.3), and the preference values survive a full close and reopen on both Android and iOS (8.4).
- The Settings screen still works without any change to its code.
- `npx tsc --noEmit` and `npm run lint` are clean.
