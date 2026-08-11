// Keeps the TOTP secret in the device keychain. The secret is the whole of the
// second factor, so keychain-only is also what makes this factor same-device:
// a fresh phone has nothing to be challenged against.

// The keychain wrapper, so this file never names the platform store directly.
import { clearItem, getItem, setItem } from "@/services/localdb/secureStorage";

// Never AsyncStorage, and never mirrored to Firestore, where the user and
// anyone holding their password could read it back and produce valid codes.
const TOTP_SECRET_KEY = "swiftchoice.totpSecret";

// Saves the secret, which enrols this device.
export async function saveTotpSecret(secretBase32: string): Promise<void> {
  await setItem(TOTP_SECRET_KEY, secretBase32);
}

// Reads the secret back, or null if this device has never enrolled.
export async function getTotpSecret(): Promise<string | null> {
  return getItem(TOTP_SECRET_KEY);
}

// Removes the enrolment. Called when the user turns 2FA off, and by the
// password-change path, which invalidates the enrolment so a stale secret
// cannot outlive the credentials it was set up alongside.
export async function clearTotpSecret(): Promise<void> {
  await clearItem(TOTP_SECRET_KEY);
}

// Whether this device is enrolled. The sign-in gate reads this to decide
// whether to ask for a code at all.
export async function isTotpEnrolled(): Promise<boolean> {
  return (await getTotpSecret()) !== null;
}
