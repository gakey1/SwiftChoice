// All the login and sign up actions that talk to Firebase live here in one
// place, so the screens just call these functions and never deal with Firebase
// directly. Keeping them together also makes them easy to fake in tests.
//
// None of these functions hide errors. If a Firebase call fails, the error is
// thrown so the screen that called it can catch it and show the user a friendly
// message (see features/auth/errorMessages). Having that in one spot keeps the
// wording consistent instead of scattered around.

import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "@/services/firebase";
import { createUserDocument } from "@/services/firestore/users";

// Creates a new account and also saves a matching user record in the database.
// Once the account is made, Firebase signs the user in automatically, so the
// listener in useAuth notices and moves them into the app (no navigation happens
// here). The verification email is sent straight away. The account exists, but
// the user is held on the verify screen until they confirm a real inbox, which
// is what stops people signing up with fake emails.
export async function registerWithEmail(email: string, password: string): Promise<string> {
  const trimmedEmail = email.trim();
  const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  const { uid } = credential.user;
  await createUserDocument(uid, trimmedEmail);
  await sendEmailVerification(credential.user);
  return uid;
}

// Sends the verification email again, for the "Resend link" button on the verify
// screen. Throws if there is somehow no one signed in.
export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("No signed-in user to verify.");
  }
  await sendEmailVerification(auth.currentUser);
}

// Checks with Firebase again to see if the email has been verified yet. This is
// needed because the user clicks the link in their email app, not in the app, so
// the local copy of the user stays out of date until Firebase is asked for a fresh one.
export async function reloadAndCheckVerified(): Promise<boolean> {
  if (!auth.currentUser) {
    return false;
  }
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
}

// Signs an existing user in. Firebase starts the session and the useAuth
// listener notices and moves them into the app, so this does not navigate.
export async function loginWithEmail(email: string, password: string): Promise<string> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user.uid;
}

// Signs the current user out. The useAuth listener sees the session go empty and
// sends them back to the login screen on its own.
export async function logout(): Promise<void> {
  await signOut(auth);
}

// Emails a password reset link for someone who cannot get in. Nobody is signed
// in when this runs, so the email address is the only thing identifying them.
//
// This throws like the rest of this file, but the screen calling it deliberately
// does not show most of what comes back. Whether an account exists for this
// address is exactly what the login form already refuses to reveal, and a reset
// form that said "no account with that email" would hand over the same answer by
// another door. See passwordResetErrorMessage in features/auth/errorMessages.
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

// Proves the person holding the phone is the account holder, by asking Firebase
// to check their password again.
//
// Firebase keeps a session alive for weeks, which is what US05 asked for, but it
// means the session in somebody's hand could have been started a fortnight ago
// by someone else. So Firebase refuses its destructive actions (deleteUser,
// changing the email, changing the password) on a session older than a few
// minutes, throwing auth/requires-recent-login. This is how that is satisfied:
// the credential is rebuilt from the typed password and handed back, which
// resets the session's freshness without signing anyone out. Staying signed in
// matters, because a real sign-out would fire the listener in useAuth and bounce
// the app back to the login screen halfway through deleting an account.
//
// The email is read from the current session rather than passed in, so a screen
// cannot re-authenticate against an address the session does not belong to.
export async function reauthenticate(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error("No signed-in user to re-authenticate.");
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

// Deletes the signed-in user's Firebase account. This is the very last step of
// US33 and it is deliberately not exported anywhere near the data deletion:
// the Firestore rule is request.auth.uid == uid, so every permission to delete
// this user's documents comes from this account existing. Once this runs,
// anything still in the cloud can never be deleted by anybody (D-011).
//
// The order is enforced in features/privacy/accountDeletion, which is the only
// thing that should call this.
export async function deleteCurrentUser(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No signed-in user to delete.");
  }

  await deleteUser(user);
}
