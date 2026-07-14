# Heads up: the new theme is in, and what changed on your screens

Quick note for both of you. The Arcade design won the vote, so I have put the theme
system into the app and moved every screen onto it. This is so you know exactly what
I changed on your screens and, just as important, what I did not touch. The short
version: I only changed how things look (colours, and the mono font on the coded
bits). I did not touch any of your logic.

## What the theme system is

The app now has a light and a dark version of the Arcade look, and a Dark mode switch
in Settings flips between them. A screen gets its colours from a small hook called
useTheme, instead of the old fixed tokens, so the colours can change when someone
flips the switch.

- Colours come from useTheme: `const { colors } = useTheme();` then `colors.ink`,
  `colors.bg`, `colors.teal`, and so on.
- The coded elements (stats, labels, section headers) use a monospace font,
  `T.font.mono`.
- Everything that is not a colour (spacing, sizes, layout) stays in the tokens as
  before.

There is a fuller write-up in the learning notes ("Runtime theming with a theme
provider and useTheme") if you want the why.

## What I changed on your screens (styling only)

For Tracy:

- Home, Fuel, and Focus: I swapped the fixed colours for the theme colours, and the
  module icon and inputs now use the theme's brighter amber, green and purple. The
  screens look different, but the filters, the recommendation calls, the one-reroll
  cap, and the accept-to-history are exactly as you wrote them. Styling only.
- The shared pieces you use (Card, Button, the option groups, the module icon, the
  bottom tab bar) are themed in one place now, so you do not have to set colours per
  screen any more.

For Bikash:

- Settings: I restyled the screen and added the Dark mode switch. Your preferences
  rows (dietary, budget, work hours) work the same, and preferencesStorage and the
  pool and data code are untouched. I only changed colours and added the one new row.

## What I did NOT touch

None of your logic. The recommendation engine, the pools, preferences, validation,
the history writes, the navigation, all of it is as it was. Every test that passed
before still passes (95 across the app).

## How to work with it from here

When you build or edit a screen, two small habits:

1. Read colours from the theme, not the fixed tokens. Use `const { colors } =
   useTheme();` then `colors.ink` for text, `colors.bg` for the background, and
   `colors.teal` (or your module's `colors.fuel` / `colors.focus` / `colors.priority`)
   for accents. There is a `moduleAccent(colors, "fuel")` helper for a module's colour
   and its tint.
2. Colours cannot live in a `StyleSheet.create` block, because that runs once before
   the theme is known. Keep the fixed stuff (spacing, sizes) in the StyleSheet, and
   apply colours inline from `colors`. This is the one thing that trips people up.

If in doubt, copy how Home or Fuel does it now, they are the clearest examples.

## Priority (Tracy)

Your Priority PR is still open. When it merges it needs the same small treatment: keep
all your logic, and point the colours at useTheme instead of the fixed hex. I am happy
to pair on it, same as we planned.

Shout if anything looks off on your screens after you pull, and I will sort it.
