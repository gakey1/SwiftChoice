// Turns Firebase's error codes into plain messages the user can read.
//
// Sign up messages can be specific. If someone's email is already taken the form
// has to say so, or they are stuck. Login is different (see below): every error
// becomes the same message, so no one can work out which emails are registered.

// Checks that an unknown error is really a Firebase error that has a code.
export function isFirebaseError(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}

// Picks the message to show on the sign up form for a given Firebase error.
export function registerErrorMessage(err: unknown): string {
  if (!isFirebaseError(err)) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Use a stronger password.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    default:
      return "Could not create your account. Please try again.";
  }
}

// Login always shows the same message no matter what went wrong. Telling apart
// "wrong password" from "no such account" would let someone probe which emails
// are registered, so that difference is hidden on purpose.
export function loginErrorMessage(err: unknown): string {
  if (!isFirebaseError(err)) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

// Password reset hides whether an account exists, for the same reason login
// does: a reset form answering "no account with that email" would leak through
// a second screen what the login form refuses to say.
//
// null means "show no error", so the screen shows its ordinary confirmation and
// a registered address looks identical to an unregistered one. Only faults that
// hold either way get a message, since those are the ones a user can act on.
//
// auth/invalid-email returns null too: validateEmail has already caught
// malformed addresses on the device, so repeating it here would only narrow
// down what counts as a real address.
// Deleting an account re-checks the password first (US33). This one is specific
// where login is deliberately vague, and the difference is worth spelling out.
//
// Login hides which error occurred so nobody can work out which emails are
// registered. That reasoning does not apply here: the person is already signed
// in, the app already knows their address, and they are being asked to confirm
// a password the account definitely has. Telling them plainly that it was wrong
// gives away nothing and saves them guessing on a screen where the alternative
// is abandoning something they meant to do.
export function deleteAccountErrorMessage(err: unknown): string {
  if (!isFirebaseError(err)) return "Something went wrong. Please try again.";
  switch (err.code) {
    // Recent Firebase versions report a bad password as invalid-credential
    // rather than wrong-password, so both are handled. Missing the newer code
    // would drop a wrong password into the generic message.
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "That password is not right. Try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    // Reachable even though the password is asked for up front: the session can
    // go stale between the screen opening and the button being pressed.
    case "auth/requires-recent-login":
      return "Your session is too old for this. Log out, log back in, and try again.";
    default:
      return "Could not delete your account. Please try again.";
  }
}

// Changing a password from inside the app. Specific for the same reason
// deleting an account is: the person is already signed in, so naming the failure
// reveals nothing they do not already know.
export function changePasswordErrorMessage(err: unknown): string {
  if (!isFirebaseError(err)) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "That is not your current password.";
    case "auth/weak-password":
      return "Use a stronger password.";
    case "auth/requires-recent-login":
      return "Your session is too old for this. Log out, log back in, and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Could not change your password. Please try again.";
  }
}

export function passwordResetErrorMessage(err: unknown): string | null {
  if (!isFirebaseError(err)) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "auth/user-not-found":
    case "auth/invalid-email":
      return null;
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Could not send the reset link. Please try again.";
  }
}
