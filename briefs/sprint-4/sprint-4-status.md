# Sprint 4 status

Where everything stands going into the last stretch, so we all know what is left and who owns it. Everything marked done is merged on `main` and passing the checks.

## Done and on main

| Story | What | Owner |
|-------|------|-------|
| US04, US05, US06 | Register, log in, log out | Yvonne |
| US30, US08 | On-device preferences storage and the preferences screen | Bikash |
| US10, US11 | Fuel and Focus pool data layers, plus the filter columns the engine needs | Bikash |
| US01, US02 | App shell, tab navigation, Home dashboard | Tracy |
| US13, US14, US15, US16 | Fuel input, single recommendation, reroll cap, accept | Tracy |
| US18, US19, US20 | Focus energy and vibe input, recommendation, reroll and accept | Tracy |
| US22, US23, US24 | Priority task input, weighted ranking, mark complete | Tracy |
| US25 | Every accepted decision logged on device and mirrored to the cloud | Yvonne |
| US26 | Decision history view with module and time filters | Yvonne |
| US17 | Live Google Places in the Eat Out path, with real distances and attribution | Yvonne |
| US21 | Rain warning on outdoor Focus spots, plus the `outdoor` column behind it | Yvonne, Bikash |
| US31 | Clear the data stored on this phone | Yvonne |
| Budget survey | Personalised budget, asked once per person and stored on the profile | Tracy |
| Back navigation | Back buttons on Register, Fuel and Focus | Bikash |
| Auth hardening | Email verification, then two-factor authentication with an authenticator app | Yvonne |
| Password reset | Forgot password on the login screen, which the design always had and the app never did | Yvonne |
| Priority gamification | XP, levels and badges on the Priority screen, saved between app opens | Yvonne |
| Theme and polish | Arcade theme, contrast raised to accessibility standard, backgrounds on every screen, and the blur fixed on Android | Yvonne |

## Still to do

| Work | Owner | Type | Notes |
|------|-------|------|-------|
| US27 Mental Energy dashboard | Bikash | MVP | The History screen already shows the numbers and the data shape is written up in `briefs/sprint-3/gamification-data-shape-for-dashboard.md`. What is left is the backend summary feeding it |
| US34 Data-collection notices | Tracy | MVP | Short in-flow notices saying what we store. Keep the wording to what the app actually does: accepted decisions go to the cloud, everything else stays on the phone |
| US28 Plain-language reason on results | Tracy | MVP | Small change touching all three result screens |
| US33 Delete account and all data | Yvonne | MVP | Mine, in progress next |
| Abandoning a ranked task | Tracy, Yvonne | New scope | After ranking, Complete is the only way to clear a task, so abandoning one inflates the completion count that feeds the dashboard. I have suggested a neutral abandon rather than an XP penalty. Needs us two to agree the shape before either of us builds it |
| Reroll states | Tracy | Polish | The prototype has a rerolls indicator, a back-to-previous-pick action, a no-rerolls-left message and a no-matches-nearby card. None exist yet. Both screens share one flag, so it is the same fix twice |
| Recruit testers and run the first UAT | Bikash | Testing | Still open from Sprint 3 |
| Full UAT, five or more testers | All three | Testing | Scripted and recorded |
| Bug triage, regression, performance | All three | Testing | Performance on a mid-range Android and an entry-level iPhone |
| Deploy to TestFlight and Play internal | Yvonne | Release | Mine |
| Demo video and panel presentation | All three | Release | |

## Stretch, only if we are ahead

| Work | Owner |
|------|-------|
| US12 Edit and delete pool items in the app | Bikash |
| US29 Clearer error and empty states | Tracy |
| US07 Try the modules without an account | Unassigned |
| US32 Export decision data | Unassigned |

## Manual testing, which we cannot skip

The automated checks cannot reach some things, and a few of them have never been run by a person on a phone. I will work through the full list before the panel, but two items sit with each of you:

| Check | Owner |
|-------|-------|
| Saving a preference generates no network traffic, confirmed with a network monitor | Bikash |
| Preferences survive an app restart, on both platforms | Bikash |
| Tab navigation tapped through by hand on both platforms | Tracy |

If any of you have an Android phone rather than an emulator, tell me. The blur fix and the live place search both behave differently on real hardware, and we have already been caught out once by an emulator problem that looked exactly like a code bug.

## Two things worth knowing

**Two-factor authentication protects this phone, not the account.** The key is stored in the phone's secure storage and is not copied anywhere, so signing in on a different phone is not asked for a code. Making it work on any device needs a paid Firebase plan, which we are deliberately not on. If it comes up at the panel, that is the honest answer, and it was a cost decision rather than an oversight.

**Nobody but me should hold Billing Administrator on the Google Cloud project.** The Places search runs on a free trial that closes itself rather than charging, and the upgrade button is the only thing between that and a real bill on my card.
