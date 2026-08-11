// Changing your password from inside the app, for a signed-in user.
//
// Two rules live here rather than on the screen, so a caller cannot skip
// either: the current password is checked first, and a successful change
// invalidates the second factor on this device.

// Turns a Firebase error code into wording for the screen.
import { changePasswordErrorMessage } from "@/features/auth/errorMessages";
// The two Firebase calls this orders: prove, then replace.
import { reauthenticate, updateCurrentPassword } from "@/services/auth";
// Reads and clears the stored TOTP secret, for the second-factor step below.
import { clearTotpSecret, isTotpEnrolled } from "@/services/localdb/totpStorage";

// Either it worked, or it failed with a message and the field to attach it to.
// A discriminated union, so the screen cannot read `message` off a success.
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

  // The second factor goes here and now, rather than through the reset flag the
  // sign-in path uses: the user stays signed in, so there is no next sign-in for
  // that flag to be read on.
  //
  // Only after the password is definitely changed. Clearing first would drop
  // somebody's second factor for a change that then failed.
  const wasEnrolled = await isTotpEnrolled();
  if (wasEnrolled) {
    await clearTotpSecret();
  }

  return { ok: true, twoFactorWasReset: wasEnrolled };
}
