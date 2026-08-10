// The one place the app asks the phone where it is. Everything else calls
// getCurrentPosition() and never imports expo-location, so the permission dance
// and the failure handling live in one spot (US17 step 1).

import * as Location from "expo-location";

// A tagged union rather than a bare {lat,lng} or a thrown error: callers branch
// on `ok` and always have a reason when it fails, so a screen can say "we could
// not get your location" instead of hanging or crashing.
//
// `stale` is set only when the position came from the last-resort tier below.
// It is optional so the ordinary paths keep the shape they always had. Anything
// showing distances should check it, since an hour-old position can be a suburb
// away from where the phone is now.
export type LocationResult =
  | { ok: true; latitude: number; longitude: number; stale?: true }
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

// How old a position may be and still be worth offering as a last resort, once
// a fresh reading has already failed.
//
// The five minutes above is the bar for skipping the phone entirely, and is
// deliberately tight. It is the wrong bar for the end of the chain: treating a
// six-minute-old position as none at all throws away a usable answer for "we
// could not get your location", which is the worse outcome.
//
// An hour is a bound, not a guess at how long a position stays true. Unbounded
// staleness is its own wrong answer, since a position from this morning could
// be in another city and would be confidently incorrect rather than merely old.
const STALE_MAX_AGE_MS = 60 * 60 * 1000;

// How long to wait for a fresh fix before giving up and letting the screen ask
// where the user is.
//
// Without a cap, getCurrentPositionAsync waits as long as the operating system
// takes, which indoors or on an emulator is tens of seconds or never. The screen
// shows nothing meanwhile, so the app reads as frozen and the person gives up
// before the fallback appears. Five seconds beats a good fix and beats waiting.
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
    // Granted but no fresh fix: sensor off, indoors, or an emulator, which
    // cannot answer this call at all because balanced accuracy prefers the
    // network provider and an emulator has nothing behind it.
    //
    // Before giving up, take an older position if the phone still has one. This
    // is the difference between "we could not get your location" and an answer
    // that is a few streets out, and the second is the better failure by a wide
    // margin. Tagged as stale so a caller can say so rather than presenting it
    // as the phone's current position.
    try {
      const olderFix = await Location.getLastKnownPositionAsync({
        maxAge: STALE_MAX_AGE_MS,
      });
      if (olderFix) {
        return {
          ok: true,
          latitude: olderFix.coords.latitude,
          longitude: olderFix.coords.longitude,
          stale: true,
        };
      }
    } catch {
      // Nothing readable at any age. Fall through to the honest answer.
    }

    // No position at all, at any age. Reported the same way whether the fresh
    // reading failed or ran out of time, because the screen does the same thing
    // either way, which is to ask.
    return { ok: false, reason: "unavailable" };
  }
}
