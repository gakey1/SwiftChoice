# Confetti on Fuel and Focus, a reroll toast on Fuel, and one shared burst instead of three

Hi Tracy. Priority celebrated a decision and the other two modules did not, which made Priority feel like the finished one. That is fixed, and fixing it properly meant moving the confetti out of your Priority screen into one shared place. Your Priority code still behaves exactly as it did.

## What was missing

| | Reroll acknowledgement | Confetti on a decision |
|---|---|---|
| Fuel | **missing** | **missing** |
| Focus | had it | **missing** |
| Priority | its own toast | had it |

Fuel now has both. Focus gained the confetti. Priority is unchanged to use, but now draws its burst from the shared component rather than its own copy.

## Why the confetti had to move out of the screen

This is the part worth reading, because the obvious implementation does not work.

Accepting a decision calls `logDecision`, awards XP, then `navigation.goBack()`. The screen unmounts in the same handler. **A burst owned by the Fuel or Focus screen would be destroyed in the frame it started and nobody would ever see it.** Priority got away with a local copy only because completing a task leaves you on Priority.

The design already solved this. Its confetti sits in one layer pinned over the whole phone frame, outside any screen, and the particles live for about two seconds:

```
<div style="position:absolute; inset:0; pointer-events:none; z-index:40;">{{ confetti }}</div>
```

So the burst now lives above the navigator in `App.tsx`, and screens ask for one:

```ts
const { celebrate } = useCelebration();
...
celebrate();          // then navigate away in the same handler, which is fine
```

The design also fires it on **any** module's decision, not just a task:

```js
this.addXp(40, ...); this.pushToast('+40 XP'); this.celebrate(...)
```

That line sits in the shared "a decision was accepted" path, the one that also bumps the module counts, so it runs for Fuel and Focus as much as for Priority.

## Files

| File | What changed |
|------|--------------|
| `src/components/Celebration.tsx` | New. The provider, the hook, and the burst itself |
| `src/components/Celebration.test.tsx` | New. 5 tests |
| `App.tsx` | Mounts `CelebrationProvider` around the navigator |
| `FuelScreen.tsx` | `celebrate()` on Accept, `RewardToast` on reroll |
| `FocusScreen.tsx` | `celebrate()` on Accept |
| `PriorityScreen.tsx` | Local `ConfettiOverlay` replaced by the shared one, 2586 characters removed |

## What this means for your Priority screen

Short version: it behaves identically and it got smaller.

| Your code | Changed | What to know |
|-----------|---------|--------------|
| The two `celebrate()` calls, on complete and on rank | No | Same lines, same places |
| Your ranking algorithm, task list, XP | No | Untouched |
| Your Priority toast | No | Left as it is. It is a second, older implementation of the same idea, and rewriting it four days from the panel was not worth the risk |
| The local `ConfettiOverlay`, `CONFETTI_COLORS`, `confettiLayer` | **Deleted** | Replaced by the shared component. Same particle count, sizes, drift, durations and colours, so it looks the same |

The one real difference: the burst now draws above the tab bar and the XP badge rather than inside the screen, because it sits above the navigator. That matches the design, whose layer is above everything.

## The trap, and it is an easy one

**Do not put a celebration inside a screen that navigates away.** It will look like it works while you are building it, because you will be testing on a screen that stays put, and then do nothing at all on the screens that leave. There is a test named for this exact case:

> `keeps the burst after the screen that asked for it goes away`

It fails if the burst is moved back inside a screen. Three of the five tests were checked by breaking the code on purpose and confirming they went red.

`useCelebration()` outside the provider returns a no-op rather than throwing, so a screen rendered on its own, which every screen unit test does, still works. That is deliberate: decoration must never take a screen down with it.

## Both of these have been seen working

**Confirmed on an Android emulator:** accepting a Focus recommendation shows the confetti falling over the **Home** screen after the navigation. That is the whole point, and it is the thing a screen-local burst cannot do.

**Confirmed by watching it:** the reroll toast on Fuel, on both an Android emulator and an iOS simulator.

I could not capture that one automatically, and it is worth saying why in case you hit the same wall. The toast lasts 1150ms, and neither a screenshot nor a view-hierarchy dump is fast enough to catch it. That looks exactly like a broken feature. What ruled the code out was trying the identical capture against **Focus**, whose toast already worked before any of this, and finding it equally invisible. So the tooling was the problem, not the toast.

An emulator settles a question like this, because the animation is drawn the same way there as on a phone. That is not true of everything: a distance on a Fuel card still needs a real phone outdoors, since an emulator has no GPS and only reports numbers somebody typed.

Gates: 451 tests over 44 suites, tsc clean, lint unchanged.
