// The one place the app asks the phone where it is. Everything else calls
// getCurrentPosition() and never imports expo-location directly, the same
// wrapper-module pattern as localdb and historyStorage, so the permission dance
// and the "it might fail" handling live in one spot.
//
// This is US17 step 1: the free, no-key, no-card half of live discovery. It only
// reports the position; taking that position and asking "what restaurants are
// near here" is the later, paid-service step behind the recommendation engine's
// place seam.

import * as Location from "expo-location";

// A tagged result rather than a bare {lat,lng} or a thrown error: callers branch
// on `ok` and always have a reason when it fails, so a screen can show "we could
// not get your location" instead of hanging or crashing.
export type LocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: LocationFailure };

// Why a lookup did not return a position:
// - "denied": the user did not grant location permission.
// - "unavailable": permission was granted but no fix came back (GPS off, indoors,
//   a simulator with no location set, or any error reading the sensor).
export type LocationFailure = "denied" | "unavailable";

// How old a cached position may be and still be used. Five minutes is well
// inside the distance that matters for "somewhere to eat nearby", and taking a
// cached fix is the difference between an instant answer and a wait.
const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

// How long to wait for a fresh fix before giving up and letting the screen ask
// where the user is.
//
// The number matters more than it looks. Without a cap, getCurrentPositionAsync
// waits as long as the operating system takes, which indoors or on an emulator
// with no fix set is tens of seconds or never. During that the screen shows
// nothing at all, so the app reads as frozen rather than busy, and the person
// gives up before the fallback they needed ever appears. Five seconds is longer
// than a good fix takes and shorter than a person will sit staring at nothing.
const FRESH_FIX_TIMEOUT_MS = 5000;

// Rejects if the wrapped promise has not settled in time. The timer is always
// cleared, so a slow fix arriving later cannot leave a handle behind.
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("location timed out")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Asks for foreground location permission (prompts only the first time), then
// reads the position: a recent cached one if there is one, otherwise a fresh
// fix with a time limit. Never throws: every failure path returns an ok:false
// result so callers handle one shape.
export async function getCurrentPosition(): Promise<LocationResult> {
  let granted = false;
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    granted = permission.granted;
  } catch {
    // Treat a permission-request failure as a denial: we have no position and no
    // consent to read one.
    return { ok: false, reason: "denied" };
  }

  if (!granted) {
    return { ok: false, reason: "denied" };
  }

  // A recent cached fix first, because it comes back immediately and the phone
  // usually has one. Wrapped in its own try so a failure here only costs the
  // shortcut, not the whole lookup.
  try {
    const cached = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
    });
    if (cached) {
      return {
        ok: true,
        latitude: cached.coords.latitude,
        longitude: cached.coords.longitude,
      };
    }
  } catch {
    // No usable cache. Fall through to the fresh lookup below.
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      FRESH_FIX_TIMEOUT_MS
    );
    return {
      ok: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    // Granted but no fix in time: sensor off, indoors, or an unset simulator
    // location. Reported the same way whether it failed or ran out of time,
    // because the screen does the same thing either way, which is to ask.
    return { ok: false, reason: "unavailable" };
  }
}
