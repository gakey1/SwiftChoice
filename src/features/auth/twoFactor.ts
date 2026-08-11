// One rule, in one place: a password change invalidates the second factor on
// this device. Friction rather than a lockout, since re-enrolment mints a fresh
// secret and needs nothing from the old one.

// Reads and clears the stored TOTP secret.
import { clearTotpSecret, isTotpEnrolled } from "@/services/localdb/totpStorage";
// The flag ForgotPasswordScreen sets when a reset link goes out.
import {
  clearPasswordResetRequested,
  wasPasswordResetRequested,
} from "@/services/localdb/passwordResetFlag";

// Runs once per sign-in, before the app decides whether to ask for a code. The
// secret and the password vouch for the same person, so a replaced password
// leaves no way to tell the holder is still that person.
//
// Returns true only when an enrolment was actually removed, so a user who never
// had 2FA on is not shown a notice about a feature they had not used.
export async function consumePasswordResetInvalidation(): Promise<boolean> {
  if (!(await wasPasswordResetRequested())) return false;

  const wasEnrolled = await isTotpEnrolled();
  if (wasEnrolled) {
    await clearTotpSecret();
  }

  // Cleared whether or not an enrolment existed, so one reset acts once. Leaving
  // the flag set would re-trigger on every later sign-in and wipe an enrolment
  // the user had since created.
  await clearPasswordResetRequested();

  return wasEnrolled;
}
