// Records that a password reset was requested from this phone, so the next
// sign-in can invalidate the TOTP enrolment. The reset finishes in the browser,
// which Firebase gives the app no way to detect afterwards.

// The ordinary on-device store, not the keychain. See the key below.
import AsyncStorage from "@react-native-async-storage/async-storage";

// AsyncStorage, not the keychain: this is an ordinary flag, and setting it
// costs an attacker nothing but a re-enrolment prompt.
const RESET_REQUESTED_KEY = "swiftchoice.passwordResetRequested";

// Called when the user asks for a reset link, the only moment the app is
// present for the reset at all. A reset started on another device leaves no
// mark here, which matches a factor that is same-device only to begin with.
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
