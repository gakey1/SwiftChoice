// Keeps the TOTP secret in the device keychain. This is the first real consumer
// of secureStorage.ts, and it is the right home for it: the secret is the whole
// of the second factor, so anyone who can read it can produce valid codes. It
// must never go in AsyncStorage next to the theme choice, and it must never be
// mirrored to Firestore, where the user (and therefore anyone holding their
// password) could read it back.
//
// Being in the keychain is also what makes this factor same-device only, per
// D-012. There is no copy anywhere else, so a fresh phone has nothing to be
// challenged against. That is a known and accepted limit, not an oversight.

import { clearItem, getItem, setItem } from "@/services/localdb/secureStorage";

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
// password-change path in D-012, which invalidates the enrolment so a stale
// secret cannot outlive the credentials it was set up alongside.
export async function clearTotpSecret(): Promise<void> {
  await clearItem(TOTP_SECRET_KEY);
}

// Whether this device is enrolled. The sign-in gate reads this to decide
// whether to ask for a code at all.
export async function isTotpEnrolled(): Promise<boolean> {
  return (await getTotpSecret()) !== null;
}
