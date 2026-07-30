# Running the app on emulators: three things that will waste your afternoon

I hit all three of these getting the app onto an iOS simulator and an Android emulator. None of them is a bug in our code, and all three look like one, which is what makes them worth writing down.

Keeping this here rather than in the README until we have all run into it and agree on the wording.

## 1. Android: the app loads but every login fails

**What it looks like:** the app opens fine, you get the login screen, you type your details and get "network error, check your connection". It reads like a Firebase problem or a broken build.

**What it actually is:** the emulator has no internet at all. The app still loaded because the dev server reaches it over the USB bridge rather than the network, so Metro works while every real request has nowhere to go.

**How to check**, from a terminal:

```
adb shell ping -c 2 8.8.8.8
```

If that says "Network is unreachable", the emulator is the problem, not the app.

**The fix**, a cold boot with explicit DNS:

```
emulator -avd Pixel_7a -dns-server 8.8.8.8,8.8.4.4 -no-snapshot
```

`-no-snapshot` is the important part. The emulator saves its state when you close it, so an ordinary restart just restores the broken network again. That is why turning it off and on does not help.

## 2. Android: Expo Go shows an error screen instead of the app

**What it looks like:** Expo Go opens and goes straight to "Sorry about that. You can go back to Expo home or try to reload the project."

**What it actually is:** the emulator cannot reach the dev server on your laptop's network address.

**The fix:**

```
adb reverse tcp:8081 tcp:8081
```

Then reopen the project. You have to run this **again after every emulator restart**; it does not stick.

## 3. iOS: Expo Go refuses to install

**What it looks like:** `npx expo start --ios` fails with "Unable to install host.exp.Exponent. This application requires a newer version of iOS."

**What it actually is:** the simulator that opens by default may be an old one. Mine defaulted to an iPhone 13 Pro on **iOS 15.2**, and Expo Go for SDK 56 will not install on it.

**The fix:** pick a simulator on a recent iOS. To see what you have:

```
xcrun simctl list devices available
```

Boot one under iOS 18 or newer, for example an iPhone 16 Pro, before starting Expo. Worth setting that as your default so you do not hit it twice.

## Telling the three apart

| Symptom | Which one |
|---------|-----------|
| Expo Go error screen, app never appears | 2, port forwarding |
| App appears, login fails with a network error | 1, emulator has no internet |
| Expo Go will not install at all | 3, iOS version |

The one that catches people is the second row, because a working app with failing requests looks exactly like a bug in the code.

## One that is not a problem

`npx expo export --platform all` fails on the web bundle, because `expo-sqlite` needs a wasm file that is not there. We do not target web, so ignore it. Export one platform at a time if you need a bundle:

```
npx expo export --platform ios
npx expo export --platform android
```

Both are clean on main.
