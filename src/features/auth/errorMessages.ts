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

// Password reset hides whether an account exists, for the same reason login does.
// The login form spent effort refusing to say which emails are registered, and a
// reset form that answered "no account with that email" would give away the same
// thing through a different screen.
//
// Returning null means "do not show an error". The screen then shows the same
// confirmation it shows after a real send, so a registered address and an
// unregistered one look identical from the outside. Only faults that are true
// whether or not the account exists get a message, because those are things the
// user can actually act on.
//
// auth/invalid-email is included in the null case because validateEmail has
// already caught malformed addresses on the device and shown a field error. By
// the time Firebase disagrees, saying so would only narrow down what counts as
// a real address here.
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
