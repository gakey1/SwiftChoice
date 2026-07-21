# Gamification data shape for the dashboard (US27)

Hi Bikash, this is for your Mental Energy dashboard story (US27). I have built a
gamification layer (XP, levels, streak, badges) and the History screen now shows
a version of the dashboard on top of it. So that your US27 work reads from the
same numbers rather than inventing a second set, here is exactly where the data
lives and what shape it is in. Nothing here asks you to change your slice. It is
a map so we do not end up with two sources of truth for the same figures.

## Two sources feed the dashboard

There are only two, and they are both on-device already:

1. The **progress store** (the game state: XP, level, tasks completed, streak).
2. The **decision history** (every accepted decision, one row each).

Everything on the dashboard is either read straight from one of these or derived
from them with a small pure function. No new table is needed for the current
screen.

## 1. Progress store (the game state)

File: `src/services/localdb/progressStorage.ts`. It is an AsyncStorage record
under the key `swiftchoice.priorityProgress`. The shape:

```
Progress = {
  xp: number            // XP inside the current level
  level: number         // 1 and up
  completedCount: number // tasks marked complete, also drives the streak badge
  coins: number         // coins shown in the top-right HUD
  ranked: boolean        // has the user ranked their tasks at least once
}
```

Read it live through the shared provider, not by touching storage yourself:
`useProgress()` in `src/features/progress/ProgressProvider.tsx` returns
`{ progress, hydrated, awardXp, bumpCompleted, markRanked }`. Because it is a
provider, XP earned on one screen updates everywhere at once. If your dashboard
needs the level curve or titles, they are already centralised in
`src/features/progress/progress.ts`:

- `capFor(level)` — XP needed to clear a level.
- `levelTitle(level)` — the title next to the number (Rookie, Planner, and so on).
- `xpFraction(xp, level)` — how full the XP bar is, 0 to 1.

Use those rather than re-deriving the curve, so the bar and the level read the
same on your screen as on Home, Priority and History.

## 2. Decision history (the per-decision rows)

File: `src/features/history/historyStorage.ts`, read with `getDecisions()`. Each
row is a `DecisionRecord` with at least `moduleType` (fuel / focus / priority),
`decidedAt` (ISO string), `rerolled` (boolean), and an `itemSnapshot` with the
chosen item's `name`. The dashboard aggregates I derive from these rows are:

- **This-week decisions**: count of rows with `decidedAt` inside the last 7 days.
- **Reroll rate**: share of those rows where `rerolled` is true, as a percent.
- **Most active time**: the hour band most `decidedAt` values fall in.
- **Per-module counts**: rows grouped by `moduleType`.
- **7-day bars**: decisions per day for the last 7 days.
- **Recent list**: the newest rows, newest first.

The Home screen already computes the first two the exact way I mean them (see
`WeekStats` in `src/screens/home/HomeScreen.tsx`) if you want a reference.

## 3. Achievements

File: `src/features/progress/achievements.ts`. `coreAchievements(progress)`
returns the badge set with earned or locked worked out only from the progress
store, so every screen shows the same badges. The History gallery extends this
with a few history-derived ones (for example a "5 Fuel decisions" badge), all
computed, none stored.

## What I would like from US27

Your call on the design, but the clean split I am aiming for is: this screen owns
the presentation, and US27 owns any heavier aggregation that should not run on the
device every open (for example trends over months, or a cloud mirror of the
weekly figures like we did for decisions in D-008). If US27 produces an
aggregated summary, expose it as one function returning a plain object with the
same field names above, and I will read from that instead of deriving locally.
That way there is one definition of "reroll rate" and "this week", not two.

If any of these shapes are awkward for what you are building, tell me and we will
adjust the store rather than duplicate it.
