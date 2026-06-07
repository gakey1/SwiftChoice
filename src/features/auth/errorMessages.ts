// Maps Firebase Auth error codes to user-facing copy for registration.
//
// Registration messages CAN be specific. A signup form has to tell the user
// their email is already registered, or they are stuck with no way forward.
// This is the deliberate difference from login (US05), where every error
// collapses to one generic line to avoid account enumeration.

export function isFirebaseError(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}

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

// Login errors collapse to one message regardless of cause (US05 acceptance
// criterion, coding-standards.md §6). Distinguishing "wrong password" from "no
// such account" would let an attacker enumerate which emails are registered.
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
