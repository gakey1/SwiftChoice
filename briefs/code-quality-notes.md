# Code comments and error handling: notes for the marking rubric

The marking rubric asks for excellent organisation, strong error handling, and
clear, concise comments that explain the concepts and algorithms in our code. We
are close. This is a short shared guide plus a few specific pointers per person
so we all hit the bar.

## What a good comment looks like here

- Explain the why, not the what. "Shuffle the matches so the first result is not
  always the same" is useful; "loop over the array" is not.
- Comment the concept or the algorithm, not the obvious lines. The recommendation
  logic, the reroll rule, the auth gating, the storage choices all deserve a
  sentence. Plain assignments do not.
- Keep it concise. One or two clear lines beats a paragraph. Over-commenting
  counts against us as much as under-commenting.
- Error handling should be visible and intentional. Handle failures with a clear
  message, do not swallow them silently, and say in a comment where errors are
  meant to be caught.

## My side (auth, storage, history) - done

The auth, storage, and history files explain their concepts and security choices:
why login errors stay generic (so no one can probe which emails exist), why the
email is verified, why history freezes a snapshot of the chosen item. The error
handling is in place, with one clear spot that maps each failure to a user
message. App.tsx explains the boot order and why the providers nest the way they
do. Happy to walk anyone through any of it.

## Tracy - module screens and the recommendation engine

- `recommendationEngine.ts` is our main algorithm file, so it is exactly where the
  rubric looks for algorithm comments. A few lines would cover it well: the
  filter-then-shuffle approach, why Eat In and Eat Out take different paths, and
  why the reroll uses the second match (the single alternative).
- `FuelScreen.tsx` and `FocusScreen.tsx`: the leftover debug logs (the
  `console.log` lines) show up as warnings, so worth removing. A short comment on
  the placeholder distance text ("1.2 km" and so on) makes clear it stands in
  until live location is added.
- The unused `currentIndex` in `FuelScreen` can be dropped.

## Bikash - pools and data layer

- `fuelPoolStorage.ts` and `focusPoolStorage.ts` already read well. Keep that
  going when the pool tables gain the extra filter fields.
- When those new columns land, a one-line note on each field (what it is for)
  covers the rubric cleanly.

Shout if you want to pair on any of it. None of this is heavy, mostly a sentence
here and there.
