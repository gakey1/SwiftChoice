# Running the app on emulators: the things that will waste your afternoon

I hit all of these getting the app onto an iOS simulator and an Android emulator. None of them is a bug in our code, and every one of them looks like one, which is what makes them worth writing down.

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

## 4. Android: Eat Out is in California, or cannot find you at all

Two symptoms, one cause, so they are together.

**What it looks like, the first way:** Eat Out works, returns real places with real ratings, and every one of them is thousands of kilometres away. Search the names and they are American.

**What it looks like, the second way:** Eat Out says "We could not get your location" and asks you to type a suburb, every single time, no matter how often you restart it.

**What it actually is:** the emulator has no real GPS, so its position is whatever somebody last handed it. Given a wrong one it reports that as a genuine fix, and the app believes it and searches there. Given none it reports nothing, and the app asks you to type an area, which is the correct thing for it to do. Neither is a bug in our code. The first is a device lying and the second is a device with nothing to say.

The second one is worth taking seriously as its own thing, because it looks far more like a broken app than the California version does, and the usual advice of "just set the location" does not fix it on its own. See the next two sections for why.

**The fix: set it to where you actually are.** Not to Melbourne, and not to wherever the last person set it.

First get your own coordinates. Open Google Maps, right-click your suburb, and the first item in the menu is the latitude and longitude. It gives them as `latitude, longitude`, in that order, which matters below.

**Android:**

```
adb emu geo fix <longitude> <latitude>
```

**Longitude comes first**, the reverse of how Google Maps gives them to you and the reverse of the iOS command. This is the single easiest thing to get wrong here. Reversed, you land in the ocean, get no results at all, and it looks like a completely different fault. For Melbourne CBD it would be `adb emu geo fix 144.9631 -37.8136`.

You can also use the emulator's Extended Controls, the three dots on the side toolbar, then Location.

**Read the next bit before you conclude either of those is broken**, because on its own neither reliably works.

### The command says OK and does nothing

`adb emu geo fix` prints `OK` whether or not the position ever reaches Android. **It only lands while the GPS is actually running**, and nothing on the emulator starts the GPS on its own. Our app does not start it either, because it asks for balanced accuracy, which prefers the network provider, and on an emulator that provider is empty forever. So the position you pushed sits queued, `OK` and all, and the app carries on saying it cannot find you.

You can see the difference. This is the emulator with the GPS stopped, after eighteen pushes:

```
adb shell dumpsys location | grep -E "mStarted|Number of location reports"
      mStarted=false
      Number of location reports: 0
```

**Something has to start the GPS, and Google Maps is the easiest thing that will.**

1. Open **Google Maps** on the emulator and tap its my-location button, the one at the right-hand side of the map. That starts the GPS.
2. Push your coordinates now, or set them in Extended Controls. This is when they actually arrive.
3. Check they did:

```
adb shell dumpsys location | grep "last location"
      last location=Location[gps -37.911247,145.357138 ...]
```

4. Close Maps and open SwiftChoice, **within five minutes**, for the reason in the next section.

If step 3 shows your coordinates, the app will find them. If it shows nothing, or somebody else's suburb, the app will not, and no amount of reopening it will change that.

**iOS:**

```
xcrun simctl location booted set <latitude>,<longitude>
```

Latitude first, comma, no space. So the same place is `-37.8136,144.9631` here and `144.9631 -37.8136` on Android. Or use the menu: Features, Location, Custom Location. If it is set to None the app asks you to type an area instead, which is correct behaviour and not a bug.

**Why to use your own suburb rather than a shared default.** We had a real fault where the app quietly fell back to Melbourne for everybody, which is fine for two of us and wrong for the third. Testing from your own location is how that gets caught. It is also the only way the distances on the cards mean anything to you: if the phone says a place is 400 metres away, you can tell whether that is true.

**Two traps once it is set.**

A simulated position can be reused for up to five minutes, because the app takes a recent cached fix rather than making you wait for a fresh one. So changing the location and searching immediately can still search the old place. Wait a moment or restart the app before concluding anything is broken.

**The same five minutes cuts the other way, and it is the one to watch at the panel.** Once a position is older than that the app stops trusting it and asks the phone again, which on an emulator means asking the dead network provider and getting nothing. So a location you set and then left alone for ten minutes while you talked will have expired by the time you demo Eat Out, and the screen will ask for a suburb in front of everyone. Set it immediately before that part of the demo, not at the start of the session.

And a cold boot clears it. What you get back afterwards depends on the emulator: some come up on Google's head office in California, and the Medium_Phone_API_36 image comes up with **no location at all**, which is the harder one, since the screen then says it cannot find you rather than showing you the wrong country. Either way, set it again after a cold boot rather than assuming the app broke.

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

## 6. Android: the emulator looks like it never finished starting

**What it looks like:** you start the emulator, it sits there, and five minutes later the app still has not appeared. The natural read is that the emulator has hung, so you kill it and boot it again, and it happens again.

**What it actually is:** the emulator finished booting minutes ago and is completely fine. Expo Go is open and sitting on its loading screen with nothing behind it, because there is no port forward and it has no way to reach the dev server. Trap 2 with no error screen.

This one has a specific cause worth knowing, because it tells you when to expect it. **It happens when you start the emulator after the dev server is already running.** Pressing `a` in the Metro terminal runs `adb reverse` for you as part of launching the app. Booting the emulator yourself, from Android Studio or the command line, skips that entirely, so nothing ever sets the forward up. A server that has been running since the morning and an emulator you opened just now is exactly the shape that produces it.

**Why it hangs instead of erroring.** The dev server hands the device its address as `127.0.0.1:8081`. On the emulator that is the **emulator's own** loopback, where nothing is listening, so the request has nowhere to arrive and nothing to be refused by. It waits. A spinner is all you get.

**How to check the emulator is genuinely fine**, which is the part worth having, since it stops you rebooting something that was never broken:

```
adb devices                              # want "device", not "offline"
adb shell getprop sys.boot_completed     # want 1
adb shell getprop init.svc.bootanim      # want "stopped"
```

Those three passing means Android is up and the fault is downstream of it. Then look at the forward:

```
adb reverse --list
```

Empty output is the fault.

**The fix:**

```
adb reverse tcp:8081 tcp:8081
adb shell am force-stop host.exp.exponent
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent
```

The restart matters. Setting up the forward alone does not rescue an Expo Go that is already sitting on the loading screen; it has to ask again.

To confirm it worked rather than trusting the screen:

```
adb logcat -d | grep ReactNativeJS
```

`Running "main"` means the bundle arrived and the app started.

**The habit that avoids it:** start the emulator by pressing `a` in the Metro terminal rather than booting it yourself. If you do boot it yourself, run the `adb reverse` line straight afterwards and treat it as part of starting the emulator.

## Telling them apart

| Symptom | Which one |
|---------|-----------|
| Expo Go error screen, app never appears | 2, port forwarding |
| Expo Go spins on the loading screen, no error, and the emulator looks stuck | 6, no port forward because you booted the emulator yourself |
| App appears, login fails with a network error | 1, emulator has no internet |
| Expo Go will not install at all | 3, iOS version |
| Results are real but in the wrong country | 4, emulator location |
| Eat Out always says it cannot get your location | 4, the emulator has no position at all, and `adb emu geo fix` will not give it one until the GPS is started |
| Your changes do not show up | 5, a stale server on 8081 |

The rows that catch people are the second, the third and the last. In the second the emulator takes the blame for something that is not its fault, and in the other two the app looks like it is working while the fault looks like it is in our code.

## We do not target web, so do not test it

Worth stating plainly, because the dev server offers it and it looks like it should work.

Press `w` and the bundle succeeds, then the page spins forever and never loads. That is expected. `expo-sqlite` and `expo-secure-store` have no working web build here, so the app never gets through startup. The same thing makes `npx expo export --platform all` fail on the web bundle.

Our proposal commits us to iOS and Android. Web was never in scope, there is no story for it, and nothing we hand in depends on it. **Please do not spend time chasing it.** If you need a bundle, export one platform at a time:

```
npx expo export --platform ios
npx expo export --platform android
```

Both are clean on main. Two warnings about `shadow*` and `textShadow*` style props also come from web only, and can be ignored for the same reason.
