// Saves a copy of the new user in the Firestore database after they sign up.
// Firebase already handles the actual login details, so this document is just
// our own record of the user. We use it to show their info and to link their
// data to them later.

import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/services/firebase";

// Creates the user's document. We use the user's login id as the document id so
// the location is always predictable, and so our database rules can make sure a
// user can only read or change their own document.
export async function createUserDocument(uid: string, email: string): Promise<void> {
  // Store the user's id, their email, and the time the account was created.
  await setDoc(doc(db, "users", uid), {
    userId: uid,
    email,
    createdAt: serverTimestamp(),
  });
}
