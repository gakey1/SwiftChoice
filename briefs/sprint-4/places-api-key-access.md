# Getting the Google Places key so Eat Out works on your machine

I have added you both to the Google Cloud project that holds the Places key, so you can fetch it yourselves rather than me sending it to you. You should each have an email from Google. If you have not, tell me which address you use for the Cloud console, because I may have the wrong one.

You need this to run Eat Out. Without the key that screen shows "no matches found" whatever you search, which looks exactly like a broken feature and is not one.

## Two different Google projects, do not mix them up

This trips people up, so it is worth ten seconds now.

| Project | What is in it | Where its values come from |
|---------|---------------|----------------------------|
| `swiftchoice-f15ca` | Firebase: auth, Firestore | Firebase console, the `EXPO_PUBLIC_FIREBASE_*` values, already in the README |
| `swiftchoice-places` | The Google Places key, nothing else | Google Cloud console, the one variable below |

They are separate on purpose. Places runs on a free trial with a credit attached, and keeping it away from Firebase means Firebase stays on the free plan no matter what happens to the trial.

The steps below are all in `swiftchoice-places`. If the project picker says anything else, you are in the wrong place.

## Getting the key

1. Open `https://console.cloud.google.com` signed in as the account I added.
2. Project picker at the top, choose **swiftchoice-places**.
3. **APIs and Services**, then **Credentials**.
4. Click the key in the API Keys list.
5. **Show key**, and copy it.

If Show key is missing or greyed out, stop and tell me. It means the access level I set is not enough and that is mine to fix, not something to work around.

## Putting it in your .env

Same file you already have the Firebase values in, at the project root. Add this one line:

```
EXPO_PUBLIC_GOOGLE_PLACES_KEY=paste_the_key_here
```

No quotes, no spaces around the `=`.

**Restart Metro fully afterwards.** Stop it and run `npx expo start` again. Environment variables are read once at startup, so a reload leaves the app running with the old empty value and it will look like the key did not work.

## Keeping the key off GitHub

This is the one part of this brief I would ask you to read properly rather than skim.

`.env` is gitignored. `.env.example` is committed. The key goes in the first and never the second, even though the second is where the variable name is written down.

**Why it matters more than it looks.** The key is not confidential in the usual sense. It is compiled into the app bundle, so anyone who installs the app could pull it out, and hiding it was never the plan. What is different about a code host is that nobody has to go looking. Google runs scanners over public repositories specifically for leaked keys, and a key it finds can be disabled without warning. Abuse bots scrape the same places for the same reason.

So the risk is not somebody quietly running up a bill. It is **Eat Out going dead for all three of us, at a time we do not choose**, and the failure looking like an app bug rather than a disabled credential.

It is also close to permanent. Git keeps history, so a key committed once and deleted in the next commit is still there in the history, and clearing it properly means rewriting history on a repository we all have clones of. Rotating the key and telling everyone is the easier half of that job.

Three habits that cover it:

- Check `git status` before you commit and confirm `.env` is not listed. It should never appear, because it is ignored, but a `git add -f` or a fresh clone with a changed ignore file can undo that.
- Never paste the key into anything that syncs or gets shared. Not the README, not a commit message, not a screenshot of your terminal, not a code snippet in a chat or a doc that gets handed in.
- Get it from the console each time rather than keeping copies. That is the whole reason you both have console access now.

If a key ever does end up somewhere it should not, tell me straight away and do not try to quietly undo it. Rotating a key takes me about two minutes. Finding out from Google that it has been disabled mid-demo does not.

## Checking it works

1. Open the app, sign in, tap **Fuel**.
2. Pick any filters and tap **Decide for Me**.
3. You should get a real nearby place with a real name, rating and distance.

If it asks you to type an area first, that is correct behaviour, not a fault. The app used to fall back to Melbourne when it could not read your location, which was wrong for anyone outside Melbourne, so it asks instead of guessing.

**Still seeing "no matches found"?** In order: check the key is in `.env` and not `.env.example`, check you restarted Metro rather than reloading, then check the emulator has internet at all (`adb shell ping -c 2 8.8.8.8` on Android, see `running-on-emulators.md`). Nine times in ten it is the restart.

## What Viewer gives you, and why that is the level

You can read everything in the project and change nothing in it. Worth being specific, because "viewer" sounds more limiting than it is here.

**What you can do:**

| | |
|---|---|
| Read the API key value | Yes, which is the whole point |
| Run Eat Out locally, with live results | Yes |
| See usage figures and how much trial credit is left | Yes |
| See which APIs are enabled and how the key is restricted | Yes |
| Write app code that calls Places, including new calls | Yes, that is all in the repo and nothing to do with Cloud roles |

**What you cannot do:** create, delete or regenerate keys, change the key's restrictions, enable or disable APIs, or change anything about billing.

**Why that is the right level rather than caution for its own sake.** Nothing in either of your slices needs write access to Cloud. Bikash, the pools and data layer never touch it. Tracy, the module screens call our own code in `googlePlaces.ts`, not the console. The only thing either of you needs from Cloud is to read one string, and Viewer does exactly that. So read-only costs you no capability you would have used.

What it does remove is a class of accident with an expensive failure mode. The trial is one shared pot of credit with a fixed expiry, and it has to last past the panel. Write access would allow enabling another billable API, deleting or regenerating the key, or removing the Places-only restriction that stops a leaked key being spent on anything else. None of those needs doing on purpose, and all three are the sort of thing that happens while tidying. If the key gets regenerated, Eat Out breaks on all three machines at once and the only symptom is "no matches found", which is exactly what a broken feature looks like. We would lose a day to it.

**This does not slow the project down.** All the work left in Sprint 4 is application code, and application code is not gated on Cloud roles at all. If something genuinely does need changing in the console, ask me and it takes about two minutes, or I will promote you for the task and drop it back after. The one thing the friction buys is a conversation before anything billable gets switched on, and given the credit is finite and dated, that conversation is worth having.

**Being explicit, since a read-only role can read as distrust:** it is not. If I were worried about either of you I would not have added you at all. This is the same reasoning as branch protection on `main`, which applies to me too, and for the same reason: the cost of the accident is high and the cost of preventing it is nearly zero.

## What I have not changed

Nothing in the app, and nothing in either of your slices. The key handling, `googlePlaces.ts`, and the Fuel flow are all exactly as they were when Eat Out went live. This is purely you getting access to a value that already existed.
