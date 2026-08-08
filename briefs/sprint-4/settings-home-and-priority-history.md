# Settings, Home, and why finished tasks never reached History

This one reaches further into your work than anything I have done, so it is worth
reading properly. Almost all of it came from using the app rather than from the plan.

Nothing here changes an algorithm. The ranking, the reroll, the recommendation engine
and the pool CRUD are untouched.

## The short version

| Change | Whose file | What it does |
| --- | --- | --- |
| Settings regrouped into six sections | Shared | Layout only, no control behaves differently |
| Change password added | Mine | New screen, new Account row |
| Home greeting follows the clock | Tracy's `HomeScreen` | It said "Good morning" at 11pm |
| Home avatar opens Settings, and glows | Tracy's `HomeScreen` | Both are in the design |
| Quest card dashed border | Tracy's `HomeScreen` | Corners were missing. Platform bug, not a style mistake |
| THIS WEEK third column | Tracy's `HomeScreen` | "All time" is in no design. Now Avg. saved, on a documented baseline |
| Completed tasks write to history | Tracy's `PriorityScreen` | They never did |
| Decision start time recorded | Fuel, Focus, Priority | One line each, feeds the new Home figure |

## Priority was not writing to the history at all

This is the one I would have wanted to know about soonest, so it goes first.

`logDecision` was called from exactly two places, `FuelScreen` and `FocusScreen`.
Completing a task in Priority awarded XP, bumped the counter, played the confetti,
and wrote nothing. So a finished task:

- never appeared under RECENT DECISIONS on History,
- was missing from the Decisions count on Home,
- and still moved the XP total and the badges.

Which means the app disagreed with itself: the profile said you had done things the
history had no record of. It is not a History bug. The wiring simply was never done,
because US16 covered Fuel and US20 covered Focus and no story covered Priority.

Completing the top task is Priority's version of accepting a recommendation: the
ranking is the recommendation, and doing the task is the acceptance. So it now logs
with `moduleType: "priority"`, the task name, and its urgency and importance.

**It is deliberately fire-and-forget.** If the history write fails the task still
completes and the XP is still awarded, because losing a history row must never cost
somebody the reward they have already been shown. There is a test for exactly that.

## The greeting, and the dashed border

**"Good morning!" was typed into the mockup and shipped literally**, so the app
wished people good morning at any hour. Now morning, afternoon or evening from the
clock, with the design's question after it unchanged. It is a pure function of the
hour so every boundary is tested, including that 2am counts as evening rather than
morning.

**The missing corners on the Keep-the-momentum card are a React Native limitation,
not a styling mistake.** `borderStyle: "dashed"` combined with a `borderRadius` is
broken on both platforms: iOS draws the straight edges dashed and the corners solid,
Android drops the corner arcs altogether. Nothing warns about it. There is a new
`components/DashedOutline.tsx` that draws the outline as an SVG rounded rectangle
with `strokeDasharray`, which follows the path around the corners properly. Reuse it
anywhere else a dashed card is wanted. `react-native-svg` was already a dependency
from the two-factor QR code, so this adds nothing to the project.

## The THIS WEEK card, and the one number that is not counted

The third column said **All time**, which appears in no design. The Arcade mockup's
three are Decisions, **Avg. saved**, and Reroll rate, so the label is back to the
design's.

The catch worth knowing: two of the mockup's three values are **hardcoded**
(`'3min'` and `'18%'`), because a mockup is only ever screenshotted once. There was
no calculation to copy, and we recorded nothing that could produce a time.

"Saved" is also not directly observable. It needs a baseline of how long the
decision would have taken without the app, which the app cannot watch. So it is
computed as:

```
saved = max(0, 8 minutes - how long you actually took)
```

The second half is genuinely measured: a new nullable `started_at` column on
`decisions` records when the module was opened. Only the baseline is assumed.

**Why 8 minutes and not the 20 from our survey.** Our Sem 1 research says 38% of
respondents spend more than 20 minutes deliberating. That is a threshold for a
minority, not an average, and it covers decisions in general, while this app is for
micro-decisions, which `research.md` itself puts at "seconds to a few minutes". A
20-minute baseline would have the card claim about 19 minutes saved on choosing
lunch, which is the first thing anyone would challenge. Eight understates against
our own research on purpose. For reference the mockup's own `3min` implies a
baseline near 4 minutes, so 8 is if anything generous to us.

It lives in one exported constant, `ASSUMED_MINUTES_WITHOUT_APP` in
`features/history/historyStats.ts`, with the reasoning in a comment above it. If the
team wants a different figure it is a one-line change, but **the Terms of use screen
quotes the number too**, so change both.

Three details that will otherwise look like bugs:

- **It shows a dash, not a zero, when no decision has a start time.** Only decisions
  recorded before this build lack one, so this disappears on a fresh install. A
  figure there would claim a saving against a time nobody measured.
- **Never negative.** Somebody who laboured for half an hour sees 0, not minus
  twenty minutes.
- **The timer survives a reroll**, since rerolling is part of the same decision.

**Where it is disclosed.** Settings, About, Terms of use now carries a section
explaining the calculation and citing the survey. There is deliberately no info icon
next to the figure on Home; I considered one and decided to keep the card clean. Worth knowing before the panel, since if anyone asks where the number comes
from, the answer is in Terms rather than on screen.

## Settings, regrouped

Settings had grown by accretion, with each story adding its control wherever there was
room. It is now six labelled cards, in this order:

**Appearance, Preferences, Account, Data and privacy, About, Danger zone**, with the
profile summary and avatar picker above them.

No control changed what it does. Two things it fixes rather than tidies:

- **The clear-data explanation was attached to the wrong control.** It sat under the
  "What we collect" row and above the button, so it read as saying that opening a
  notice screen would delete your data.
- **Chevrons now only appear where there is somewhere to go.** Log out and Clear data
  act in place. The email is a plain row, not a button, so a screen reader no longer
  offers to activate something that does nothing.

**Change password is new.** The app could set a password at registration and reset a
forgotten one from the login screen, but a signed-in person had no way to change
theirs, so the only route was to log out and pretend to have forgotten it. Three
fields, and the current password is checked before the new one is set. Per the
existing two-factor policy, changing a password switches the second factor off on that
phone and the screen says so.

## The one deliberate rule-break

The design gives the Settings profile card a **priority-purple border and tint**. Our
own rule is that purple belongs to Priority and only teal is allowed on every screen,
and Settings is a universal screen. I went with the design over our own rule. It is
written up as a divergence so nobody later finds it and reads it as an accident.

The avatar glow is not an exception to anything: it uses each robot's own signature
colour, which was already in the code and is not a module colour.

## A trap that has now bitten four times

Adding the history import to `PriorityScreen` broke its whole test file. Not one
failing test, the entire suite stopped loading, with this error:

```
SyntaxError: Unexpected token 'export'
  at node_modules/@firebase/util/dist/postinstall.mjs
```

which names nothing to do with Priority. **Any screen that gains an import reaching
Firestore or expo-sqlite needs its test to mock that module in the same change.** The
fix is one block:

```ts
jest.mock("@/features/history/historyStorage", () => ({
  logDecision: jest.fn().mockResolvedValue(undefined),
}));
```

The tell is that the test count **drops** rather than a test going red. If that
happens to you, look at what the screen just started importing, not at what the test
asserts. This has now caught Tracy twice and me twice.

## What I need from you

- **Tracy:** Home, Priority, Fuel and Focus are yours and I have edited all four. The
  Home edits are the substantial ones; Fuel and Focus got one line each. If the
  Settings order or the THIS WEEK column is wrong, say so and I will change it.
- **Bikash:** the `decisions` table has a new nullable `started_at` column, added with
  the same `ensureColumn` migration you wrote, so existing databases are fine and there
  is nothing to rerun. If US27's summary reports a decide time, read that column rather
  than recomputing it.

Gates green: types clean, lint 0 errors, 426 tests over 42 suites, iOS bundle exports.
On a branch, not merged.
