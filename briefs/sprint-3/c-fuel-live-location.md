# Fuel live location: switching to Google Places (US17)

This replaces the OpenStreetMap version of this brief. The places source changed after I checked the billing properly, so the plan changed with it. Nothing was built against the old version yet, so nothing is wasted.

Good news first: your mock already uses the real Google response shape, so most of your transform code stays exactly as it is.

## What changes

| Thing | From | To |
|-------|------|----|
| Places source | OpenStreetMap Overpass | Google Places (New) |
| Ratings | Hidden, because OpenStreetMap has none | Real Google ratings, shown as they are |
| Price | A cuisine-based guess band | Google's own price level |
| Location | Same either way | Device GPS, unchanged |
| Weather (US21) | Open-Meteo | Open-Meteo, unchanged. Google Places does not return weather, it is a separate paid product |

## Why it changed

I had ruled out Google because it needs a card on file and none of us wanted to pay. Kriss pushed back on that in our consultation, so I went and checked the mechanics rather than assuming.

Three things I found:

1. Google does not accept prepaid cards, so the shared gift card idea would have failed at signup anyway.
2. There is a $300 credit over 90 days, and that account **closes itself** rather than charging anyone. It cannot bill unless somebody manually clicks upgrade.
3. Our real usage sits inside the free monthly allowance regardless, so the expected cost is zero.

So nobody contributes money. I have put my own card on it for the verification step only, and I am the only person with billing access, so the upgrade button cannot be clicked by accident. This is logged as decision D-010, which supersedes D-009.

## What I have already done

| Done | Detail |
|------|--------|
| Cloud project and billing | A separate project, so our Firebase project is untouched and stays on the free plan |
| API key | Created and restricted to Places API (New) only, so it cannot be spent on anything else |
| Key in the repo | `EXPO_PUBLIC_GOOGLE_PLACES_KEY` is in `.env.example`. Ask me for the value, it is not in the repo |
| Device GPS | `locationService.getCurrentPosition()` has been on main since PR #62 and is tested. Returns a plain result object and never throws |

**I will also write the API client** (`src/services/recommendation/googlePlaces.ts`), the same way I did the OpenStreetMap one, so you are not dealing with request headers. It will export the same `GooglePlaceResult` type your mock already uses. I will tell you when it is on main.

## What I need you to do

Once my client is on main, in `recommendationEngine.ts`:

1. Swap `fetchMockGooglePlaces(resolvedBudget)` for the real call, passing the latitude and longitude through from the criteria you already accept.
2. Keep your existing transform. `displayName.text`, `rating` and `priceLevel` all come back with the same names, so the mapping into `FoodOption` does not change.
3. Retire `googlePlacesMock.ts` once it is working.

Then on the result card in `FuelScreen.tsx`, add the text "Powered by Google". Google requires attribution when their place data is shown outside a map.

## Three things that will bite if we do not plan for them

| Trap | What to do |
|------|-----------|
| Not every place has a rating | Real results can come back with no `rating` field. `place.rating.toFixed(1)` throws on those. Guard it and show the distance instead |
| Not every place has a price level | Same problem. Treat a missing price as unknown rather than assuming moderate |
| Nearby Search cannot filter by price | Unlike your mock, the real endpoint has no price filter in the request. We ask for nearby places and filter by `priceLevel` after the response, which is what your mock already does anyway |

## One cost thing worth knowing

Google charges by which **fields** you ask for, not just how many calls you make. Asking for name, rating, price and location is the cheap tier. Asking for reviews or photos moves us to a dearer one.

I could not set a spending cap in the console because the free trial locks that setting, so the field list in the code is the actual cost control here. I will set it in my client. If we ever want extra fields on the card, raise it with me first rather than adding them straight in.

## What is not changing

Your engine structure, the seam itself, the FuelScreen filters, the Eat In path, and the reroll and accept behaviour. The OpenStreetMap client stays in the repo as a working fallback in case we ever need to go back to a source that needs no card.

Tip for everyone: branch fresh off main before starting this. The last two pull requests were both cut from older branches and ended up behind, which is where most of our merge clashes have come from.
