# The address on the Eat Out card

Tracy suggested this and she was right, so it is in. Short brief because the change
is small, but the cost check behind it is worth reading, since it is the part that
would have been easy to get wrong.

## What changed

The Eat Out result card now shows the street address under the stat chips.

```
Corner Cafe
[ $$ Budget ] [ 400m Distance ] [ 4.2 Rating ]
(pin) 120 Swanston St, Melbourne
```

Why it earns the space: a distance tells you how far, not which way. "400m" is
useless on its own if you do not know whether to turn left or right, and it was the
one thing on the card you could not act on.

## It cost nothing to add, and that was checked first

This is the part worth knowing, because the obvious assumption is wrong in both
directions.

Google charges per request, and which price you pay depends on which fields you ask
for. Fields sit in three tiers, Essentials, Pro and Enterprise. **A request is billed
once, at the highest tier any requested field belongs to.** Google's wording:

> You are then billed at the highest SKU applicable to your request.

Our search already asks for `rating` and `priceLevel`, and both of those are
**Enterprise**, the dearest tier. The address fields are **Pro**. So we were already
paying the higher price, and adding the address changed the bill by nothing at all.

The trap this points at, for anyone adding a field later: it is not the number of
fields that costs money, it is the tier. Adding five Pro fields to this call is free.
Adding one Enterprise field to a Pro-only call multiplies its cost. **Check the tier
before adding a field, never the count.**

There is a test that pins the exact field list, so if anyone adds a field the suite
fails and says so, rather than the bill changing quietly. It now expects six fields
instead of four.

## Details

- **Two address fields are requested, not one.** `shortFormattedAddress` is the
  readable one ("120 Swanston St, Melbourne"); `formattedAddress` is the full postal
  version with state, postcode and country. The card prefers the short one and falls
  back to the long one, because Google omits the short form on some records. Both
  are Pro, so asking for both is still free.
- **No address means no row.** Real records genuinely lack one. There is no
  "Address unavailable" placeholder: it takes the same space as a real address and
  tells you less than showing nothing, which is the same rule the rating chip
  already follows.
- **Eat In is unaffected.** Pool items are meals, not places, so there is no address
  and the row never appears.
- **The address is Google's, never assembled by us.** Composing one from parts is
  how you send somebody to the wrong building.

## Whose code

`FuelScreen.tsx` is Tracy's and I have added the address row to the result card. The
filters, the reroll, `currentIndex` and the accept flow are untouched. The client and
the transform (`googlePlaces.ts`, `recommendationEngine.ts`) are mine from US17.

One thing that would have caught somebody out: `FuelScreen.test.tsx` mocks the whole
Google Places module, and the engine now calls `readableAddress` from it. Left out of
the mock, that function is `undefined`, the engine throws, the screen falls into its
empty state, and **every existing assertion still passes** while no card ever renders
an address. The mock now uses the real function via `jest.requireActual`. Worth
remembering whenever a mocked module gains an export.

Gates green: types clean, lint 0 errors, 432 tests over 42 suites. On a branch, not
merged, and not yet seen on a phone.
