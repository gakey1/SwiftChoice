# Where Focus spots come from, and what I changed

Short version: the proposal said Focus recommendations come from your own saved spots. The app was picking from a list typed into the code. I have wired it to the saved pool.

This touches both your slices, so please read the last two sections.

## What the proposal said

| Point | Sem 1 docs |
|-------|------------|
| Source | The user's own Focus pool |
| Who adds spots | The user, through a manage-pool screen (US11) |
| Storage | A `FocusSpot` table with full CRUD |
| Engine reads | A read API over that pool (WBS 11.3) |
| Spot location | A text label. No coordinates |
| Outdoor flag | Yes, marked as stretch for US21 weather |

## What the app did before today

| Point | What it did |
|-------|-------------|
| Source | A fixed list of 12 spots written into `recommendationEngine.ts` |
| Who adds spots | Nobody. No screen exists |
| Storage | The table was built and worked, but nothing ever wrote to it |
| Engine reads | The typed list, never the table |
| Spot location | Nothing at all |
| Outdoor flag | Built. 2 of the 12 were outdoor |

So we had two pools. The good one was unused.

## What I changed

| Change | File |
|--------|------|
| The pool fills itself on a fresh install, 14 spots, 3 outdoor | `focusPoolStorage.ts` |
| The engine now reads the saved pool | `recommendationEngine.ts` |
| The typed list stays, but only as a fallback if the database will not open | `recommendationEngine.ts` |
| Find My Spot is now async, so the button shows a busy state | `FocusScreen.tsx` |
| The rating chip is now an Indoor / Outdoor chip | `FocusScreen.tsx` |
| The weather strip now covers indoor spots too | `weatherAdvice.ts`, `FocusScreen.tsx` |

All gates green: 302 tests, no lint errors.

## Why the rating chip changed

The old list had ratings typed in by hand, like 4.3. They were not measured from anything.

The pool has no rating column, and the proposal's `FocusSpot` never had one either. So a saved spot has no rating at all.

Rather than leave a blank chip, it now shows **Indoor** or **Outdoor**. That is stored on every spot, needs nothing from the network, and answers the question the card otherwise raises: why some results show the weather and others do not.

## What is still missing

| Gap | Whose | Notes |
|-----|-------|-------|
| No screen to add or edit spots | Bikash | This is US11's UI half and US12. Until it exists everyone gets the same 14 spots |
| Spots have no location | Open | See the warning below |

**The location gap is the one to know about for the panel.** A spot has a name but no coordinates. So when the Focus card checks the weather, it uses **your phone's position, not the spot's**. If the park is 5 km away you get the weather where you are standing. That is fine most of the time and wrong sometimes, and it is better to say so than be asked.

## Bikash, what this means for you

Nothing you built is removed. Your CRUD functions, your columns, and your `ensureColumn` migration are all still there and are now actually being used.

Two things to know.

1. **The seeding hangs off `getFocusRecommendationPool()`, not `getFocusPool()`.** I did that on purpose. `getFocusPool()` is the plain read behind your manage-pool screens, and a read that quietly writes would make your own tests misleading. Your function is untouched.

2. **The seed only runs when the pool is empty.** That is safe now because nothing can delete a spot. When you build US12, someone who clears the pool on purpose would find it refilled on the next search. At that point it needs a flag recording that the seed has run, rather than counting rows. There is a comment in the file saying so.

If you would rather the default spots came from somewhere else, say so and I will move them.

## Tracy, what this means for you

`FocusScreen.tsx` is your file and I have changed three things in it. Say if any of this is wrong for your slice and I will change it back.

1. **Find My Spot is async now.** The engine reads the database, so the result arrives a moment after the press. The button dims and reads "Finding your spot" while it waits, rather than looking dead.
2. **The rating chip is now an Indoor / Outdoor chip.** Explained above.
3. **The weather strip changed twice.** Details below, because the second change affects US34.

Your reroll, Accept, filters and result layout are all untouched.

### The weather strip, and what it means for US34

It used to appear only when the spot was outdoors **and** rain was at least 50 percent likely. Two conditions that almost never lined up, so hardly anyone ever saw it.

It now works like this:

| Spot | When it shows | What it says |
|------|---------------|--------------|
| Outdoor | Always | "Partly cloudy, 17 degrees, feels like 14." Plus one line of advice |
| Indoor | Only when rain is likely, or it is cold | Same figures, but the advice is about the trip: "Take an umbrella on the way there" |
| Indoor | Otherwise | Nothing |

**The indoor case is the part I want your eye on.** You still have to walk or drive to a library, so rain on the way is worth knowing. But a weather strip on every single result would be noise, and a notice people learn to ignore is worse than none. So indoors it only speaks when there is something to carry.

**This changes what US34 has to say.** The old wording, in `sprint-4-status.md`, was:

> A Focus spot that is outdoors sends your location to a weather service to check for rain. Indoor spots send nothing.

That is no longer true. **Every Focus result now sends your location to the weather service**, indoor or outdoor. The difference is only whether we show you the answer.

So the notice needs to say the check happens on every Focus recommendation. I would rather you write that from the start than correct it later.

One more thing worth putting in the notice, or at least knowing before someone asks: **a spot has a name but no coordinates.** So the forecast is for where your phone is, not where the spot is. For the indoor case that is actually the right answer, since you are about to set off from where you are standing. For an outdoor spot some distance away it is approximate.

### One thing that matters for your reroll work

Medium energy plus collaborative resolves to exactly one spot, and it is outdoor. That is the only combination guaranteed to show the weather strip, so it is how we demonstrate it. There is a test holding that in place, so if a change breaks it you get a failing test rather than a silent loss.
