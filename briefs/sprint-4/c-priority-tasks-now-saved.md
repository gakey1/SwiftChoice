# Priority tasks are saved on the device now

Hi Tracy. Your Priority board was losing its tasks the moment anybody left the screen, and I have added storage behind it. This touches your screen, so here is what changed and what did not.

## What was happening

`taskList` was `useState` and nothing else. There was no storage module behind it, so the tasks lived only as long as the screen did. Open Priority, add three tasks, tap Home, come back, and the board was empty.

I only found it while testing something else. It never threw, no test covered it, and nothing in the app claimed the tasks were saved, so it read as a bug rather than a gap. It would have read that way at the panel too, which is why it got fixed this week rather than after.

To be clear, this was not in the WBS. US22 to US24 ask for adding, ranking and completing tasks, and none of them says the list survives anything.

## What changed

| | |
|---|---|
| New `src/services/localdb/taskStorage.ts` | Saves the board to the device, following the same pattern as the gamification progress store |
| `PriorityScreen` loads on mount, saves on change | Two effects, about fifteen lines |
| `clearLocalData` clears it too | So the new store is not the one thing a privacy action misses |
| Your task logic, ranking, XP, composer, cards | **Untouched** |

The board saves as one record, not three: the tasks, whether they are ranked, and the sentence explaining the ranking. They only make sense together. Tasks restored without `isRanked` would offer to rank an already ranked list, and `isRanked` restored without its reason would claim an explanation the screen has nothing to show for.

## The part I would most like your eye on

**The hydration guard.** The screen must not save until the load has come back:

```tsx
const hydrated = useRef(false);
// ...in the load effect, after setting state:
hydrated.current = true;
// ...in the save effect:
if (!hydrated.current) return;
```

Without it, the save effect fires on mount with the empty initial state and overwrites the stored board before the load returns. The feature would look like it worked and would silently erase the list every time the screen opened. It has a test that holds the load unresolved and asserts nothing is written, because that failure is invisible otherwise.

Same shape as the guard on the gamification progress, if you want a second example of it.

## Two decisions in the validation, in case you disagree

**A malformed task drops that task, not the whole board.** Losing one row beats losing the list.

**An urgency outside High, Medium or Low is rejected outright.** It is the one bad value that throws nowhere: it sorts as `undefined` and the ranking quietly comes out wrong, which is worse than an empty board because nobody can see it happened.

## What is not changing

| | Changed |
|---|---|
| `addTask`, `completeTask`, the ranking algorithm | No |
| The composer, the cards, the Rank confirmation | No |
| The `Task` interface | No |
| XP, levels, badges, the celebration | No |
| Anything about how tasks look | No |

## Worth knowing for the demo

The board now survives leaving the screen **and** a full app restart, both checked on the emulator. So a rehearsal that adds tasks, navigates away, and comes back will find them where they were.

The `Task` type still lives in `PriorityScreen.tsx`. The store declares its own copy of the shape rather than importing it back out of the screen, because a service reaching into the screen that consumes it reads backwards and the store has to validate the shape on load regardless. If you ever move `Task` into `features/priority/`, the two can be merged and I would rather they were.
