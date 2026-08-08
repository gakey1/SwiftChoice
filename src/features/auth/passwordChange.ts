// Changing your password from inside the app.
//
// The app already had two of the three: registration sets a password, and the
// forgot-password link resets one for somebody locked out. It had no way for a
// signed-in person to simply change theirs, which meant the only route was to
// log out and pretend to have forgotten it.
//
// Two rules live here rather than on the screen, so neither can be skipped by a
// caller.
//
// First, the current password is checked before the new one is set. Firebase
// insists on a recent login for this anyway, but only at the moment of the
// update; asking first means somebody who walked away from an unlocked phone
// does not come back to a password they no longer know.
//
// Second, D-012: a password change invalidates the second factor on this device.
// The secret and the password vouch for the same person, so once the password is
// replaced the app cannot tell whether the person who replaced it is the one who
// enrolled. Wiping the enrolment does not stop a determined attacker, who would
// enrol their own authenticator; it guarantees the real owner is asked to set it
// up again and therefore finds out something happened. That is done here and
// immediately, rather than through the reset flag, because the user stays signed
// in and there is no next sign-in to catch it.

import { changePasswordErrorMessage } from "@/features/auth/errorMessages";
import { reauthenticate, updateCurrentPassword } from "@/services/auth";
import { clearTotpSecret, isTotpEnrolled } from "@/services/localdb/totpStorage";

export type ChangePasswordResult =
  | {
      ok: true;
      // Whether a two-factor enrolment was removed by this change. The screen
      // says so only when it is true, since telling somebody their authenticator
      // was reset when they never had one is confusing rather than reassuring.
      twoFactorWasReset: boolean;
    }
  | { ok: false; message: string; field: "current" | "next" | "form" };

// Changes the password. The new one is assumed to have passed validatePassword
// on the screen already; this guards only the things the screen cannot know.
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  // Caught here rather than left to Firebase, which accepts it happily. Setting
  // a password to itself reports success and silently resets the second factor,
  // which is a confusing outcome for what the user experiences as doing nothing.
  if (currentPassword === newPassword) {
    return {
      ok: false,
      field: "next",
      message: "That is your current password. Choose a different one.",
    };
  }

  try {
    await reauthenticate(currentPassword);
  } catch (error) {
    return { ok: false, field: "current", message: changePasswordErrorMessage(error) };
  }

  try {
    await updateCurrentPassword(newPassword);
  } catch (error) {
    // Nothing has changed at this point, so the old password still works. Said
    // on the screen, because a failure here would otherwise leave somebody
    // unsure which of the two passwords is now live.
    return { ok: false, field: "form", message: changePasswordErrorMessage(error) };
  }

  // Only after the password is definitely changed. Clearing first would drop
  // somebody's second factor for a change that then failed.
  const wasEnrolled = await isTotpEnrolled();
  if (wasEnrolled) {
    await clearTotpSecret();
  }

  return { ok: true, twoFactorWasReset: wasEnrolled };
}
