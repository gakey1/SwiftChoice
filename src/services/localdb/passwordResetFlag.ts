// Records that a password reset was requested from this phone.
//
// This exists because the app cannot otherwise tell that a password changed.
// The reset itself finishes in the browser while the app is not running, and
// Firebase's client SDK exposes only creationTime and lastSignInTime on the
// user, with no password-change timestamp. Writing a marker to the Firestore
// profile is not possible either: nobody is signed in on the reset screen, so
// there is no uid and no permission to write.
//
// So the signal is captured at the only moment the app is present for it, which
// is when the user asks for the reset link. The next successful sign-in reads
// this and invalidates the TOTP enrolment (D-012).
//
// Ordinary flag, not a secret, so AsyncStorage rather than the keychain. The
// worst an attacker gains by setting it is that the user is asked to set up
// their authenticator again.
//
// Known limit, and an accepted one: a reset started somewhere else, on another
// phone or from the Firebase console, leaves no mark here. That fits the shape
// of the factor, which is same-device only to begin with (D-012).

import AsyncStorage from "@react-native-async-storage/async-storage";

const RESET_REQUESTED_KEY = "swiftchoice.passwordResetRequested";

// Called when the user asks for a reset link.
export async function markPasswordResetRequested(): Promise<void> {
  await AsyncStorage.setItem(RESET_REQUESTED_KEY, "true");
}

// Whether a reset was requested from this phone and not yet acted on.
export async function wasPasswordResetRequested(): Promise<boolean> {
  return (await AsyncStorage.getItem(RESET_REQUESTED_KEY)) === "true";
}

// Clears the flag once it has been acted on, so one reset invalidates the
// enrolment once rather than on every sign-in from then on.
export async function clearPasswordResetRequested(): Promise<void> {
  await AsyncStorage.removeItem(RESET_REQUESTED_KEY);
}
