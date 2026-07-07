// Turns Firebase's error codes into plain messages the user can read.
//
// Sign up messages can be specific. If someone's email is already taken we have
// to say so, or they are stuck. Login is different (see below): every error
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
// are registered, so we deliberately avoid that.
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
