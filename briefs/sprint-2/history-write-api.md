# Wiring Accept to the history-write API

This is a short guide for swapping the temporary console logging in the Fuel and
Focus Accept buttons for the shared history-write function. The function is ready
on main. You do not need to know how it stores anything; you just call it.

## What changed

There is now one function that records an accepted decision:

```ts
import { logDecision } from "@/features/history/historyStorage";
```

It takes the module, an optional pool item id, a snapshot of the chosen item, the
filters that produced it, and whether it was the reroll pick. It returns once the
decision is saved.

## Fuel screen (US16)

Replace the temporary `logDecisionToHistory` mock and its call with:

```ts
await logDecision({
  moduleType: "fuel",
  fuelId: recommendation.fuel_id,
  itemSnapshot: {
    name: recommendation.item_name,
    details: {
      type: recommendation.type,
      budget: recommendation.budget_level,
      rating: recommendation.rating,
    },
  },
  appliedFilters: {
    mode: mealType,
    budget,
    prepTime,
    distance,
  },
  rerolled: hasRerolled,
});
```

Then clear the result and return Home as you do now.

## Focus screen (US20)

Same shape, with the Focus fields:

```ts
await logDecision({
  moduleType: "focus",
  focusId: recommendation.focus_id,
  itemSnapshot: {
    name: recommendation.spot_name,
    details: {
      energyLevel: recommendation.energy_level,
      vibe: recommendation.vibe,
      rating: recommendation.rating,
    },
  },
  appliedFilters: {
    energyLevel,
    vibe,
  },
  rerolled: hasRerolled,
});
```

## Notes

- `itemSnapshot.name` is required and must not be empty; everything in `details`
  and `appliedFilters` is free-form, so add whatever the screen already has.
- Only pass the id that matches the module (`fuelId` for Fuel, `focusId` for
  Focus). Leave the others out.
- The call is awaitable. Keep your existing await so the button waits for the
  save before it navigates.
- Where the decision ends up is handled for you and will grow in the next sprint
  (the on-screen behaviour of Accept does not change).

Shout if you want to pair on wiring it in.
