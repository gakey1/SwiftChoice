// The maths behind the six-digit codes, kept away from React and away from
// storage so it can be tested on its own.
//
// TOTP means time-based one-time password. The device and the authenticator app
// share one secret, both round the clock to a 30-second window, and both hash
// the secret together with that window number. Same secret plus same window
// gives the same six digits, so the code proves the other side holds the secret
// without the secret ever being sent anywhere.
//
// What this factor is and is not, per D-012: the secret lives in the device
// keychain, so this gates a sign-in on the phone that enrolled and nothing else.
// A sign-in from a different phone has no secret to be challenged against. It is
// a same-device step-up factor, not account-level two-factor authentication, and
// it should never be described as the latter.

import * as Crypto from "expo-crypto";
import * as OTPAuth from "otpauth";

// What an authenticator app shows next to the code.
const ISSUER = "SwiftChoice";

// The settings every mainstream authenticator app assumes. SHA1 looks like the
// weak choice and is the correct one here: RFC 6238 and every common app
// (Google Authenticator, Authy, 1Password) default to it, so moving to SHA256
// would produce codes that do not match what the user's app displays. The
// hash is not protecting a password, it is deriving a six-digit number that
// expires in 30 seconds.
const ALGORITHM = "SHA1";
const DIGITS = 6;
const PERIOD_SECONDS = 30;

// 20 bytes is the RFC 4226 recommended secret length, and what authenticator
// apps expect.
const SECRET_BYTES = 20;

// How many 30-second windows either side of now still count. One window means a
// code stays usable for about 90 seconds in total, which covers a slow typist
// and a phone whose clock is slightly out, without widening the guess space
// much.
const VALIDATION_WINDOW = 1;

// Makes a new random secret, returned as base32 because that is the form
// authenticator apps and otpauth URIs both use.
//
// The randomness comes from expo-crypto rather than from otpauth's own helper.
// otpauth reaches for globalThis.crypto.getRandomValues and throws
// "Cryptography API not available" when it is missing, which is the case on
// React Native. Node has it, so this would have passed every test and failed
// the first time a real user enrolled. Generating the bytes here means that
// path is never taken.
export function generateSecret(): string {
  const bytes = Crypto.getRandomBytes(SECRET_BYTES);
  return new OTPAuth.Secret({ buffer: bytes.buffer as ArrayBuffer }).base32;
}

// Builds the otpauth object used for both generating and checking codes.
function buildTotp(secretBase32: string, accountLabel: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: accountLabel,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

// The otpauth:// string an authenticator app reads, normally from a QR code.
// Shown as text as well, so setup works on a simulator with no camera.
export function buildOtpauthUri(secretBase32: string, accountLabel: string): string {
  return buildTotp(secretBase32, accountLabel).toString();
}

// The code that is valid right now. Used by the demo display, so 2FA can be
// shown on a simulator or from a zip without a second physical device.
export function generateCode(secretBase32: string, accountLabel: string): string {
  return buildTotp(secretBase32, accountLabel).generate();
}

// True if the typed code matches, allowing for the window above.
//
// otpauth returns the window offset on a match (0 for the current window, -1 or
// 1 for a neighbour) and null on no match. Note that 0 is a successful match and
// is falsy, so comparing against null is deliberate: a truthiness check here
// would reject every code typed inside its own 30 seconds, which is nearly all
// of them.
export function verifyCode(
  secretBase32: string,
  accountLabel: string,
  token: string
): boolean {
  const cleaned = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;

  const delta = buildTotp(secretBase32, accountLabel).validate({
    token: cleaned,
    window: VALIDATION_WINDOW,
  });
  return delta !== null;
}

// How long the current code has left, in seconds. Drives the countdown on the
// demo display so it is obvious the code rotates rather than being static.
export function secondsUntilRotation(now: Date): number {
  return PERIOD_SECONDS - (Math.floor(now.getTime() / 1000) % PERIOD_SECONDS);
}

// The secret split into blocks of four for display. A 32-character run of
// base32 is miserable to read off one screen and type into another, and losing
// your place costs you the whole thing.
//
// Safe to hand to an authenticator app as-is: RFC 4648 base32 has no meaningful
// whitespace, and every mainstream app strips it on entry. The copy button
// still copies the unspaced form, because that is what a machine wants.
export function groupSecret(secretBase32: string): string {
  return secretBase32.replace(/(.{4})/g, "$1 ").trim();
}
