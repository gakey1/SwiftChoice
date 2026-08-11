# Where Sprint 4 stands

Written so we all know what is left, who has it, and what is already known to be broken. If something here is wrong or you have picked up work that is not listed, tell me and I will fix the file.

## What is left, by person

**Bikash**

| Work | Type | Notes |
|------|------|-------|
| US27 Mental Energy dashboard | MVP | The History screen already shows the numbers, and the data shape is written up in `briefs/sprint-3/gamification-data-shape-for-dashboard.md`. What is left is the backend summary feeding it |
| Tie-breaking in the ranking | From the lecturer | Asked for at the last presentation and not started. If three tasks come out with the same urgency and importance, nothing decides which is first, so the order is whatever the sort happened to produce. It needs a rule we can say out loud, for example earlier deadline first, then oldest task first. Expect to be asked how it decides at the panel |
| Recruit testers and run the first round | Testing | Open since Sprint 3 |
| US12 edit and delete pool items | Stretch | Only if we are ahead |

**Tracy**

Four things, two of them must-haves. More detail on each below, since these are the ones where knowing what the app already does saves you the most time.

| Work | Type |
|------|------|
| US34 data-collection notices | MVP |
| US28 plain-language reason on results | MVP |
| Reroll states | Polish |
| US29 clearer error and empty states | Stretch |

### US34, data-collection notices

The WBS splits this into three: a short notice at each point we collect something, a notice when we send something to an outside service, and working links to a privacy policy and terms.

To write the wording you need to know what the app actually does, so here it is exactly. **One thing leaves the phone: an accepted decision, which is copied to your account in the cloud.** Everything else stays on the device, including preferences, the pools, decision history, XP and level, your theme, your avatar, and the two-factor key.

Two places also send data out while you are using them:

- **Eat Out** sends your location, or the suburb you typed, to Google so it can find places near you. Nothing about you goes with it.
- **A Focus recommendation** sends your location to a weather service. This used to happen only for outdoor spots. It now happens for every Focus result, because you have to travel to an indoor spot as well, and rain on the way there is worth knowing about. What differs is only whether the answer is shown. See `focus-spots-source-change.md`.

So there are four sensible places for a notice: the Eat Out search, the outdoor Focus check, the moment a decision is accepted, and a summary in Settings with the policy links.

Keep the wording to exactly what we do. I hit this on the clear-data screen: it has to say "on this phone", because the cloud copy of your history survives, and claiming to delete more than we delete would be the fastest way to lose someone's trust on the one screen where they came looking for it. Same rule here.

Unobtrusive is in the WBS for a reason. A notice people dismiss without reading is worse than none, because it looks like consent and is not.

### US28, plain-language reason on results

Right now none of the result screens says **why this option**. That is the whole story, and it is the app's main promise, so it is worth more than the "minor change" the WBS calls it.

Where each screen stands:

- **Fuel** says the area when you typed one, and nothing about why this restaurant.
- **Focus** shows the energy and vibe of the spot, but never says those are why it was picked.
- **Priority** is closest. It says "Ranked by urgency + importance" once tasks are ranked.

The engine already knows the reason in every case, so this is about surfacing what it used, not calculating anything new. Fuel matched on budget, prep time and distance; Focus matched on energy and vibe; Priority scored on urgency and importance. One line under the result naming the two or three things that made it the pick.

Write it as a person would say it out loud. "Cheap, quick, and close to you" beats "matched: budget=$, prep=fast, distance=near".

### Reroll states

The prototype has four things none of which exist yet. Ask me for the reference image.

1. A dot indicator showing how many rerolls are left.
2. Back to the previous pick.
3. A "no rerolls left" message once the one reroll is used.
4. A "no more matches nearby" card with an Adjust filters button.

Both Fuel and Focus share the same `hasRerolled` flag, so it is the same fix applied twice rather than two problems.

**One thing to know before you start, because it will not be obvious.** In `FuelScreen.tsx` the reroll always shows `matchList[1]`, a fixed position, rather than stepping through the list. There is already a `currentIndex` in that file that is set but never read, which is one of the two lint warnings we have been ignoring. That variable is the thing item 2 needs: once reroll moves `currentIndex` instead of hardcoding 1, going back to the previous pick is just moving it the other way. So do that first and the rest gets easier.

**Read the section below first.** I have changed `FuelScreen.tsx` in an open pull request, and this work is in the same file.

## Tracy, I have changed FuelScreen

Raising this because it is your file and I should have said so before it landed rather than after. It is open as PR #79 and not merged, so if any of it is wrong for your slice, say so and I will change it.

**What changed.** Three things in `FuelScreen.tsx`:

1. The area box is now a picker. You type, it suggests real suburbs, and you choose one. The search then runs on that suburb's actual coordinates.
2. `handleGetRecommendation` is now a thin wrapper around a new `runSearch(chosenArea)`. Both the button and choosing a suburb go through `runSearch`, because choosing one searches straight away.
3. A separate message when there is no Places API key at all, instead of reporting no matches.

**Why.** Typing an area ran a text search on the name with no coordinates behind it, so it could return somewhere half an hour away and the distance on the card fell back to naming the filter band rather than a real figure. It also had no country set, so a suburb name could match one overseas. Testing it from Belgrave returned a restaurant in Burwood, and nothing on screen suggested that was odd.

**What is not changing.** Your recommendation flow, the reroll, Accept, the filters, the result card layout, and everything in the engine that picks and sorts. The suggestions only affect where the search starts from.

**What this means for your reroll work.** We will both be in this file, so expect a conflict. Two things make it easier:

- Take mine first, then build on top. Rebasing your branch on PR #79 once it merges is much less painful than the reverse, because my change moves the search into `runSearch` and your reroll work sits alongside that rather than inside it.
- `currentIndex` is still unused and the reroll still hardcodes `matchList[1]`. **I deliberately did not touch either**, even though it would have been easy, because it is the heart of your reroll story and yours to design. So that part of the file is exactly as you left it.

**One trap.** The suggestion list has never talked to the real Google service, only to a stub in the tests. The shapes come from Google's documentation, so the first live run may need adjusting. If you see suggestions behaving oddly, that is mine and not yours.

### US29, clearer error and empty states

Stretch, only if we are ahead. Related to the above, so if you are already in those files it may be quicker than it looks.

**Me**

| Work | Type | Notes |
|------|------|-------|
| US33 delete account and all data | MVP | Next thing I pick up |
| Android backgrounds not matching iOS | Bug, in progress | See below |
| Deploy to TestFlight and Play internal | Release | |

**Us together**

| Work | Notes |
|------|-------|
| Abandoning a ranked task | Tracy and me. After ranking, Complete is the only way to clear a task, so abandoning one inflates the completion count that feeds the dashboard. I have suggested a neutral abandon rather than an XP penalty. We two need to agree the shape before either of us builds it |
| Full user testing, five or more people | Scripted and recorded |
| Bug triage, regression, performance | Including a mid-range Android and an entry-level iPhone |
| Demo video and the panel presentation | |

## Known problems, so nobody rediscovers them

| Problem | Who | State |
|---------|-----|-------|
| Android backgrounds do not match iOS | Me | In progress. The wash behind the screens comes out lighter and less purple on Android, so the module tiles on History look washed out next to the same build on an iPhone. The blur fix that went in on 31 July was a separate thing and did land. I have a likely cause and am checking it on a device before changing anything, because this is the second time an Android visual problem has not reproduced on a Mac |
| The rain warning is nearly impossible to see | Me | It is built and it passes its tests, but it only appears when the spot on screen is outdoors **and** rain is at least 50 percent likely in the next hour. Only 2 of our 13 Focus spots are outdoors, so the two almost never line up. Nothing is broken, but we cannot demo something we cannot make happen on purpose, so I am deciding how to fix that |
| Distances are only real on a real phone | All of us | An emulator has no GPS. It reports whatever coordinates it was given, so the distances it shows are correct maths on a made-up starting point. This one fooled me: my simulator said a restaurant was under 1 km away and it was an hour's drive from my house |

## Before you test anything with a location in it

Set your emulator to your own suburb first. It defaults to California and reports that as a real reading, so results look wrong in a way that has nothing to do with our code. Both commands, and the traps in them, are in `running-on-emulators.md`.

Use your own suburb rather than mine. We already had a fault where the app quietly fell back to Melbourne for everybody, which is fine for two of us and wrong for the third, and testing from your own location is how that gets caught.

## If you hit something you cannot fix

**Take a screenshot and put it in the group chat.** Do not spend an hour on it and do not leave it out because it seems small.

A picture tells us far more than a description does, and most of what we have found lately has been visual: a background that renders differently on one platform, a distance that looks wrong, a screen missing something the design has. Those are almost impossible to describe accurately and obvious in an image.

Worth saying with the screenshot:

- which platform, and emulator or real phone
- what you did just before it
- whether it happens every time

If it is a crash, the red error screen text is the useful part, so capture that rather than the screen behind it.

## Two things worth knowing

**Two-factor authentication protects the phone, not the account.** The key is stored in that phone's secure storage and is not copied anywhere, so signing in on a different phone is not asked for a code. Making it work on any device needs a paid Firebase plan we are deliberately not on. If it comes up at the panel, that is the honest answer, and it was a cost decision rather than something we missed.

**Nobody but me should hold Billing Administrator on the Google Cloud project.** The place search runs on a free trial that closes itself rather than charging anyone, and the upgrade button is the only thing between that and a real bill on my card. You both have read access, which is all that is needed to run the app. See `places-api-key-access.md`.
