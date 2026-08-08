# The cards are no longer frosted glass, on either platform

Hi Tracy. This changes how every card in the app looks, including all of yours, so I want you to hear it from me rather than find it in a diff. Nothing you wrote has to change and nothing you call has a different signature.

## What changed

| | Before | Now |
|---|---|---|
| Card surface | Translucent tint over a live blur | Opaque base under the same tint |
| Background wash | Three hard circles under a heavy blur | SVG radial gradients |
| `BlurView` in the app | Two | **None** |
| `GlassCard` name, radius, border, children | Same | Same |
| `GlassCard`'s `intensity` prop | Existed | Gone. Nothing ever passed it |

The dark palette also moved: cards are a deeper purple, and secondary text is brighter. Your screens will look different when you pull. That is expected.

## Why

The blur never worked on Android. A `BlurView` there has to be handed a target view to snapshot, and that failed three ways, every one of them silent and every one of them rendering a **white** card:

1. No target, and it quietly draws nothing.
2. A transparent target, and the engine clears each frame with the window background, which is white.
3. One target shared across the tab navigator. Home, History and Settings all stay mounted, all registered into the same slot, and the last one to mount won, so the cards on screen could end up blurring a different screen's hidden view.

Number three is why this took months. It depends on mount order, so it fixes itself on a reload and comes back the moment you change tabs. I called it fixed twice before it actually was.

Measured on the emulator, a card that should read `rgb(35,27,63)` was reading `rgb(87,81,110)`.

On iPhone the blur worked, and still cost more than it paid: the material lifts and desaturates everything under it, so the background sat at `rgb(26,24,35)` where the theme asks for `rgb(20,16,38)`, and cards read flat because their surround had lost its depth. One card measured green-tinted purely because the teal glow happened to be behind it. A frosted card inherits whatever is behind it, so identical cards do not stay identical.

An opaque fill does none of that. It composites to exactly what a correct blur produced, and it is the same on both platforms with no mount order to get wrong.

## What you need to do

Nothing. Pull and keep going.

## Two traps worth knowing

**`GlassCard`'s name is now historical.** It is a rounded, bordered, opaque card. If you go looking for the blur because the name implies one, it is not there and it is not a bug.

**Do not add a `BlurView` anywhere.** It will hit the same three failures, it will not warn you, and the failure mode is a white box that looks like a styling mistake. If you want something to appear frosted, layer an opaque fill and a tint the way `GlassCard` now does.

There is also a real cost here I am not going to pretend away: the frosted glass is gone from the product. The Arcade look survives in everything else, the wash, the palette, the radii, the borders, the type. But a card is a flat fill now.

## Also in the same PR, all visual, none of it needing anything from you

| What | Where | Why |
|---|---|---|
| Dark cards are a deeper purple, `rgb(43,33,82)` | `themes.ts` | The old fill composited to `rgb(35,27,63)`, which reads charcoal rather than purple against a near black background. Most of the move is saturation, not lightness |
| Secondary and tertiary text brighter | `themes.ts` | Small text at 8.4:1 on a dark surface reads as greyed out rather than as text. Subtitles are now 10.3:1, section labels 7.3:1 |
| Section headings bolder and brighter | seven `sectionLabel` styles | DM Mono ships Regular and Medium only, so 500 is as bold as that font goes and the colour lift is what carries it |
| The avatar halo actually glows on Android | `HomeScreen`, new `Glow.tsx` | It was `shadowColor` plus `elevation`. Android ignores shadow colour on views, so it fell back to a grey lift |
| The XP coin is drawn, not typed | new `CoinIcon.tsx` | It was the coin character, and an emoji is a lookup into the OS font. Apple draws it silver, Google gold, so the two platforms never matched |
| Bottom nav takes the real safe area inset | `BottomNav` | The hardcoded 18 cleared neither Android gesture navigation nor three button |

**The one worth knowing about generally:** `elevation` on a **circle** draws an octagon on Android, because elevation shadows come from a polygon approximation of the view outline. That is the same fault as the Focus badge earlier in the sprint, and the avatar was the second instance of it. If you want a glow on anything round, it has to be a real view behind it, which is what `Glow.tsx` is for.

## What is not changing

| | Changed |
|---|---|
| Any screen's layout or structure | No |
| Any recommendation, ranking or filter logic | No |
| `GlassCard`'s props you actually use | No |
| Module colour scoping | No |
| The light theme's card colour | No |

## What I already changed myself

`GlassCard.tsx`, `AmbientBackground.tsx`, the dark half of `themes.ts`, the bottom nav's safe-area padding, and the visual items in the table above. I deleted `BlurTarget.tsx` and its provider in `App.tsx` so the shared-slot fault cannot come back. `expo-blur` is still in `package.json` and now imported by nothing; I am leaving that until after the panel rather than churning the lockfile this week.

If you want the rest of the working out, the short version is that `GlassCard` stacks two known layers over its blur, so the blur's own colour can be solved for straight out of a screenshot. Subtract the card tint at 0.72 and Android's own tint from the observed `rgb(87,81,110)` and what is left is `rgb(244,243,244)`. White, and neutral to within one per channel, which rules out the wash rendering badly and leaves a white surface being blurred. Ask me and I will walk you through it.
