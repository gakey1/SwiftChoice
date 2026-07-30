# Focus now warns about rain on outdoor spots (US21)

Hi Tracy. The Arcade prototype shows a weather notice on the Focus result card when the spot is outdoors, and that is now built and working from a real forecast rather than a mock. This is the record of what I changed in your screen and what it means for the work you have left there.

## What it does

When the recommended spot is outside and rain is likely in the next hour, the card shows the notice from the prototype:

> Rain likely in the next hour. Consider an indoor spot, or take an umbrella.

Focus green, Focus-tinted panel, rain-cloud icon, sitting above the spot name exactly as in the design. Green is correct here because it is a Focus screen, so the module-colour rule holds.

## Files I changed

| File | What changed | Why |
|------|--------------|-----|
| `weatherService.ts` | New. Asks Open-Meteo whether rain is likely in the next hour | The forecast, kept to one question |
| `weatherService.test.ts` | New. 7 tests | Mostly about failing safely |
| `recommendationEngine.ts` | `FocusOption` gains `outdoor`, and two pool spots are marked with it | Only outdoor spots can get a weather warning |
| `FocusScreen.tsx` | Fetches the forecast for outdoor spots and shows the notice | The feature itself |
| `FocusScreen.test.tsx` | 5 new tests | Covers every path that must stay silent |

## Why Open-Meteo and not Google

We now have a Google billing account for Places, and Google does sell a weather product, so this was a real choice rather than a default. Open-Meteo won on two points that are not about price:

- **No billing surface at all.** No key, no account, no card. It cannot cost anything, so it needs no monitoring and no field-mask care like Places does.
- **It outlives the Google trial.** That account closes itself after 90 days. If weather sat on it too, one account closing would take out both Fuel and Focus. Keeping them separate means Focus keeps working whatever happens to the billing.

Google's weather product is genuinely cheap (10,000 calls a month free), so this is not a cost argument. It is about not putting two features on one account that has an expiry date.

## The rule this follows: silence beats a wrong warning

A weather warning nobody can trust is worse than none, so the notice only appears when we are certain. It stays hidden when:

- the spot is indoors (and no forecast is even requested, since a library desk does not care about rain)
- the phone will not give a position, so there is nowhere to forecast for
- the forecast service is unreachable, errors, or answers with something unexpected

`getRainForecast` never throws. It returns a plain result saying either what the chance of rain is, or that it is unavailable, so no caller needs a try and catch to stay safe. Four of the five screen tests exist to prove the notice stays away.

The threshold is 50 percent. Lower would fire on most cloudy days and people would learn to ignore it.

## What this means for your part

Short version: your Focus screen still works exactly as it did, and nothing you have written changed behaviour.

| Your code | Did I change it | What to know |
|-----------|-----------------|--------------|
| The energy and vibe filters | No | Untouched |
| `getFocusRecommendation` and the matching logic | No | Untouched. I only added a field to the option type |
| Reroll, accept, and the history wiring | No | Untouched |
| The result card layout | Yes, one block added | The notice renders above the spot name, inside the existing `GlassCard`, only when it applies |
| `FocusScreen.test.tsx` | Yes, 5 tests added | Your two existing tests are unchanged and still pass |

The notice uses Focus green from the active theme, so the module-colour rule still holds and nothing needed a new token.

**The one thing that affects your remaining work:** if you restyle or rebuild the Focus result card, keep the notice above the spot name and inside the card, as in the prototype. It is the first thing someone should read, because it may change their answer before they look at the spot itself.

## Two things you should know about the pool

1. **`FocusOption` has a new `outdoor` field.** Bikash's real pool will need it when it replaces the temporary list, otherwise no spot can ever be outdoors and the feature quietly does nothing.
2. **I marked two spots as outdoor**: "Campus Common Area", and a new "Park Bench, Fresh Air" so there is an outdoor option at low energy too. If either reads wrong to you, change it. They are placeholders in a temporary pool. Bikash has the matching database change, written up in `b-focus-pool-outdoor-field.md`.

## A testing note worth passing on

My first version of the test picked Low plus Silent and looked for the park bench. It failed, because that combination matches four spots and the engine shuffles them, so it landed on a different spot each run. I switched to Medium plus Collaborative, which matches exactly one spot.

If you are asserting on a specific recommendation, pick filters with a single match, or the test will pass and fail at random.

## What is left

Device testing. The notice has never been seen on a real phone, and whether it crowds the card is not something a test can judge.
