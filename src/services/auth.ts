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
  sendEmailVerification,
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
