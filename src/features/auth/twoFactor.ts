// The D-012 policy in one place: a password change invalidates the second
// factor on this device.
//
// Why invalidate at all. The secret and the password are set up together and
// vouch for the same person. If the password is replaced, the app has no way to
// know whether the person who replaced it is the person who enrolled, so keeping
// the old secret alive would mean a factor that outlives the credential it was
// paired with. Wiping it does not stop a determined attacker, who would simply
// enrol their own authenticator; what it does is guarantee the real owner finds
// out something happened, because they are asked to set it up again.
//
// This is friction, not a lockout. Re-enrolment mints a fresh secret, so nothing
// from the old one is needed and somebody who reset their password because they
// lost the phone can install an authenticator on the new one and carry on.

import { clearTotpSecret, isTotpEnrolled } from "@/services/localdb/totpStorage";
import {
  clearPasswordResetRequested,
  wasPasswordResetRequested,
} from "@/services/localdb/passwordResetFlag";

// Runs once per sign-in, before the app decides whether to ask for a code.
//
// Returns true only when an enrolment was actually removed, so the caller can
// explain why the user is being asked to set up again. Returning true for a
// reset by somebody who never had 2FA on would produce a confusing notice about
// a feature they had not used.
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
