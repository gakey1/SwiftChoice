# Fuel: swapping in live location, and what happens to the rating

Hi Tracy, this is the plan for making Fuel (Eat Out) find real places near the
user, and I want your sign-off before anything touches your recommendation
engine or your result card. The lecturer asked us to prioritise the live
location feature, so it is no longer a stretch.

The good news: you built the Eat Out path around a mock seam, so most of this
slots in behind that seam. The one thing that needs a real decision is the
rating, because the free data source has none. I have landed on a hybrid that
keeps your ratings where we have them and stays honest where we do not. Details
below.

## What I have already built (your slice untouched so far)

Both of these are new files. Neither changes your engine or your screen yet.

- `src/services/location/locationService.ts` - `getCurrentPosition()`. Asks the
  phone for its location (free, no key, no card) and returns either a position or
  a clear reason it failed (permission denied, or no fix). It never throws.
- `src/services/recommendation/openStreetMapPlaces.ts` - `fetchNearbyPlaces()`.
  Queries OpenStreetMap for restaurants, cafes and fast food near a point and
  returns them nearest first, each with a name, a real distance in metres, and
  its cuisine tag. No key, no card.

Why OpenStreetMap and not Google Places: Google now needs a billing account with
a card on file even inside the free tier, and none of us wants that for a student
project. Full reasoning is in `decisions.md` D-009 and
`briefs/sprint-3/location-and-weather-apis.md`. The trade-off is that
OpenStreetMap has no ratings and no price, which is what the rating decision
below is about.

## The change to your engine (the required part)

Only the Eat Out branch of `getRecommendation` in
`src/services/recommendation/recommendationEngine.ts` changes. Right now it does:

    fetchMockGooglePlaces(budget) -> transform to FoodOption (rating from the mock)

It would become:

    getCurrentPosition() -> map the distance choice to a radius -> fetchNearbyPlaces() -> transform to FoodOption

Your Eat In branch, the Focus function, the shuffle, and the reroll cap do not
change at all. `googlePlacesMock.ts` retires once this lands.

## The rating decision, and the hybrid I recommend

OpenStreetMap gives us a name, a real distance and a cuisine, but no rating and
no price. We will not invent a rating, because the whole app is built on showing
honest, transparent information. So:

- Your curated pool places (the Eat In dishes and the seeded Eat Out list) keep
  their star rating exactly as they are now. Nothing changes for them.
- A live place discovered from OpenStreetMap has no rating, so instead of a blank
  or a fake star, its third chip shows the cuisine (for example "Thai"), and the
  distance chip shows the real GPS distance instead of the current fixed guess.

Here is the result card, side by side. The only thing that differs is the third
chip, and only for live places.

    POOL place (has a rating, unchanged)
    +--------+----------+-------------+
    |  $$    |  3.5 km  |  4.5 star   |
    | Budget | Distance |  Rating     |
    +--------+----------+-------------+
      distance is the current bucket guess

    LIVE place (no rating exists)
    +--------+----------+-------------+
    |  $$    |  0.4 km  |   Thai      |
    | Budget | Distance |  Cuisine    |
    +--------+----------+-------------+
      distance is the real distance from the phone's GPS

So the third chip follows one simple rule:

| Place kind | Third chip | Distance chip |
|------------|-----------|---------------|
| Pool (has a rating) | Rating, with the star, as now | The bucket text as now |
| Live (from OpenStreetMap) | Cuisine, plain, no star | The real GPS distance |

This keeps your card exactly as is for pool results, never shows a rating we do
not have, and turns the empty rating slot into something genuinely useful (what
kind of food it is). It also upgrades the live distance from the hardcoded
"1.2 km / 3.5 km / 6.0 km" to a true distance.

Why not the alternatives, briefly: no one wants Google Places because of the card
risk. Building our own ratings (users rate a place after eating) is a good idea
but it is a whole feature that would be empty at the demo, so I have logged it as
a Sprint 4 stretch, not now. And I checked the open review service Mangrove
directly: it has one rated cafe in all of Melbourne and none in Sydney, so it
cannot fill the gap.

## What this needs from your files

- `recommendationEngine.ts`: the Eat Out branch swap above. The `FoodOption`
  shape needs a small addition so a result can carry whether it is a live place,
  its cuisine, and a real distance, so the card knows which chip to show. I will
  keep every field you already have.
- `FuelScreen.tsx`: the result card's third chip becomes conditional (rating for
  pool, cuisine for live), and the distance chip shows the real distance for live
  places. Everything else on the card stays.
- `FuelScreen.test.tsx`: a small update to match the conditional chip.
- `googlePlacesMock.ts`: retired.
- One licence requirement: OpenStreetMap asks us to show a
  "© OpenStreetMap contributors" credit wherever we show its results, so a small
  line goes on the Eat Out result.

## How I would like to do this

This is your slice, so your call on who writes it. Two options:

1. I make the change on a branch and you review the PR before it merges, so your
   commits stay yours and mine are separate on top. This is the team rule we have
   been using.
2. You would rather do the card yourself and I hand you `fetchNearbyPlaces()` and
   `getCurrentPosition()` to wire in. Happy either way.

Either way, nothing lands on your engine or screen without your yes. Tell me if
the hybrid sits right with you, or if you would rather the live card keep a
"Rating" slot that says "Not rated" instead of showing the cuisine. I lean to the
cuisine because it looks less like something is missing, but it is your screen.
