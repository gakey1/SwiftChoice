# Fuel input screen - changes before it can merge (PR #16)

Nice start, the screen looks right. Here are the changes to get it ready to merge, in order. Pull your branch, make them, run the two checks at the bottom, and push. Pushing updates the same PR, you do not need a new one.

## Get set up

```bash
git checkout feature/fuel-input-screen
git pull
```

## What is already good (leave these alone)

- Amber is used on the Fuel screen. That is the rule, so keep it.
- The screen sits inside the logged-in part of the app, so the tabs stay behind login. Good call.

## The changes

### 1. Remove the four `as any` bits (this is what blocks the merge)

Our project is set up to treat `any` as an error, so the four `as any` spots in `src/screens/fuel.tsx` stop it from merging. Each one is fixed by the steps below, so by the end there should be no `as any` left. You can check by running `npm run lint`.

### 2. Fix the food icon

Quick background, since it is easy to miss. All the icons in the app come from one set called Feather. It is a fixed pack of simple line icons, each with a set name like `home`, `clock`, `settings`, or `coffee`. We wired the app to Feather right at the start, when the shared design components were added, in `src/components/Icon.tsx`. So every `<Icon name="..." />` has to use a name that exists in Feather. If the name is not in the set, nothing draws.

The name `utensils` is not a Feather icon, so the Fuel icon currently shows nothing. Swap it for a Feather name that exists, like `coffee`. Once the name is a real one, the `as any` next to it can come off too.

To see the names you can choose from, look at https://icons.expo.fyi (set the family filter to Feather) or https://feathericons.com. Anything you see there is safe to use.

### 3. Tell the option groups which choices are allowed

When a Budget, Prep Time, or Distance option is tapped, the code uses `as any` to pass the value back. The option group hands back a plain piece of text, but each setting only allows a few specific values. So instead of `as any`, list the exact values that setting allows. That keeps the safety check on (which is what `any` turns off).

The three values you already use for each setting are the ones in your `useState` lines at the top of the screen. Make these swaps:

| In this group | Change `val as any` to |
|---------------|------------------------|
| Budget        | `val as "$" \| "$$" \| "$$$"` |
| Prep Time     | `val as "short" \| "medium" \| "long"` |
| Distance      | `val as "near" \| "mid" \| "far"` |

That clears the three remaining `as any` casts (the icon one is handled in step 2 above). There is a slightly tidier way to do this with a reusable typed component if you want to learn it later, but the swaps above are enough to get the screen merged. 

### 4. Make the Back button work

Right now the Back button does nothing, so once you open Fuel you cannot leave it. Give it an action that goes back to the previous screen. React Navigation gives you this through `useNavigation`, then calling `goBack()` when the button is pressed.

### 5. Use the colour names, not the codes

You typed colour codes straight in. Swap each one for the matching token so the colours stay consistent with the rest of the app. You already import `T` and `MODULES`, so no new imports are needed. Here is each one:

| What you have now | Change it to | What it is |
|-------------------|--------------|------------|
| `MODULES.fuel?.c700 \|\| "#D98A43"` | `MODULES.fuel.c700` | the Fuel amber (drop the spare code after the `\|\|`, it is always set) |
| icon background `"#FDF3E7"` | `MODULES.fuel.tint` | the soft amber behind the icon |
| toggle track `"#F4F3F0"` | `T.neutral` | the light grey strip behind the Eat In / Eat Out buttons |
| the whites `"#FFFFFF"` (active toggle button, option cards) | `T.surface` | the card white |
| option card border `"#EAE9E5"` | `T.border` | the thin border line |

The black shadow colour on the active toggle is fine to leave as it is.

### 6. Match how the other screens are set up

Two small consistency fixes:

- Move the file to `src/screens/fuel/FuelScreen.tsx` and export it by name (`export function FuelScreen`), the same way Home, Login, and Settings are done. At the moment it is a single lowercase file with a default export, which is different from the rest.
- Give the new navigator a list of its screens and their names, the same way `AppTabs` does with its list. That keeps the navigation typed and consistent.

### 7. Add a small test

Add a short test next to the screen that checks it renders and that tapping a toggle switches it, the same shape as `HomeScreen.test.tsx`. It does not need to be long.

## Check before you push

Both of these must pass:

```bash
npm run lint
npx tsc --noEmit
```

## Push

```bash
git add src
git commit -m "fix(fuel): address review on the input screen"
git push
```

That updates PR #16. Shout if you need my help.
