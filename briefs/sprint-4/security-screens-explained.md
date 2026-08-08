# The security screens, and why they look the way they do

Tracy asked three good questions about Settings and the two-factor screens. Answering all three here so we have one place to point at, and so the panel answers match what the app actually does.

## 1. Why we have "Clear data on this phone"

Short answer: because most of what SwiftChoice knows about a person never leaves their phone, so deleting the account in the cloud would not reach it.

| What | Where it is stored | Would a cloud-side delete reach it? |
|---|---|---|
| Preferences | This phone only, never synced | No |
| Fuel and Focus pools | This phone only | No |
| Progress and avatar | This phone only | No |
| Accepted decisions | This phone **and** the cloud | The cloud copy only |

That split is the privacy story, not an accident. The cost of keeping data on the phone is that we have to give people a way to clear it from the phone.

On whether it is normal: it is. Android has a per-app "Clear storage" in system Settings, and browsers, Spotify, Signal and most banking apps all ship one. iOS has no equivalent, so on iPhone an in-app button is the only way to do it short of deleting the app.

It is also US31, a Must-have in our backlog, and it is deliberately built as the on-device half of US33 (delete account). US33 is this, plus the cloud copies, plus signing out. One list instead of two that drift apart.

The wording is scoped on purpose. The button says "Clear data on this phone" and the copy says the account stays and history already saved to the account is untouched. We do not claim to delete more than we delete.

## 2. The six-digit code shown on screen

There are two screens showing a code, and they are not the same.

| Screen | Shows the code | Why |
|---|---|---|
| **Setup** (Settings, turning 2FA on) | Always | You are signed in and already holding the key you just made. Seeing a code from it tells you nothing new, and the countdown is the clearest way to show codes rotate |
| **Sign-in challenge** | Development only | Here the code is the answer written on the gate. Anyone reaching that screen could read it instead of producing it |

Now the part that matters for the presentation, because I got this wrong when Tracy first asked. "Development only" does not mean "hidden once we are on a real phone". It means the app was built as a development bundle.

| How the app is started | Is the code shown on the sign-in screen? |
|---|---|
| `npx expo start`, emulator or simulator | Yes |
| `npx expo start`, Expo Go on a real phone | Yes |
| A marker running our zip | Yes |
| A production build, or a Play Store download | No |

We have never made a production build. There is no `eas.json` in the repo. So today the code always shows, including at the panel if we demo the way we normally run the app.

That is fine for marking, where a marker needs to reach the feature without a second phone. It is not fine as an unexplained thing on screen during the demo. I would rather we control it than hope nobody looks.

## 3. The long key, the QR square, and why we have both

Tracy is right that the key is long and awkward, and she is right about the reason it exists: a phone camera cannot scan the screen it is attached to. QR works when the authenticator is on a second phone, on an emulator setup like ours, or when the square is printed on paper. That single-device problem is genuinely why manual-entry keys exist across the whole industry, and Google, GitHub and AWS all offer one under some version of "can't scan? enter this key manually".

Two things worth adding to that.

**The key is not an alternative to the QR. It is the same secret in a different format.** The square encodes an `otpauth://` link that contains that exact key. Neither one is more secret than the other. So yes, it is confidential, and anyone holding it can generate valid codes forever. It is shown on purpose, once, during enrolment, to somebody who is already signed in and who just created it.

**Our real answer to the same-phone problem is the button, not the key.** "Open in your authenticator app" hands the whole enrolment over in one tap, no camera and no typing. It shipped in `3301e7f` and none of us noticed it, which is a layout problem rather than a missing feature.

| Option | Use it when |
|---|---|
| **"Open in your authenticator app"** | Your authenticator is on the same phone. One tap |
| **QR square** | Your authenticator is on a second phone, or the square is printed |
| **The key** | Everything else, including no camera or camera permission denied |

### What the button actually does

It does not open a named app. It hands an `otpauth://` link to the phone, the same way a `mailto:` link works, and the operating system finds whichever app claims that link. That means we cannot choose the authenticator, and we should not try to.

| | Two or more authenticators installed | Exactly one | None installed |
|---|---|---|---|
| **Android** | Shows an "Open with" chooser, the user picks | Opens it directly | We show "No authenticator app answered", pointing at the other two options |
| **iOS** | No chooser. iOS picks one, and we cannot see or influence which | Opens it directly | Same fallback message |

An authenticator does have to be installed first. The button cannot install one.

### The iOS finding

On the iOS simulator the button opened Apple's built-in **Passwords** app, which handles verification codes and claims `otpauth://`. If that holds on real hardware, an iPhone user with no third-party authenticator still has a working handler out of the box, which is a good beat for the demo. **I am not saying this at the panel until one of us has seen it on a real iPhone.** It is on the manual test checklist.

## What I am changing, and what I am not

| | |
|---|---|
| **Changed** | The two paragraphs above Step 1 cut down to three sentences. They read as a disclaimer and buried the three options underneath them. The same-device scope is still stated, because we do not get to drop that |
| **Changing** | Reordering Step 1 to one-tap first, QR second, key third, with "or" between them so they read as three doors rather than one door with footnotes |
| **Changing** | A switch controlling the on-screen six-digit code, so we can turn it off for the panel run regardless of how we launch the app |
| **Not changing** | The QR, the key, the enrolment logic, the pools, the module screens |
| **Already on `main`** | All three enrolment paths, and the scoped wording on the Clear data button |
| **Yours** | No code needed from either of you |

## Three things I need

**Either of you with an iPhone:** turn 2FA on in Settings, tap "Open in your authenticator app", and tell me what opens. I want to know whether Passwords catches it on real hardware before we lean on it in the demo.

**Tracy:** decide how we demo the 2FA. On a real phone with Google Authenticator, using the one-tap button, is the convincing version and we can switch the on-screen code off. On an emulator we need the code on screen. I need the answer before I set the switch's default.

**Both:** when we describe this at the panel, it is a same-device step-up factor, not account-level two-factor authentication. The key lives in this phone's keychain and nowhere else, so signing in on a different phone is not challenged. If one of us says "we have 2FA" and the panel asks about a second device, that gets awkward. This is written up in `docs/decisions.md` D-012.
