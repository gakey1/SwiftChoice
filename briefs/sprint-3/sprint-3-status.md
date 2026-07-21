# Sprint 3 status (Priority module, history, design refresh)

A snapshot of where SwiftChoice is, so we are all on the same page. Everything in
the first table is merged and on main. Main is green: types clean, lint clean,
129 tests passing.

## Done and on main

| Story | What | Owner |
|-------|------|-------|
| US22, US23, US24 | Priority module: add tasks with urgency and importance, weighted ranking, mark complete | Tracy |
| Priority follow-ups | Start Task button with status, edit and remove a task before ranking, and a confirmation before ranking locks the order in | Tracy |
| US25 | Every accepted decision is logged, and now mirrors to Firestore as well as the phone | Yvonne |
| US26 | Decision history view, with module and time filters, then rebuilt as the dashboard | Yvonne |
| Pool filter fields | Budget, prep time and distance on the Fuel pool, energy and vibe on the Focus pool, with a safe migration for existing installs | Bikash |
| Back navigation | Back buttons on the registration and module screens | Bikash |
| Design refresh | Light and dark theme system, DM Mono, the Arcade glass look across every screen, profile avatars | Yvonne |
| Priority gamification | XP, levels, badges and a celebration layer, built on top of Tracy's task logic without changing it. Saved on the device so it survives a restart. New scope, not in the WBS | Yvonne |
| History dashboard | Weekly stats, a seven-day activity chart, module breakdown and a badge gallery. Covers most of US27, see `us27.md` | Yvonne |
| Accessibility | Light and dark contrast raised to meet WCAG AA, measured across the app, after the lecturer flagged the light theme | Yvonne |
| US17 groundwork | Device location through the phone's GPS, and a live places client, both built and tested. Nothing calls them yet | Yvonne |

## Still to do

| Work | Owner | Type | Notes |
|------|-------|------|-------|
| Read the real pools in the engine | Tracy | MVP glue | Bikash's filter columns went in on 11 July. The engine still reads the built-in sample lists, so this is the other half of that story |
| US28 plain-language reason on results | Tracy | MVP | A short change touching all three result screens |
| Wire live location into Fuel | Tracy, with Yvonne | Stretch | The two services are built and tested. This is the swap in the engine plus attribution on the result. Guide: `c-fuel-live-location.md`. Waiting on Tracy's go-ahead |
| Recruit three or more external testers and run the first external session | Bikash | MVP | Week 8 in the plan. Not started |
| US27 dashboard backend | Bikash | Stretch | Weekly aggregation over the mirrored decisions. Scope has changed, see `us27.md` |
| Two-factor authentication | Yvonne | Security | Deferred from Sprint 2 with the direction already decided. Next auth item |
| Abandoning a ranked task | Tracy and Yvonne | New scope | Raised by Tracy. After ranking, Complete is the only way to clear a task, so abandoning one adds XP and bumps the completed count that feeds the dashboard. Needs the two of us to agree the shape first |
| Personalised budget range | All three | New scope | From the last lecturer review. Ask each user what a budget means to them, store it, feed it into the recommendation. Survey first. Needs team scoping |
| US29 clear error and empty-state messages | Tracy | Stretch | Not started |
| US12 edit and delete pool items | Bikash | Stretch | Not started |

## Decisions taken this sprint

| Decision | Where it is recorded |
|----------|----------------------|
| Accepted decisions mirror to Firestore, phone stays the source of truth | D-008 |
| Live places from OpenStreetMap rather than Google, with no card. Now being revisited after the consultation | D-009, and the update in `location-and-weather-apis.md` |
| Ranking is one way. Once ranked, tasks cannot be edited or deleted | In the Priority screen, worth confirming as a team |

## How pull requests are being brought in

Each person's own commits stay on main (I use a regular merge, not a squash) so
the history shows who did what. When a pull request needs a small fix to build
and pass the checks, the fix goes in as a separate commit on top.

| Pull request | Owner | How it landed |
|--------------|-------|---------------|
| Pool filter fields | Bikash | One clash in the database file against the new decisions table. Resolved keeping both, his commits preserved |
| Back navigation | Bikash | One clash where the branch still carried an old placeholder that had already been replaced. Dropped the placeholder, kept the back buttons |
| Priority module | Tracy | Merged, then restyled to the Arcade theme as a separate piece of work with a gamification layer on top. Her task logic untouched |
| Priority UI follow-ups | Tracy | Merged. One test needed updating, because the new confirmation step meant ranking no longer happens the instant the button is pressed. Fixed as a separate commit |

Tip for everyone, same one as last sprint: almost every clash has come from a
branch cut a while back and worked on while main moved underneath it. Before
starting a new piece, run `git checkout main` then `git pull` and branch fresh.
If a branch has been open a while, merge main into it early rather than at the
end, so the clash is small and the code is still fresh in your head.
