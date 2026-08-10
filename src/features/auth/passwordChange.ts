// Changing your password from inside the app, for a signed-in user.
//
// Two rules live here rather than on the screen, so a caller cannot skip
// either: the current password is checked first, and a successful change
// invalidates the second factor on this device (D-012).

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

  // Firebase requires a recent login for an update anyway, but only at the
  // moment of the update. Asking up front means somebody who walked away from
  // an unlocked phone does not come back to a password they no longer know.
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

  // D-012, applied here and immediately rather than through the reset flag: the
  // user stays signed in, so there is no next sign-in to catch it.
  //
  // Only after the password is definitely changed. Clearing first would drop
  // somebody's second factor for a change that then failed.
  const wasEnrolled = await isTotpEnrolled();
  if (wasEnrolled) {
    await clearTotpSecret();
  }

  return { ok: true, twoFactorWasReset: wasEnrolled };
}
