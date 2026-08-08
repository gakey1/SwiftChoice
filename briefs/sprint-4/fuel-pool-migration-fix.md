# The starter meals broke every existing install, and why the tests could not see it

Tracy, this is about the SQLite seed in #83. It shipped a fault that made the app look
like it had deleted people's data, and I want you to have the whole picture rather than
just the fix, because the shape of it is worth knowing.

**I merged it.** It passed every gate I ran and I approved it. The fault is in the code,
but it reaching `main` is on me: I reviewed a schema change without once running it
against a database that already existed. That is the check I should have done and did not.

## What people saw

Anyone who had used the app before, which is all three of us, opened it and found their
decision history gone. Home showed no weekly figures. Preferences did not load. The
console repeated:

```
Error code 1: table fuel_pool has no column named effort
```

A fresh install was completely fine. That is the part that makes this dangerous rather
than merely broken, and I will come back to it.

## What actually happened

Your change added `effort` to the table definition:

```sql
CREATE TABLE IF NOT EXISTS fuel_pool (
  ...
  effort TEXT NOT NULL DEFAULT 'Easy',
  ...
);
```

**`CREATE TABLE IF NOT EXISTS` does nothing at all when the table already exists.** Not
"adds the missing column", not "updates the definition". It looks, sees a table, and
moves on. So on every phone that had run the app before, `fuel_pool` still had no
`effort` column.

Your new seed then inserts into it:

```sql
INSERT INTO fuel_pool (name, budget, prep_time, effort, distance) VALUES (?, ?, ?, ?, ?)
```

which is the error above.

You already knew this, which is the frustrating part: three lines below the CREATE you
wrote exactly the right thing for the other columns.

```ts
await ensureColumn(db, "fuel_pool", "budget", "TEXT NOT NULL DEFAULT '$$'");
await ensureColumn(db, "fuel_pool", "prep_time", "TEXT NOT NULL DEFAULT 'medium'");
await ensureColumn(db, "fuel_pool", "distance", "TEXT NOT NULL DEFAULT 'mid'");
```

`effort` just never got its line. That is the whole bug. It is a one-line omission, not a
misunderstanding.

## Why it took the whole app down and not just Eat In

This half is mine, not yours, and it is the reason a broken meal list turned into
"where has my history gone".

The insert throws inside `initialiseDatabase()`. Every store in the app sits behind that
one connection: decision history, preferences, the pools, XP and level. And `getDb()`
was **caching the rejected promise**, so once setup failed once, every later call got
the same failure back for the rest of the app's run.

So one failed seed of nine sample meals broke reading your history, loading your
preferences, and showing your progress, all at once.

**Nothing was ever deleted.** Every row is still sitting in SQLite. Nothing could reach it.

## The fix

Three parts, on `main` now as `970ba0f`:

1. **The missing line.** `ensureColumn(db, "fuel_pool", "effort", "TEXT NOT NULL DEFAULT 'Easy'")`, before the seed runs.
2. **Seeding can no longer fail the setup.** It moved into its own function with a try/catch that warns. Sample meals are a convenience; somebody's history and preferences are not, and they should never go down together.
3. **A failed setup is no longer remembered.** `getDb()` clears the handle on failure so the next call retries, instead of one bad moment breaking storage until the app is restarted.

## Why no test caught it, and what I added

`db.ts` had **no tests at all**. Every other test in the project mocks the database, which
is correct for testing a screen and useless for testing the schema itself. So there was
nothing anywhere that opened an old database and checked it still worked.

There are now 8, each running the setup against a database old enough to be missing a
column, including one that checks every migration we have ever added. I proved they
actually catch this by deleting the `effort` line again and watching 3 of them fail.

## The two things worth taking from this

**A migration is two edits, never one.** Changing `CREATE TABLE` only affects people who
have never run the app. Adding an `ensureColumn` line only affects people who have.
Almost every real user is in the second group and almost every developer test is in the
first. If you add a column, do both, every time.

**Watch for the failure that only happens to people who already have your app.** This is
the shape to remember. It works perfectly on a fresh install, so it survives every test,
every simulator you wiped, and every clean checkout. It only appears for people with
existing data, which at a demo means the phone that has been used to rehearse. That is
the worst possible time to find it.

That second point is why I am writing this up properly instead of just fixing it quietly.
It is a genuinely easy trap and none of us caught it.

## Nothing else in #83 is affected

The Eat In engine work, the budget survey fix and the GlassCard blur fix are all fine and
staying. This was one missing line in the seed, not a problem with the approach.
