// Turns Firebase's error codes into plain messages the user can read.
//
// The split that runs through this file is who is asking. Nobody is signed in on
// login and password reset, so those hide which emails are registered. The
// signed-in screens name the failure, since the app already knows the address.

// Narrows an unknown throw to something with a Firebase code, so every function
// below can switch on it safely.
export function isFirebaseError(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}

// Sign up can be specific. Somebody whose email is already registered has to be
// told, or they are stuck with no way forward.
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

// Login says the same thing whatever went wrong. Telling apart "wrong password"
// from "no such account" would let somebody probe which emails are registered,
// so the four credential codes deliberately collapse to one message.
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

// Deleting an account re-checks the password first. This one is specific
// where login is vague, and the difference is worth spelling out: the person is
// already signed in, the app already knows their address, and they are being
// asked to confirm a password the account definitely has. Naming the failure
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

// Changing a password from inside the app. Specific for the same reason deleting
// an account is: the person is already signed in, so naming the failure reveals
// nothing they do not already know.
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

// Password reset hides whether an account exists, for the same reason login
// does: a reset form answering "no account with that email" would leak through a
// second screen what the login form refuses to say.
//
// null means "show no error", so the screen shows its ordinary confirmation and
// a registered address looks identical to an unregistered one. Only faults that
// hold either way get a message, since those are the ones a user can act on.
//
// auth/invalid-email returns null too: validateEmail has already caught
// malformed addresses on the device, so repeating it here would only narrow
// down what counts as a real address.
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
