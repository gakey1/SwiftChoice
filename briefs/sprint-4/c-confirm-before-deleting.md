# Deleting a task now asks first

Hi Tracy. Small change to the Priority screen, but it is one worth knowing about because it changes how the delete button behaves.

## What was wrong

Deleting a task happened on the first tap. No question, no undo, and the delete button sits directly beside Complete. One mis-tap and somebody's task was gone.

Your rank action already confirms, which is what made the delete stand out.

## What I changed

| File | Change |
|------|--------|
| `PriorityScreen.tsx` | Delete asks first, and names the task in the question |
| `PriorityScreen.tsx` | Delete button gained an accessibility label |
| `PriorityScreen.test.tsx` | 3 tests |
| `coding-standards.md` | New section 9a, so this is a rule rather than a one-off |

The confirmation reads:

> **Delete this task?**
> "Wash the car" will be removed. This cannot be undone.
> **Keep it** / **Delete**

Naming the task matters when several are on screen. "Are you sure?" does not tell you which one you are about to lose.

Nothing else about the screen changed. Your ranking, completing, editing and the gamification are untouched, and the delete still disables itself once tasks are ranked, exactly as before.

## The accessibility bit

The delete button had no label, so a screen reader announced it as an unlabelled button that destroys a task. Complete had one, delete had been missed. It now says "Delete task". Worth a scan of your other icon-only buttons for the same thing, since an icon with no label is silent.

## The rule, now written down

`coding-standards.md` section 9a: anything that deletes, clears or removes something unrecoverable has to confirm first. It also covers what a good confirmation does, which is mostly naming the thing and saying it cannot be undone.

One part worth reading if you write any of the US34 notices: **say only what actually happens**. Clearing on-device data does not remove the copy of the history saved to the account, so its wording says "on this phone" rather than implying everything is gone. A confirmation that overstates itself is worse than none, because people believe it.

## The test that matters

Three tests, but the one to keep is that the **first tap does nothing**. That is the part which breaks quietly later, because the button still looks like it works, and you only find out when somebody loses a task.

If the wording reads wrong to you, change it. The behaviour is the part I would keep.
