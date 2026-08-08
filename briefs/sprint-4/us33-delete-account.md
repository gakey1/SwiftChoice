# Deleting an account, and what it reaches of yours

This is for both of you. US33 is mine, and most of it sits in my slice, but the delete
itself removes data that your code owns and clears a cache that Tracy's survey gate reads.
Nothing you have written changes. This is so neither of you finds out from behaviour.

## What it does

One new screen, reached from a DANGER ZONE row at the bottom of Settings. It asks for the
password, confirms, then deletes in a fixed order and signs the person out.

| Step | What goes | Whose code |
| --- | --- | --- |
| 1 | Password re-checked, nothing deleted yet | Mine |
| 2 | The decisions copied to the cloud | Mine |
| 3 | The user profile document | Mine (holds Tracy's `budgetTier`) |
| 4 | Everything on the phone, via the existing US31 wipe | Reaches both of yours |
| 5 | The two-factor key and the reset flag | Mine |
| 6 | The Firebase account, last | Mine |

Step 4 is the one that touches you. It reuses `clearLocalData` from US31, which already
clears the fuel pool, the focus pool, preferences, on-device history, progress and avatar.
I did not write a second list for US33, on purpose: two lists would drift, and the one that
drifted would be the delete, quietly leaving data behind.

## What is NOT changing

- No change to `fuelPoolStorage`, `focusPoolStorage`, `preferencesStorage`, the engine, or
  any module screen. I added a section to the bottom of `SettingsScreen.tsx` and touched
  nothing else in it, including the budget picker.
- No new dependency. No Cloud Function. Firebase stays on the free plan.
- No schema change, no migration, nothing to rerun.
- The theme is still deliberately left alone by the local wipe, same as US31.

## The two things worth knowing

**Bikash, the pools come back.** Deleting an account clears `focus_pool`, and that table
self-seeds when it is empty, so a person who deletes and signs up again on the same phone
gets the 14 starting spots. That is the behaviour I want, and it is also the reason the
seeding trigger being "empty" matters more now than it did. When US12 lets people delete
spots, an empty pool will no longer mean "new install", so it will need a flag rather than
a row count, or deleting your last spot will silently restore all 14.

**Tracy, the budget survey will ask again.** The answer lives on the user profile
(`users/{uid}.budgetTier`), which step 3 deletes, and I also clear the in-memory cache so
the deleted person's answer cannot be handed to whoever signs in next on that phone.
Someone who deletes their account and registers again is a new user id, so they get the
survey again. That is correct, and I am flagging it only so it does not read as a bug if
you hit it while testing.

## The rule the order exists for

The Firestore rule is `request.auth.uid == uid`. Every permission to delete a person's
data comes from their account existing. If the account went first, or if a failed step
were stepped over, whatever was left in Firestore could never be deleted by anybody, and
there is no server-side function to clean up after us. So: data first, account last, and
the whole thing stops at the first failure rather than pressing on.

A failed delete therefore leaves you signed in, with everything still there, able to press
the button again. Every step is safe to repeat.

## What I have already done

- Built and tested it: 42 new tests, gates green (types clean, lint 0 errors, 372 tests
  over 39 suites, iOS bundle exports).
- Proved the ordering test actually bites, by moving the account deletion to the front and
  confirming five tests go red rather than assuming they would.
- Written the two limits down rather than leaving them: with no connection the screen waits
  instead of failing, which is the safe direction but not a nice one, and the pool reseeding
  above.

## What I need from you

Nothing to build. Two things to say if you disagree:

- Bikash, whether you want the US12 pool-seeding flag folded into your story or left to me.
- Tracy, whether the DANGER ZONE row sitting at the very bottom of Settings works for you,
  since Settings is your screen's territory even though I have been adding to it.

It is on a branch, not committed and not merged. Say so before it lands if either of the above is wrong.
