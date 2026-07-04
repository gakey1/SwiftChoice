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
