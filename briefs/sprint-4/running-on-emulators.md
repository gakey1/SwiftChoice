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

## 4. Android: Eat Out suggests restaurants in California

**What it looks like:** Eat Out works, returns real places with real ratings, and every one of them is thousands of kilometres away. Search the names and they are American.

**What it actually is:** the Android emulator's default location is Google's head office in Mountain View, California, and it reports that as a real GPS fix rather than as no fix. The app asks the device where it is, believes the answer, and searches there. Nothing in our code is wrong. It did exactly what it was told by a device that lied.

**The fix: set it to where you actually are.** Not to Melbourne, and not to wherever the last person set it.

First get your own coordinates. Open Google Maps, right-click your suburb, and the first item in the menu is the latitude and longitude. It gives them as `latitude, longitude`, in that order, which matters below.

**Android:**

```
adb emu geo fix <longitude> <latitude>
```

**Longitude comes first**, the reverse of how Google Maps gives them to you and the reverse of the iOS command. This is the single easiest thing to get wrong here. Reversed, you land in the ocean, get no results at all, and it looks like a completely different fault. For Melbourne CBD it would be `adb emu geo fix 144.9631 -37.8136`.

You can also use the emulator's Extended Controls, the three dots on the side toolbar, then Location.

**iOS:**

```
xcrun simctl location booted set <latitude>,<longitude>
```

Latitude first, comma, no space. So the same place is `-37.8136,144.9631` here and `144.9631 -37.8136` on Android. Or use the menu: Features, Location, Custom Location. If it is set to None the app asks you to type an area instead, which is correct behaviour and not a bug.

**Why to use your own suburb rather than a shared default.** We had a real fault where the app quietly fell back to Melbourne for everybody, which is fine for two of us and wrong for the third. Testing from your own location is how that gets caught. It is also the only way the distances on the cards mean anything to you: if the phone says a place is 400 metres away, you can tell whether that is true.

**Two traps once it is set.**

A simulated position can be reused for up to five minutes, because the app takes a recent cached fix rather than making you wait for a fresh one. So changing the location and searching immediately can still search the old place. Wait a moment or restart the app before concluding anything is broken.

And a cold boot resets Android back to California. If results go American mid-session, set it again rather than assuming the app broke.

**An emulator can never actually prove this feature.** It has no GPS. It reports the numbers you gave it, so every distance shown is correct arithmetic on a starting point somebody typed. Whether the app works can only be settled on a real phone, outdoors, checking a distance against somewhere you know. If any of you has an Android phone rather than an emulator, say so.

## 5. Metro: "Port 8081 is running this app in another window"

**What it looks like:** you start the app and it tells you 8081 is busy, then runs on 8082 instead. Everything seems fine. Later the Android emulator loads the app but shows stale behaviour, or just spins forever.

**What it actually is:** an old dev server from a previous session never shut down and is still holding 8081. This bit me with one that had been running for four days.

It matters more than a port number suggests. `adb reverse tcp:8081 tcp:8081` points the emulator at **host port 8081**, so the emulator connects to the old server and loads old code, while you sit watching the new one on 8082 and wonder why your changes are not there.

**How to check:**

```
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

**The fix:** kill whatever it lists, then start one server, then redo the port forward.

```
kill <the PID>
npx expo start --clear
adb reverse tcp:8081 tcp:8081
```

Closing the terminal window is not enough on its own. The process survives it.

## Telling them apart

| Symptom | Which one |
|---------|-----------|
| Expo Go error screen, app never appears | 2, port forwarding |
| App appears, login fails with a network error | 1, emulator has no internet |
| Expo Go will not install at all | 3, iOS version |
| Results are real but in the wrong country | 4, emulator location |
| Your changes do not show up, or the app spins | 5, a stale server on 8081 |

The rows that catch people are the second and the last, because in both cases the app looks like it is working and the fault looks like it is in our code.

## We do not target web, so do not test it

Worth stating plainly, because the dev server offers it and it looks like it should work.

Press `w` and the bundle succeeds, then the page spins forever and never loads. That is expected. `expo-sqlite` and `expo-secure-store` have no working web build here, so the app never gets through startup. The same thing makes `npx expo export --platform all` fail on the web bundle.

Our proposal commits us to iOS and Android. Web was never in scope, there is no story for it, and nothing we hand in depends on it. **Please do not spend time chasing it.** If you need a bundle, export one platform at a time:

```
npx expo export --platform ios
npx expo export --platform android
```

Both are clean on main. Two warnings about `shadow*` and `textShadow*` style props also come from web only, and can be ignored for the same reason.
