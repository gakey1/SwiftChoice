# Eat Out will stop giving up on your location so easily (and needs one line from you)

Hi Tracy. I found a real fault in the location service while chasing an emulator problem, and fixing it changes the shape of what `getCurrentPosition()` hands back to the recommendation engine. Nothing of yours breaks, and nothing of yours needs to change for it to work. But there is one small thing only your screen can finish, and without it the fix is half honest.

## The fault

The location service had three steps: use a cached position if it is under five minutes old, otherwise ask the phone for a fresh one with a five second limit, otherwise give up.

There was no step for "I have a position and it is six minutes old". So a perfectly usable position got thrown away, and Eat Out showed "We could not get your location. Type where you are and we will look there" while the phone knew roughly where you were the whole time.

Five minutes is the right bar for skipping the phone. It is the wrong bar for giving up, and the two were the same number. Nobody choosing lunch has moved far enough in six minutes to matter against a search radius measured in kilometres.

## What I changed

Only `src/services/location/locationService.ts` and its tests. One new step at the end of the chain: if the fresh reading fails, take any position up to an hour old rather than giving up.

An hour is a limit, not a claim that a position stays true that long. Without a limit, a fix from this morning could be in another city, and searching it would be confidently wrong rather than roughly right.

The result type gained one optional field:

```ts
{ ok: true; latitude: number; longitude: number; stale?: true }
```

`stale` is only ever present when the position came from that last step. Every other path returns exactly the shape it always did, which is why nothing of yours had to change.

## What I did not change

| Your code | Changed | What to know |
|-----------|---------|--------------|
| `recommendationEngine.ts` | No | `if (position.ok)` still reads true the same way |
| `FuelScreen.tsx` | No | Untouched |
| `FocusScreen.tsx` | No | Untouched, though it calls the same service |
| The typed-suburb fallback | No | Still there, still correct when there really is no position |
| Any of your tests | No | All 446 pass, 43 suites, tsc clean |

## The part that needs you

Right now nothing reads `stale`, so an hour-old position is presented exactly like a current one, including the distance on the card. That is the one thing I do not want to leave standing, because a distance calculated from where the phone was an hour ago is a confident number that may be wrong.

You already built the pattern for this. When there is no position at all, the card says:

> Places in {searched_area}, not based on your location.

The same idea, worded for a position that is real but old. Something like "Based on your last known location" above or beside the distance, whenever `stale` is set.

The reason it is yours rather than mine: it means touching `recommendationEngine.ts` to carry the flag through to the card, and both that file and the Fuel screen are mostly your work. I did not want to reach into either four days out from the panel without asking.

If you would rather I did it, say so and I will, but I would want your eye on the wording either way.

## One trap worth naming

The engine currently does this:

```ts
const position = await getCurrentPosition();
if (position.ok) { lat = position.latitude; lng = position.longitude; }
```

`positionFromDevice` is then set from whether coordinates exist, and that is what decides the card can talk about distance from the user. A stale position passes that check, because it *is* from the device. So the flag has to travel separately. Checking `ok` alone will not tell you.

## Why this came up now

An Android emulator kept saying it could not find me. The emulator turned out to be the trigger rather than the fault: it cannot answer a fresh location request at all, so it fell through to the give-up step every single time and made a rare edge case constant. A real phone hides this most of the time, which is exactly why it survived this long.

Emulator specifics are in `running-on-emulators.md`, trap 4, which I have also corrected. Two things it used to say were wrong, including the advice to just run `adb emu geo fix`, which silently does nothing unless the GPS is already running.
