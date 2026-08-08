# The Focus result card: shorter vibe words, an even stat row, and a round badge on Android

Hi Tracy. Three fixes to the Focus result card, all found by looking at it on an Android emulator next to an iPhone. One of them changes a word people read, so it is the one I most want your eye on.

## 1. The vibe chip now says "Collab" and "Ambient"

| Where | Silent | Background | Collaborative |
|-------|--------|------------|---------------|
| Filter buttons | Silent | Background | Collaborative |
| "Based on ... vibe" sentence | Silent | Background | Collaborative |
| **The Vibe stat chip** | Silent | **Ambient** | **Collab** |

Only the chip changed. The filter and the sentence keep the full words.

**Why.** A stat chip is a third of the card wide. "Collaborative" is thirteen characters and does not fit at the size the other two chips use, so it shrank on its own and sat visibly smaller than "Medium" and "Outdoor" beside it. The row read as a mistake rather than as three words of different lengths.

I first fixed that by sizing the row together, so all three shrank as one. It was even, but everything became small and harder to read, which traded one problem for another. Short words are what actually solves it: the row stays at full size and nothing has to shrink.

**Why those two words.** The design already does this. Its prototype puts the long word on the filter and a single short word on the result chip:

```js
// docs/design-system/ui_kits/app/ScreensFuelFocus.jsx, line 138
{ value: vibe==='Collaborative' ? 'Quiet' : 'Silent', label:'Vibe' }
```

So a short chip word follows the design rather than working around it. "Collab" is the short form people actually write, and "Ambient" says the same thing as "Background" in seven characters. "Background" mattered too: at ten characters it also shrank the row, just less obviously, and it is the default vibe so most people would have seen it.

**If you would rather have different words, say so and I will change them.** This is copy on your screen, the meaning is unchanged either way, and the only hard requirement is that a chip label stays under eight characters.

## 2. The stat row picks one font size for all three chips

`adjustsFontSizeToFit` shrinks each `Text` on its own, which is right for one word and wrong for a row of three. The row now takes its size from the longest label so they step down together, or not at all.

With the short words above, nothing reaches eight characters and the row always renders at full size. I kept the sizing rule anyway rather than deleting it, because without it there is an invisible requirement that chip labels stay short, and the next person to add a vibe or a setting would have no way of knowing. Now a longer word costs a slightly smaller row instead of a clipped word.

**The trap:** if you add or rename a vibe or a setting, keep the chip label under eight characters. Go over and the whole row shrinks, which still looks tidy but is smaller than it needs to be.

## 3. The badge was rendering as an octagon on Android

The circle behind the spot icon had `elevation: 8` to give it a green halo. Android draws elevation shadows from a polygon approximation of the view outline, and at 112 points across that approximation is visible, so the halo landed as an octagonal band around the icon while iOS drew it round.

Removed `elevation`. iOS keeps the glow through its shadow properties, which Android ignores anyway, so nothing changed there. Android loses the halo and gets the circle back. That is a cheap trade, because Android has no shadow colour on views, so the halo was already untinted and was the least faithful part of the design on that platform even before the octagon.

Worth knowing generally: **a circle with `elevation` will do this anywhere in the app.** If you want a glow on a round thing on Android, it has to be a real view behind it rather than a shadow.

## Also, on Home rather than Focus

The dashed border on the "Keep the momentum" card was drawing one pixel along the bottom against four along the top, which reads as grey in light mode and is almost invisible in dark. The stroke was inset by half its thickness, which puts its outer edge exactly on the canvas boundary, and a card height in points is rarely a whole number of pixels, so Android truncated the last fraction. Fixed in `DashedOutline`, so anywhere we use it gets the fix.

## What is not changing

| | Changed |
|---|---|
| The energy and vibe filters | No |
| `getFocusRecommendation` and the matching logic | No |
| Reroll, accept, and the history wiring | No |
| The weather strip and when it appears | No |
| Card layout, spacing, colours | No |
| Your tests | No, all still pass |

The tests press the filter buttons by their full text, which is why none of them needed touching.

## Checked on a device, not just by eye

I got the first diagnosis of the octagon wrong by looking at a screenshot, so all three were confirmed by sampling actual pixels:

- Stat chips: all three glyphs now occupy the same rows, cap height 30px each, where the long one was 21px against the others' 30px.
- Dashed border: bottom edge went from one row of teal to three, against four along the top, at the same colour value in both light and dark.

If a rendering difference between the two platforms ever looks subtle enough to argue about, that is a faster way to settle it than staring.
