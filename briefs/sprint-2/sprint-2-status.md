# Sprint 2 status (Fuel and Focus modules)

A snapshot of where SwiftChoice is, so the team is on the same page going into the week 6 review.

## Tasks by person

Checked boxes are done and on main. Unchecked are still to do.

### Bikash (preferences and data layer)

- [x] US30 On-device preferences storage (SQLite)
- [x] US08 Persistent preferences screen
- [x] US10 Fuel pool data layer (create, read, update, delete, with validation)
- [x] US11 Focus pool data layer
- [ ] (stretch) US12 Edit and delete pool items in the app

### Tracy (module screens and recommendation flow)

- [x] US13 Set meal constraints (Fuel input: Eat In or Eat Out, budget, prep time, distance)
- [x] US14 Single meal recommendation with a short reason line
- [x] US15 Reroll capped at one per search
- [x] US16 Accept a recommendation (returns to Home; writing to history is stubbed for now, see shared work below)
- [ ] US18 Energy and vibe inputs (Focus)
- [ ] US19 Single Focus recommendation (reuses the Fuel pattern)
- [ ] US20 Focus reroll and accept

### Yvonne (accounts and storage)

- [x] US04 Register, US05 Log in, US06 Log out (Sprint 1, stable)
- [x] App shell reconciled with auth (tabs only show when signed in)
- [ ] History-write interface for Accept to call (a simple stub now; the full history store is Sprint 3)
- [ ] (stretch) US17 Live place data for the Eat Out path

### Shared / integration

- [ ] Connect the recommendation engine to the real Fuel and Focus pools (it currently uses a built-in sample list; Bikash's pool data layer is ready to connect)
- [ ] (optional) A manage-pool screen so users can edit their Fuel and Focus options in the app

## How pull requests are being brought in

Each person's own commits stay on main (I use a regular merge, not a squash) so the history shows who did what. When a pull request needs a small fix to build and pass the checks, the fix goes in as a separate commit on top, so it is clear what changed:

- Pool data layer (Bikash): merged as is, all checks passed.
- Fuel input and recommendation (Tracy): merged, with a small follow-up that added a missing navigation file, tightened a couple of types, and removed an unused duplicate result screen (the recommendation shows inline on the Fuel screen).
- Reroll and accept (Tracy): merged, with a small follow-up that resolved an import clash and typed the navigation.

Tip for everyone: before starting a new piece, run `git checkout main` then `git pull` and branch fresh, so your work sits on the latest code. Most of the merge clashes so far came from building on an older branch.

## Honest read for the review
The Fuel module is in good shape. The Focus module and the engine-to-pool wiring are the main pieces still open, and we are a little behind on Focus. The plan is to finish the Fuel side cleanly, get Focus as far as we reasonably can, and be straight in the review about what is finished versus in progress.
