# Lecturer feedback (week 6 demo) - running notes

Notes from the lecturer's feedback at the week-6 demo, kept here so we track and
action each point. I will expand the design and gamification sections as we
scope them; for now the authentication point is worked out in full because it is
the most time-sensitive and it is in my slice.

## Feedback items

| # | Area | What was raised | Owner | Status |
|---|------|-----------------|-------|--------|
| 1 | Authentication | Sign in should be stronger: (a) confirm the email is real so fake sign ups cannot flood the system, and (b) add a second factor (2FA) | Yvonne | (a) done, (b) planned - see below |
| 2 | Design | Improve the visual design and polish | Tracy (lead), all | To scope |
| 3 | Gamification | Add game-like elements to lift engagement (to be defined) | All | To scope |
| 4 | Other | Further points from the demo | All | To capture |
| 5 | Data accuracy and external APIs | How accurate are the restaurant and budget recommendations, what about a one-place area, cuisine fit, the Eat In model, and weather | All (Fuel: Tracy + Bikash; APIs: Yvonne) | Scoped in section 5 below |

I will flesh out items 2 and 3 once we scope them as a team.

## 1. Authentication (detail)

Two separate things were asked for.

### (a) Confirm the email is real - DONE

Sign up now sends a verification link and holds the account on a "confirm your
email" screen until the person clicks it. The app screens are not reachable until
the inbox is confirmed, so someone cannot register a pile of fake addresses to
flood the system. This is live in the app (`VerifyEmailScreen`, plus the check in
`RootNavigator` and `useAuth`).

### (b) Second factor (2FA) - options and the plan

Worth stating up front: our Sem 1 proposal report does not mention 2FA anywhere.
It specifies email-and-password sign in through Firebase Authentication, on
Firebase's free Spark plan, with sensitive login credentials kept in secure
on-device storage. So 2FA is a new ask from the demo, not something in the
original plan. Because there is no spec to match, the tie-break for choosing a
method is which one best fits what the report already commits to.

**The three ways we could add 2FA:**

| Option | How it works | Cost / infrastructure | Fit with our proposal |
|--------|--------------|-----------------------|-----------------------|
| A. TOTP in our own code | The 6-digit code from an authenticator app (Google Authenticator, Authy). Our app makes a secret at enrolment, the user adds it to their authenticator app, and enters the current code to sign in. We verify it with a small library. | Free. No server, no email, no SMS. Stays on the Spark plan, no card needed. | Closest. Keeps the free-plan promise; the secret lives in our existing secure on-device storage, exactly the approach the report describes. |
| B. Firebase built-in MFA | Firebase's own multi-factor feature (TOTP or SMS). | Needs the "Firebase Authentication with Identity Platform" upgrade. Free within a monthly-active-user allowance but generally needs a Blaze (pay-as-you-go) account, which means a card on file. TOTP has no per-use cost; SMS charges per text. | Uses Firebase, which the lecturer suggested, but moves us off the free Spark plan the report budgeted for. |
| C. Email one-time code | We email a fresh code on each login and check it. | The app cannot send email itself, so it needs a Cloud Function plus an email provider (for example SendGrid at 100 free emails a day). Both need the Blaze plan, so again a card on file. | Furthest. Adds server and email infrastructure the report's local-first, no-infrastructure-cost approach deliberately avoids. |

**Chosen direction: Option A (TOTP in our own code), staying on the Spark plan.**

Why A and not B or C:

1. Cost and infrastructure. The report commits to Firebase's Spark plan with, in
   its words, no infrastructure costs during development. Option A is the only one
   that keeps that promise: no paid plan, no card, no server. B and C both need
   the paid Blaze plan.
2. Security fit. The report says login-related credentials belong in secure
   on-device storage (Keychain). A TOTP secret is exactly that kind of credential,
   and we already have secure on-device storage wired up in the app
   (`src/services/localdb/secureStorage.ts`). Option A drops straight into that
   setup; B and C push authentication out to cloud services the report avoids.
3. It demos cleanly. TOTP is pure on-device calculation (a secret plus the current
   time), so it runs on the iOS Simulator and Android emulator with no phone, SMS,
   email, or network. SMS-based 2FA needs a real phone, and email codes need mail
   delivery, so both are harder to show in our simulator-based demo.

Worth noting for the record: even Firebase's own built-in TOTP requires email
verification to be enabled first, which we have now built. So the email work in
(a) is a foundation either way.

**What Option A needs:** one small, self-contained library to create and check
the codes (`otpauth`), an enrolment screen (show the secret, confirm a first
code), and a code entry screen on login. The secret is stored per user in our
secure on-device storage. No change to anyone else's slice.

### Related polish and follow-ups

- **Wrong-email escape on the verify screen.** If someone mistypes their email at
  sign up, they will never get the link. The verify screen carries a clear "log
  out and try again" action so they can re-register with the correct address,
  rather than being stuck. Wording to use: "Entered the wrong email? Log out and
  try again." Applied alongside the 2FA work (same screens).
- **Clearing out abandoned unverified accounts.** Firebase does not delete
  accounts that never verify (a typo, a test, an abandoned sign up); they sit in
  the system unused. A tidy fix is a scheduled function that deletes accounts
  where the email is still unverified and the account is older than 7 days. Worth
  noting the cost: this runs as a Cloud Function, which is on the paid Blaze plan
  (the same plan the account-deletion cascade already needs), so it is a "once we
  are on Blaze anyway" or later item, not a free-plan feature. Logged as a
  follow-up, not built now.

## 5. Data accuracy and external APIs (Fuel and Focus)

At the review the lecturer pressed on how accurate the recommendations really
are, especially the restaurant data and the money side. Fair questions, and they
land mostly on the Fuel module and the recommendation engine. This section
records each concern, an honest read of the limitation, and a proposed solution,
with the area of the app it touches and the best-placed team member for each.

### The APIs the proposal chose (for reference)

From the Sem 1 report's technology evaluation (Decision Matrices 3 and 4):

- **Google Places API** was chosen for the Fuel module's Eat Out path (scored 79
  percent, ahead of Foursquare 73 and Mapbox 69). It supplies venue data: name,
  address, rating, opening hours, photos, and a price level. Free tier is 10,000
  requests a month; beyond that it is about USD 0.032 a request. Foursquare is the
  named fallback if cost becomes a problem at scale. Google's terms also forbid
  storing (caching) their data for more than 30 days.
- **OpenWeatherMap** was chosen for the Focus module's outdoor path (scored 83
  percent, ahead of Tomorrow.io 74). It gives current conditions, minute-by-minute
  precipitation, and an hourly forecast, on a free tier of 1,000 calls a day.

Two things to be upfront about before the answers:

1. **Fuel has two data paths, and only one uses Google Places.** The curated-pool
   path (everything the user has added to their own Fuel pool) is user-entered
   data. The Eat Out live path is the only one that pulls from Google Places, and
   it is a stretch (US17). Most of the accuracy questions are really about which
   path we mean.
2. **Google Places gives a price band, not exact prices.** Its price level is a
   coarse 0 to 4 scale (free, inexpensive, moderate, expensive, very expensive).
   It does not return per-dish prices. So Places cannot, on its own, promise
   exact-dollar accuracy either.

### 5.1 How do we know what each restaurant offers, and how money-accurate is that?

**The limitation, honestly.** For Eat Out, Google Places tells us venue type,
rating, opening hours, photos, and a price band. It does not give a menu or exact
prices. So "exactly what each restaurant offers" is limited to category, rating,
hours, and a rough band. For the curated pool, the data is only as accurate as
what the user typed when they added the item.

**Proposed solution.** Be transparent rather than overclaim. The result screen's
reason line (US28) names the source, for example "mid-range, per Google's price
level" for a Places result, versus "your budget tag" for a pool item. We never
present a rough band as an exact figure.

- **Area:** recommendation engine and the Fuel result screen (reason line), plus
  the Places client for the Eat Out path.
- **Best-placed:** Tracy for the engine and reason line (she owns the module
  screens and engine); Yvonne for the Places client and how its price level maps
  in (she owns external APIs and deployment, US17).

### 5.2 The budget bands are ambiguous: $$ could mean anything

The sharpest version of the money question. One dollar sign is easy (a cheap
meal), but two or three mean different things to different people. Someone who
picks two dollar signs might cap themselves at 20 dollars, while the band could
run much higher. Google Places has the same problem, because its price level is
only four coarse bands too, so leaning on Places does not fix the ambiguity, it
inherits it.

**Proposed solution (recommended: both).**

- **(a) Turn the bands into explicit dollar ranges in the UI.** Instead of an
  abstract "$$", show concrete ranges, for example "under $15", "$15 to $35",
  "over $35", and store the numeric range, not just the symbol. The user picks a
  real range, so the ambiguity disappears.
- **(b) Add an optional exact cap.** A simple "spend up to $__" field that
  overrides the band, for the user who chose the middle band but really caps at
  20. The engine filters pool items by their numeric price where it has one, and
  falls back to the band otherwise.

- **Area:** the Fuel input screen (range labels and the optional cap), the
  recommendation engine (numeric filtering), and the data model and pool schema (a
  numeric price or price-max field on a Fuel pool item, and the default budget in
  preferences).
- **Best-placed:** Tracy for the input screen and engine filter; Bikash for the
  pool schema (a numeric price field) and the preferences default; Yvonne
  coordinates how the Places price level maps onto the same ranges.

### 5.3 A user with only one nearby place gets the same recommendation every time

**The limitation, honestly.** If the pool or the Places result set has only one
match, a naive engine keeps serving that one card, which feels broken.

**Proposed solution.** We already ship a one-reroll cap and a no-more-matches
state on Fuel and Focus (the reroll button greys to "No Alternative"). Extend that
into a helpful nudge rather than a dead end: when the match set is very small,
show a message like "Only one match nearby. Try widening your distance or changing
your filters," so the user is guided to change distance or switch between Eat In
and Eat Out instead of seeing the same result again.

- **Area:** the recommendation engine (detect the match count) and the module
  result screens (the message and call to action).
- **Best-placed:** Tracy, who owns the engine and module screens and already built
  the reroll-cap and no-match states.

### 5.4 Does the user even like the cuisine we recommend? (raised by Yvonne)

**The limitation, honestly.** For the curated pool this is already solved: the
pool is the user's own list, so everything in it is something they chose. It bites
only on the live Google Places path, which returns whatever is nearby regardless
of taste.

**Proposed solution.**

- **(a) A cuisine preference** in the preferences screen (cuisines a user likes or
  avoids), passed into the Places query as a type or keyword filter so we only
  pull cuisines they like. This also reuses the dietary field the data model
  already has.
- **(b) Save to pool.** Let the user save a liked Places result into their Fuel
  pool, so future recommendations lean on places they have approved. A light
  "learned preference" without any machine learning.

- **Area:** preferences (the cuisine list), the Fuel input and engine (apply the
  filter), and the Places client (the query parameter).
- **Best-placed:** Bikash for preferences and the cuisine list (his preferences
  and data slice); Tracy for applying it in the engine and input; Yvonne for
  wiring it into the Places query.

### 5.5 How is the Eat In decision made: delivery, or what is in the house?

**How it works now.** In the data model, a Fuel pool item has a type of either
meal or restaurant. Eat In recommends from the user's meal items, filtered by prep
time and budget. So Eat In is not delivery and it does not read the user's fridge;
it picks from the meals the user has added to their pool, the dishes they are
willing to make or eat at home, filtered by how long they have and what they want
to spend. The input source is the user's own Fuel pool plus the Eat In filters.
There is no ingredient or inventory input.

**Proposed solution.** Keep the MVP as it is (Eat In equals a pick from your meal
pool by prep time and budget), and make the interface copy say so plainly, for
example "meals you can make at home", to set expectations. A "what do you have in
the kitchen" ingredient input is a much larger feature (an inventory) and belongs
after the MVP, not now.

- **Area:** the data model (the Fuel pool item type), the Fuel input and engine
  (the Eat In path), and pool management.
- **Best-placed:** Bikash for the pool and meal items; Tracy for the Eat In engine
  path and the copy. Not Yvonne's slice.

### 5.6 Weather for Focus and Eat Out

The proposal already chose **OpenWeatherMap** for this, and the Focus spot model
even has an isOutdoor flag ready for it. When we recommend an outdoor Focus spot,
or an Eat Out venue that means walking, we check current conditions and the short
forecast; if it is raining or stormy, we either de-prioritise outdoor options or
show an advisory, for example "It looks like rain in the next hour. Consider an
indoor spot, or take an umbrella." This is a genuine improvement to the
recommendation, not decoration.

- **Area:** the Focus engine (weather-aware ranking), a weather client, and the
  Focus result screen (the advisory).
- **Best-placed:** Yvonne for the weather client (an external, keyed API, the same
  shape as the Places work); Tracy for the engine and advisory message (she
  already has an approved weather mock as a head start on the seam).

### Cross-cutting: cost, keys, and the plan tier

Both Google Places and OpenWeatherMap are keyed services, and a key must not ship
inside the app, where it can be extracted. The clean answer is a small Cloud
Function that holds the key and proxies the request, which also lets us cache
within Google's 30-day limit and cap how often we call out (important, because
rerolling too often on Places runs up per-request cost). Cloud Functions need
Firebase's paid Blaze plan, the same plan the account-deletion cascade will need.
So there is a team decision here: move to Blaze now and do these properly, or keep
the external APIs mocked for the demo and treat live data as a later step. This is
money and infrastructure, so it is a team and budget decision, not a quiet
technical one.

### Design note

Several of these solutions add new interface surfaces: a dollar-range budget
picker with an optional exact cap, a cuisine preference, a "widen your distance"
message, and a weather advisory. It is hard to build these consistently without a
shared mockup of where the app is heading. The team has agreed on a modern look
(see the design-refresh note for PR 39); the next step is to lock a shared set of
screens so all three of us build to the same picture. Design options are being
gathered into docs for the team to choose from.
