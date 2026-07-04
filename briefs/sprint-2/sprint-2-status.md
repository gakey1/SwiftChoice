# Sprint 2 status (Fuel and Focus modules)

A snapshot of where SwiftChoice is, so that we are all on the same page going into the week 6 review.

## Done and on main

| Story | What | Owner |
|-------|------|-------|
| US30, US08 | On-device preferences storage (SQLite) and the preferences screen | Bikash |
| US10, US11 | Fuel and Focus pool data layers (create, read, update, delete, with validation) | Bikash |
| US13, US14 | Fuel input (Eat In or Eat Out, budget, prep time, distance) and a single recommendation with a short reason line | Tracy |
| US15, US16 | Reroll capped at one per search, and the Accept button | Tracy |
| US18, US19, US20 | Focus energy and vibe input, single recommendation, reroll and accept. Bikash paired to help clear the module under the crunch, so it landed under his name | Tracy |
| US17 (mock) | Eat Out now routes through a Google Places API simulation layer, with GPS-ready criteria | Tracy |
| US04, US05, US06 | Register, log in, log out (Sprint 1, still stable) | Yvonne |
| US25 (stub) | The history-write interface (`logDecision`) that Accept will call. Full cloud store is Sprint 3 | Yvonne |
| Auth hardening | Email verification on sign up: a real inbox has to be confirmed before the app opens, so fake emails cannot flood the system (raised at the demo) | Yvonne |
| App shell | Reconciled with auth so the tabs only show when signed in | Yvonne |

## Still to do

| Work | Owner | Type | Notes |
|------|-------|------|-------|
| Wire Accept to the history API | Tracy | MVP glue | Swap the temporary console log in the Fuel and Focus Accept buttons for `logDecision(...)`. My side is done. Guide: `briefs/sprint-2/history-write-api.md` |
| Expand the pool tables with the filter fields | Bikash | MVP glue | The real pool tables store only id and name, but the engine filters on budget, prep time and distance (Fuel) and energy and vibe (Focus). Add those columns so the engine can read the real pools |
| Read the real pools in the engine | Tracy | MVP glue | Once Bikash's columns exist, read from the pool storage instead of the built-in sample list |
| Two-factor authentication | Yvonne | Security (from the demo feedback) | Add a second login factor for a more secure sign in. Email verification is now done, so this is my next auth item |
| US17 live Google Places | Yvonne | Stretch | Pick up from Tracy's mock seam: swap `fetchMockGooglePlaces` for a real Places client. After the auth security work |
| Weather mock for Focus (US21 seam) | Tracy | Stretch | A frontend simulation layer, same pattern as the Google Places mock. Agreed as a stretch head-start |
| US12 edit and delete pool items in the app | Bikash | Stretch | Optional manage-pool screen |

## How pull requests are being brought in

Each person's own commits stay on main (I use a regular merge, not a squash) so the history shows who did what. When a pull request needs a small fix to build and pass the checks, the fix goes in as a separate commit on top, so it is clear what changed:

| Pull request | Owner | How it landed |
|--------------|-------|---------------|
| Pool data layer | Bikash | Merged as is, all checks passed |
| Fuel input and recommendation | Tracy | Merged, small follow-up: added a missing navigation file, tightened a couple of types, removed an unused duplicate result screen (the recommendation shows inline) |
| Reroll and accept | Tracy | Merged, small follow-up: resolved an import clash and typed the navigation |
| Focus module | Bikash (helping Tracy) | Merged as is; small follow-up added a Focus screen test and tidied formatting |
| Fuel API integration | Tracy | Merged; the recommendation engine clashed with the Focus work, so I resolved it keeping both features. Details: `briefs/sprint-2/fuel-api-merge-notes.md` |

Tip for everyone: before starting a new piece, run `git checkout main` then `git pull` and branch fresh, so your work sits on the latest code. Most of the merge clashes so far came from building on an older branch.

## Honest read for the review

The Fuel and Focus modules are both in good shape and on main. The remaining work is integration glue (wire Accept to history, and connect the engine to the real pools once the pool tables carry the filter fields) plus the two-factor part of the auth security raised at the demo (email verification is now done and on main). The stretch items (live Google Places, the weather mock) come after the committed work. The plan is to close the glue and the security work first, and be straight in the review about what is finished versus in progress.
