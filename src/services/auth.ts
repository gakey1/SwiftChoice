// Auth service: the Firebase-calling layer for the auth slice.
// Screens call these functions; the raw SDK calls live here so they can be
// mocked in tests and swapped without touching UI.
//
// Error-handling contract: these functions never swallow errors. A failed
// Firebase call throws, and the throw is left to propagate to the calling
// screen, which turns the error code into user-facing copy via
// features/auth/errorMessages. Centralising that mapping (instead of scattering
// try/catch here) is what keeps this layer thin and the messaging consistent.

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "@/services/firebase";
import { createUserDocument } from "@/services/firestore/users";

// Creates the account and mirrors it into Firestore (US04 4.3, 4.4).
// On success Firebase has already established the session, so the
// onAuthStateChanged listener (see useAuth) will route to the app; this
// function does not navigate itself. A verification link is sent immediately:
// the account exists but stays gated behind VerifyEmailScreen until the user
// confirms a real inbox, which is what blocks fake-email sign ups.
export async function registerWithEmail(email: string, password: string): Promise<string> {
  const trimmedEmail = email.trim();
  const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  const { uid } = credential.user;
  await createUserDocument(uid, trimmedEmail);
  await sendEmailVerification(credential.user);
  return uid;
}

// Re-sends the verification link to the signed-in user (the Resend button on
// VerifyEmailScreen). Throws if somehow called with no session.
export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("No signed-in user to verify.");
  }
  await sendEmailVerification(auth.currentUser);
}

// Pulls fresh state from Firebase and reports whether the email is now
// verified. Needed because clicking the link happens outside the app, so the
// cached User does not update on its own and onAuthStateChanged does not re-fire.
export async function reloadAndCheckVerified(): Promise<boolean> {
  if (!auth.currentUser) {
    return false;
  }
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}

// Signs an existing user in (US05). On success Firebase establishes the
// session and the onAuthStateChanged listener routes to Home; this function
// does not navigate itself.
export async function loginWithEmail(email: string, password: string): Promise<string> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user.uid;
}

// Signs the current user out (US06). The auth listener flips the session to
// null and RootNavigator returns to the Login screen; no manual navigation.
export async function logout(): Promise<void> {
  await signOut(auth);
}
