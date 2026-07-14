# Location and weather: how we do it without a card or Blaze

The lecturer asked us to prioritise the live location
feature for Fuel (Eat Out) and the weather for Focus, so they are no longer stretch.
This is where I have landed on how we build both for free, without anyone putting in
a card and without moving Firebase onto the paid Blaze plan.

## First: the app finds the user's location itself

Before any paid map service, the app just needs to know where the user is. That
comes straight from the phone's GPS through Expo's location library
(`expo-location`). It is free, there is no API key and no card, and it only asks the
user for location permission the first time. So step one, getting the current
position (latitude and longitude), costs nothing and is not tied to any of the
services below.

The paid part is only step two: taking that position and asking a service "what
restaurants are near here" or "what is the weather here".

## Why I want us off Google Places

Google Places has the best data, and it is what our Sem 1 report chose. But it has
two problems for us now:

- It needs a Google Cloud billing account, which means a card on file, even to stay
  inside the free allowance. None of us wants to put a card in for a student
  project, and we cannot be fully sure we would never be charged if usage spikes.
- To use it safely the key cannot sit inside the app, which normally means a small
  server. Doing that on Firebase needs the paid Blaze plan.

So my plan is to move us off Google Places for the build.

## Finding places (Fuel, Eat Out): the alternatives

| Option | Card? | Key? | Free limit | Notes |
|--------|-------|------|------------|-------|
| **OpenStreetMap Overpass** | No | No key | Fair-use, very generous for user-triggered lookups | Best cardless option for nearby restaurants and cafes. Must send a real app User-Agent and show a "© OpenStreetMap contributors" line. No ratings or price. |
| **Geoapify Places** | No (confirmed no card at signup) | Free key | 3,000 requests a day | Richer structured place data. Needs a "Powered by Geoapify" link, and the key should be restricted. Good keyed backup. |
| **Foursquare Places** | Yes | Key | Drops to 500 calls a month from June 2026 | Ruled out. It now needs a card and the free tier is tiny. |
| Google Places | Yes | Key | Per-SKU 1,000 to 5,000 a month (the old $200 monthly credit ended March 2025) | Ruled out. A Google Cloud billing account, meaning a card, is required even for the free usage. This is the one we are moving away from. |

**My pick: OpenStreetMap** for the free, no-card, no-key route, with **Geoapify** as a
slightly richer free alternative if we want a bit more.

### Others I checked and ruled out

I looked into the services that claim to give a price band and ratings without a card,
because that would have been ideal. None of them hold up on today's terms:

- **Yelp Fusion** returns a price band and ratings and covers Australian cities, but its
  permanent free tier is gone. It is now a 30-day trial and then paid plans from about
  229 US dollars a month, likely needs card details even for the trial, and its
  Australian review coverage is thin. Ruled out.
- **Google's "demo key"** does let you call Places with no card, but only for local
  prototyping. It cannot be used in a published app that real users install, and it
  strips out reviews and ratings anyway. Fine for a quick demo on my machine, not for
  the real app. Ruled out.
- **Foursquare** drops to 500 free calls a month from June 2026, and ratings sit behind a
  paid add-on. Ruled out.

The honest conclusion: there is no service that is free, needs no card, works in a real
shipped app, and still gives a price band and ratings. It is a genuine trade-off. If we
hold the no-card line, OpenStreetMap is the one that works, and we accept no live price
and no live ratings on newly discovered places. If we ever decided that a card with a
hard spend cap were acceptable, Google Places is the only source that gives both price
and ratings in a real app, but that is a team and budget decision.

Losing the ratings and price band matters less than it sounds. From the lecturer's
budget question we already decided the budget comes from the user's own input (the
dollar range and the optional exact cap), not from the map service's rough price
band. So we were never leaning on the service for price anyway.

## Weather (Focus): the alternatives

| Option | Card? | Key? | Free limit | Notes |
|--------|-------|------|------------|-------|
| **Open-Meteo** | No | No key, no sign up | Under 10,000 calls a day | Free for non-commercial use, which our academic app is. Needs a CC-BY attribution line. Gives current, hourly and rain, ideal for "raining now, or in the next hour". |
| **OpenWeatherMap** (classic free) | No | Free key | 1,000,000 calls a month | Current weather plus a 5-day, 3-hour forecast. Enough for rain now or soon. Its newer One Call 3.0 tier needs a card, so we avoid that one. |
| **WeatherAPI.com** | No | Free key | 100,000 calls a month | Current plus forecast, commercial-use friendly. A good keyed backup. |

**My pick: Open-Meteo.** It is free, needs no key and no sign up, and gives exactly
what we need: are conditions bad now, and will they be bad soon, so we can flag an
outdoor Focus spot ("rain likely in the next hour, consider an indoor spot or take an
umbrella").

## Keeping any key safe without Blaze

The two picks above (OpenStreetMap and Open-Meteo) need no account and no key, so
there is nothing to hide and we call them straight from the app. If we ever choose a
service that does need a key, we can hide it behind a small free function on Netlify,
which we already use, instead of a Firebase Cloud Function, so still no Blaze.

## What this means for our report

Moving off Google Places, and off OpenWeatherMap's paid tier, is a change from the
Sem 1 proposal, so I will note it in `proposed-improvements.md` with the reason. It
is actually a strong story for the panel: the whole app runs at zero infrastructure
cost, with no card from us and no payment details from users, which fits the
privacy-first, local-first pitch we made from the start.

## Where I have landed

- Location: `expo-location` (the phone's GPS). Free, no key, no card.
- Places for Eat Out: OpenStreetMap Overpass, with Geoapify as a richer keyed backup (both need no card).
- Weather for Focus: Open-Meteo (no key, no card), with WeatherAPI as a keyed backup.

Because Tracy already built the Fuel screen around a mock seam, swapping in whichever
real source we pick does not touch the engine or the screens, so this is a small,
contained change.

One small task comes with these: they ask for an attribution line, so we show a
"© OpenStreetMap contributors" credit on the Fuel result and a short Open-Meteo
credit on the Focus result. That is a one-line addition, not a real cost.

I checked the current terms (July 2026) before writing this, so the table above is up
to date. Foursquare and Google Places both now require a card, which is exactly why
they are ruled out.

## Update: keeping live discovery, and what to honestly do about price

Live nearby discovery is the core of the app, so a fixed local list is not an option. I
dug further to find a way to keep a real price band too, and to check each option
properly rather than trust a summary. Here is where it landed after a closer look.

**TomTom: investigated, then ruled out.** At first TomTom looked perfect (free, no card,
a real price band and ratings, covers Australia). On a closer read it does not hold up:
the price band lives only in TomTom's POI Details API, and that one is **not part of the
free tier**. It is marked "Automotive only", is in private preview, and needs a Sales
contract. So a free student key cannot get TomTom's price at all. TomTom is out for
price. Good that we checked before building on it.
(The docs state POI Details is "not available as part of our free evaluation":
https://developer.tomtom.com/poi-details-api/documentation/product-information/introduction )

**The honest position on live price:** there is no service that is free, needs no card,
and gives a real per-restaurant price band on a normal self-service key. Every free,
no-card source (OpenStreetMap, Geoapify, LocationIQ, OpenTripMap) has no price;
OpenStreetMap's own price tag has literally zero uses worldwide. The only sources with a
real price (Google, Yelp, Foursquare) all need a card, and of those only Google can be
made safe with a hard spend cap. That leaves two live paths.

**Path 1: Google Places with a hard spend cap.** If we want a real, checked price per
restaurant and are willing to have a card on file but never charged, the trick is quotas,
not budgets. A Google budget only sends an alert, it does not stop spending. A per-method
daily quota does stop it: set each Places call to about 150 a day, which stays inside the
free monthly allowance (5,000 a month per call type), and any request over the cap is
rejected rather than charged. Restrict the key to Places only and to our app, and request
only the fields we need. Residual risk: Google has changed its pricing before (it dropped
the old free credit in March 2025), so we would re-check each sprint.
(Budgets only alert: https://docs.cloud.google.com/billing/docs/how-to/budgets ,
capping usage with quotas: https://docs.cloud.google.com/apis/docs/capping-api-usage )

**Path 2: OpenStreetMap for the places, and our own price bands for the money.** No card,
no key, real live places by GPS, cuisine and distance. It has no price, so we supply what
the dollar signs mean ourselves, honestly, using the standard Australian benchmarks
below.

### Real Australian price bands (so budget means something without a paid API)

Australian dining prices are fairly uniform because of award wages, so we can use standard
2026 per-person benchmarks as the real meaning of our dollar signs (worth a quick
sense-check before the demo, but they are reasonable):

| Band | Per person | Typical |
|------|------------|---------|
| $ (budget) | about $15 to $25 | food courts, bakeries, fast food |
| $$ (casual) | about $25 to $45 | suburban cafes, pub meals, fish and chips |
| $$$ (bistro) | about $45 to $75 | laneway bistros, a pasta or steak with a drink |
| $$$$ (premium) | about $75 to $150+ | fine dining, degustation |

Two honest uses for this, and one thing to avoid:

- **Use it to label the budget picker.** Instead of an abstract "$$", the app shows the
  real range ("$25 to $45"). This directly answers the lecturer's "what does $$ even mean"
  question, and it is honest, because it explains what a band means rather than claiming a
  particular restaurant's price.
- **Use cuisine as a rough guide on live places, clearly labelled as a guide.** For a
  newly discovered OpenStreetMap place we can show a typical band from its cuisine (Thai
  or a bakery is usually $, a steakhouse is usually $$$), labelled as a general guide, not
  a checked price. That lets the budget filter still work on live results without a paid
  API.
- **What to avoid:** generating a made-up exact dollar figure per restaurant (like a
  random $18.50) and showing it as that restaurant's real price. That is inventing data,
  and it goes against the transparency the whole app is built on. Show a real range for a
  band, or a clearly-labelled typical guide, never a fake precise number.

My lean now: OpenStreetMap for live discovery, the benchmark ranges for the budget picker,
and cuisine as a labelled guide on live places, all with no card. Google Places with
quota caps stays the fallback if the team wants a real checked price per restaurant and is
comfortable with a capped card on file. This is the team decision to make.

## Sources I checked (July 2026)

I went through the official docs and pricing pages for each option before landing on
the picks above, so this is on today's terms, not old blog posts. Terms change often,
so we should re-check the ones that need a key before we commit.

Places and location:

- expo-location: https://docs.expo.dev/versions/latest/sdk/location/
- OpenStreetMap Overpass: https://wiki.openstreetmap.org/wiki/Overpass_API and the usage policy at https://operations.osmfoundation.org/policies/nominatim/
- Geoapify pricing (states no card for the free plan): https://www.geoapify.com/pricing/
- Foursquare upcoming changes (500 free calls a month from June 2026): https://docs.foursquare.com/developer/reference/upcoming-changes
- Google Places usage and billing (billing account required): https://developers.google.com/maps/documentation/places/web-service/usage-and-billing

Weather:

- Open-Meteo pricing and terms: https://open-meteo.com/en/pricing
- OpenWeatherMap pricing (classic free vs One Call 3.0): https://openweathermap.org/price
- WeatherAPI pricing: https://www.weatherapi.com/pricing.aspx

Options I checked and ruled out (the ones that claim a free price band and ratings):

- Yelp Fusion (now paid, from about 229 US dollars a month, no permanent free tier):
  https://docs.developer.yelp.com/docs/plans and https://business.yelp.com/data/products/places-api/
- Google Maps demo key (no card, but prototyping only, cannot ship, strips reviews):
  https://mapsplatform.google.com/maps-demo-key/
- Foursquare pay-as-you-go announcement: https://foursquare.com/resources/blog/news/heads-up-developers-with-fsq-places-api-you-can-now-pay-as-you-go/
