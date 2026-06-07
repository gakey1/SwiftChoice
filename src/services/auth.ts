// Auth service: the Firebase-calling layer for the auth slice.
// Screens call these functions; the raw SDK calls live here so they can be
// mocked in tests and swapped without touching UI.

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

import { auth } from "@/services/firebase";
import { createUserDocument } from "@/services/firestore/users";

// Creates the account and mirrors it into Firestore (US04 4.3, 4.4).
// On success Firebase has already established the session, so the
// onAuthStateChanged listener (see useAuth) will route to Home; this
// function does not navigate itself.
export async function registerWithEmail(email: string, password: string): Promise<string> {
  const trimmedEmail = email.trim();
  const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  const { uid } = credential.user;
  await createUserDocument(uid, trimmedEmail);
  return uid;
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
