# Priority module and the design direction (PR #39)

Quick brief on where the Priority PR and the whole design question stand, and what
I am doing about it.

## Where this is at

Tracy, your PR #39 is open and I have not merged it yet. The visual direction is
going to a team vote on WhatsApp (links are in `design-theme-vote.md`), and I am
waiting on your vote. Once we pick a theme, your Priority screen keeps all its
logic and we just move its colours onto our shared tokens.

## What your PR adds

Tracy, your PR adds the Priority module (add tasks, rank by urgency and importance,
complete, delete, a mode badge, and an XP hook), and with it a new visual style on
that one screen.

## Why I have not merged it yet

The Priority logic is good. What is holding it is the styling: every colour and
border is a fixed code typed straight into the screen (for example #000 and
#FFD700), instead of coming from our shared design tokens. Two things follow from
that:

- It restyles only that one screen, so the app ends up carrying two different looks
  at once, with no single place to change the theme later.
- It uses colours outside our module-colour rule (Priority is meant to be purple
  and teal only).

We set our design system up in foundations, before Sprint 1, exactly so every screen
reads its colours from tokens and we can restyle the whole app from one place. The
tokens live in `src/theme/tokens.ts` (the `T` object) and `src/theme/modules.ts`
(`MODULES`, the per-module colours), and the shared components in `src/components/`
already use them.

## What I did instead

The PR really raised the bigger question of what the whole app should look like,
especially with the lecturer asking us to make it livelier and add some game feel.
Rather than each of us restyling our own screens and drifting apart, I took the
ideas, including Tracy's retro direction, and built four full interactive mockups of
the whole app, so we can all see and feel each one across every screen before we
commit:

- Glass, Arcade, Retro, and Original (refined). Retro is Tracy's direction taken
  across the whole app.
- Links and descriptions are in `design-theme-vote.md`, and we vote on WhatsApp.

I did it this way because if we each style our own screens separately, the app
starts to look like two or three different apps, it is hard for any of us to design
new screens without a shared direction, and the shared components we set up to stay
aligned keep needing changes.

## How the points (XP) work

Here is how I am thinking the gamification works, building on what Tracy asked:

- XP for the core actions: accept a Fuel or Focus recommendation, or complete a
  Priority task (about 10 XP each; a high urgency and high importance task a little
  more).
- XP builds into levels with changing rank titles (Tracy's Rank-Up idea). That is
  the spine of it.
- A daily streak, plus a small set of badges (the light version of Tracy's badges
  idea).
- I want to keep it light: SwiftChoice is meant to reduce decision stress, so the
  game layer should reward making a decision and moving on, not turn into a grind.
- Tracy, your theme-unlock idea (Option 3) fits in nicely later: a theme switcher in
  Settings that reuses the mockups that do not win as alternate themes, some
  unlockable at an XP milestone. So none of the design work goes to waste.

## What happens to your PR next

Once the vote lands, Tracy, your Priority screen keeps all its logic. We just swap
the hardcoded colours for the chosen theme's tokens, and I will pair with you so it
is quick. Then we set the theme once in the tokens and each of us restyles our own
screens to match.

## Where we are right now

- The four mockups are live, the poll is open in WhatsApp, and I am waiting on the
  votes.
- Tracy, have a proper look on your phone and vote when you get a chance.
- Links: `design-theme-vote.md`.
