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

// Asks for foreground location permission (prompts only the first time), then
// reads the current position. Never throws: every failure path returns an
// ok:false result so callers handle one shape.
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

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      ok: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    // Granted but no fix: sensor off, indoors, or an unset simulator location.
    return { ok: false, reason: "unavailable" };
  }
}
