# Focus pool: new outdoor field, and something to check in your tests

Hi Bikash. The Focus result card now warns about rain when the spot is outside, which means the pool has to record whether a spot is outdoors. I have added that field and kept it working end to end, so nothing is broken on your side. Two things below need you though, and the second one is the more important.

## What I added

| Where | Change |
|-------|--------|
| `db.ts` | `outdoor` column on `focus_pool`, added with your `ensureColumn` helper so existing databases pick it up on next launch |
| `focusPoolStorage.ts` | `FocusPoolItem` gains `outdoor: boolean`. `getFocusPool` selects and converts it, `addFocusItem` and `updateFocusItem` accept it and default to false |
| `focusPoolStorage.test.ts` | Fake database models the new column; 3 tests added for it |

SQLite has no boolean type, so the column stores 0 or 1 and the storage layer converts on the way out. The rest of the app only ever sees a real `true` or `false`, which keeps the conversion in one place instead of spread through the screens.

Both new parameters default to false, so every existing call still compiles and behaves the same. Nothing you have written needed changing.

## Why the field is needed

The rain warning only makes sense for a spot that is outside. A library desk does not care about the forecast, and asking anyway would be a wasted call every time. So the pool is the only place that can answer "is this spot outdoors", which makes it a data question rather than a screen question.

If a spot is not marked outdoor, it simply never shows the warning. Nothing breaks, the feature just stays quiet.

## Please check this in your test file

`src/features/fuel/fuelPoolStorage.test.ts` has a Fuel header comment, but it imports `addFocusItem`, `getFocusPool` and the rest of the **Focus** functions, and its describe block is named `focusPoolStorage`. It looks like a copy that never got switched over.

Two consequences:

1. **The Fuel pool storage has no tests.** Nothing exercises `addFuelItem`, `getFuelPool` or the others, so a break there would be silent.
2. The Focus pool tests run twice, which is why the same six failures appeared in two places when I added the field.

I have only made it pass, not rewritten it, since it is your file and how you want to split it is your call. Worth doing before Sprint 4 testing though, because an untested storage layer is the kind of thing that goes wrong quietly.

## One thing to keep in mind for US27

`outdoor` is on the pool item, so it will come through in anything that reads the pool. If the dashboard ever counts spots by type, it is available without extra work.

Anything here you would rather I had not touched, say so and I will change it back.
