# Running SwiftChoice from this submission

These steps explain how to run SwiftChoice from the submitted zip file on either
the iOS Simulator or an Android emulator. If the required tools are already
installed, it should take about ten minutes to get started.

## What you need

Before running the app, make sure you have:

- Node.js 22, or any version from 20.19.4 upwards. Using nvm or another version
  manager can make this easier.
- For iOS: a Mac with Xcode installed, including the Command Line Tools. If
  needed, run `xcode-select --install`.
- For Android: Android Studio with at least one emulator, also called an AVD,
  already created.

## Unzip and open the project folder

Unzip the submitted file, then open a terminal in the project folder.

Run:

```
cd SwiftChoice
```

## Install the dependencies

Run:

```
npm install
```

The first install may take a few minutes.

## Check the configuration

The app reads its settings from a file called `.env` in the project root. This
file is already included in the project folder, with the values filled in, so
there should be nothing else to configure.

It holds the Firebase connection, the Google Places key that Fuel uses to find
real places nearby, and the address of the tie-breaker service that Priority
uses. If `.env` is missing, the app stops at startup with a message saying so.

## Start the app

Run:

```
npx expo start
```

A menu will appear in the terminal.

Press:

- `i` to open the app in the iOS Simulator. This requires a Mac with Xcode.
- `a` to open the app in an Android emulator. The emulator needs to be set up in
  Android Studio first.

The first launch may take around 30 to 60 seconds while the simulator or
emulator starts and the app installs. After that, it should be quicker.

Press `r` to reload the app, and press Ctrl + C to stop the development server.

## Signing in

The app opens on the login screen. To access the main app, create an account
using a real email address that you can open.

Tap **Create account**, then register with your email address and a password of
at least 8 characters.

The app will send a verification link to that address and keep you on the
**Confirm your email** screen. Open your inbox, click the verification link,
then return to the app and tap **I have verified**. You should then be signed
in.

The verification email may take a minute or two to arrive, and it may go to the
spam or junk folder. If it does not appear straight away, check spam or junk, or
use the **Resend link** button in the app.

## Allowing location

Fuel and Focus both ask for location the first time you use them. Fuel uses it
to find real places near you, and Focus uses it to check the weather on the way
to a study spot.

Allow it when the phone asks. If you decline, Fuel will ask you to type an area
instead, and Focus will simply not show the weather line.

An emulator has no location of its own until you give it one. On the iOS
Simulator, use **Features, Location, Apple** or **Custom Location**. On Android,
open Google Maps on the emulator and tap the my-location button first, then set
a position from the emulator's own location controls. Setting a position while
the emulator's GPS is not running has no effect.

## What you should see

After signing in, you should land on the Home screen with three module cards.

- **Fuel.** Choose Eat In or Eat Out, set the budget, prep time and distance,
  then tap **Decide for Me** for one recommendation. You get one reroll. Tap
  **Accept** and the decision is saved.
- **Focus.** Choose your energy level and the sort of place you want, then get
  one study spot, with a line about the weather where you are.
- **Priority.** Add a few tasks with an urgency and an importance, then tap
  **Rank my tasks**. The order is worked out from those two values. When two
  tasks score exactly the same, the app asks a tie-breaker service to choose
  between them and explain why. Everything else is decided on the phone.

Open the **History** tab to confirm an accepted decision has been saved, and to
see the weekly summary, the activity chart and the badges.

**Settings** has the dark and light themes, two-factor authentication, the data
and privacy screen, clearing the data held on the phone, and deleting the
account.

## Two-factor authentication

This is optional and off by default. Turning it on, from **Settings, Security**,
asks for a six-digit code the next time you sign in.

It is a same-device measure rather than account-level two-factor
authentication: the key is stored in this phone's keychain and nowhere else, so
signing in on a different device is not challenged.

On a development build, the setup screen and the sign-in screen both show the
current code on screen, so the feature can be demonstrated without a second
device. A release build does not show it.

## Checks you can run

```
npm test          # 497 tests across 51 suites
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript
```

## If the app will not start

**"Node.js is outdated".** Install Node 22 and try again:

```
nvm install 22
nvm alias default 22
```

Then open a new terminal and run the app again.

**"No Android emulator found".** Open Android Studio and start an emulator
first. Alternatively, use the iOS Simulator by pressing `i` if you are on a Mac.

**"Missing Firebase config".** The `.env` file is not being read. Check it is in
the project root, next to `package.json`, and restart with `npx expo start -c`.

**A change does not appear, or the app behaves oddly after one.** Clear the
bundler cache with `npx expo start -c`.

**"We could not get your location".** The simulator or emulator has no position
set. See **Allowing location** above.

For anything else, see the Troubleshooting section in `README.md`.
