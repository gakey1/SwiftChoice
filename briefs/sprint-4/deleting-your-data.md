# How we delete data, and why it changed

This one is for both of you, because it touches the pools, the history and the privacy notices. I am starting the two privacy stories that are mine, US31 (clear local data) and US33 (delete account), and the approach has changed from what the plan said.

## What I am doing

| Story | What it does | Mine |
|-------|--------------|------|
| **US31** | Clears the data this app has stored on the phone, and keeps your account | Yes |
| **US33** | Deletes the account and everything with it, on the phone and in the cloud | Yes |
| **US34** | The notices that tell people what is collected, at each point of collection | Tracy |

I am doing US31 first, because it is the on-device half of US33. Doing it first means the second story is mostly already written.

## The options, and what I picked

The original plan was a Cloud Function: the app deletes the user record, and Google's servers then clean up everything underneath it.

| | Cloud Function | Client-side (chosen) |
|---|---|---|
| Where the work happens | Google's servers | The app |
| Firebase plan needed | **Blaze, so a card on Firebase** | Spark, stays free |
| Finishes if the app is closed mid-delete | Yes | No, but see below |
| Still needs code in the app | Yes, the same amount | Yes |
| Extra setup to deploy | A `functions/` folder and its own deploy step | None |

I chose client-side. The deciding facts:

1. **Blaze means a card on Firebase.** The Google billing I set up for Places sits on a completely separate project exactly so Firebase can never start charging us. Putting Firebase on a paid plan for one feature undoes that.
2. **It does not save any app-side work.** Deleting the login itself has to happen from the app either way, so the fiddly part gets written regardless.
3. **There is much less to delete than the plan assumed.** The data model lists four cloud collections. Only one is actually used: the decision history. The three pools live on the phone and were never copied to the cloud.

## The trade-off, stated plainly

The Cloud Function is genuinely more robust. If someone taps delete and immediately force-closes the app, a server would finish the job and the client will not.

What makes that acceptable:

- **Order protects us.** Data is deleted first and the login last. Our security rules only let you touch your own data while you are signed in, so deleting the login first would leave everything else permanently stuck. Getting the order right means a half-finished delete leaves you still signed in and able to press it again.
- **A failed delete is recoverable, not broken.** Nothing is orphaned; the user simply retries.

## What this means for the app

Nothing about how it runs day to day. No new dependency, no plan change, no extra deploy step, and infrastructure cost stays at zero. It also keeps the privacy story clean for the panel: the app that promises it holds nothing about you also does not need a payment method to run.

## For people already using it

Nothing changes until they use the new buttons. Their data stays exactly where it is.

The one thing worth being careful about is wording, and it affects Tracy's US34 notices too.

**Clearing local data does not delete the cloud copy of your history.** Decisions are mirrored to Firestore when they are accepted, so wiping the phone leaves that mirror untouched. If the button says something like "clear my data" and people take it to mean everything, we have told them something untrue, which is the exact thing this app is supposed to be better at.

So the two need to read differently and unambiguously:

- **US31:** clears what is stored on this phone. The account and cloud history stay.
- **US33:** deletes everything, everywhere, and cannot be undone.

One judgement call I have made: clearing local data wipes preferences, pools, saved history, XP and avatar, but **leaves the dark or light theme setting alone**. Resetting someone's appearance is a jarring side effect and it is not personal data. If either of you disagrees, say so and I will change it.

## For new people

No difference at sign up. The difference is that the promise is now real and demonstrable, which is worth having in front of the panel rather than described.

## What this needs from you

- **Tracy:** the US34 wording should match the split above, so the notices and the buttons cannot contradict each other.
- **Bikash:** clearing local data empties the fuel and focus pool tables. I am using your existing `clearFuelPool` and `clearFocusPool` rather than writing my own delete, so if you change how those work, this follows automatically. Tell me if that assumption stops being safe.

Recorded as decision D-011 if you want the longer version.
