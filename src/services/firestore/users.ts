// Saves a copy of the new user in the Firestore database after they sign up.
// Firebase already handles the actual login details, so this document is just
// the app's own record of the user. It is used to show their info and to link
// their data to them later.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/services/firebase";

// The three spending levels the budget survey offers.
export type BudgetTier = "budget" | "moderate" | "premium";

const BUDGET_TIERS: readonly string[] = ["budget", "moderate", "premium"];

// Checks that a value is one of the three levels, so an older setting saved in
// a different format cannot be passed around as if it were one of them.
export function isBudgetTier(value: unknown): value is BudgetTier {
  return typeof value === "string" && BUDGET_TIERS.includes(value);
}

// Remembers the level already read for a user so that opening the Fuel screen
// does not go to the network every time. It is kept per user id, so signing in
// as somebody else reads that person's own profile instead of reusing this one.
const tierCache = new Map<string, BudgetTier | null>();

// Creates the user's document. The user's login id is used as the document id so
// the location is always predictable, and so the database rules can make sure a
// user can only read or change their own document.
export async function createUserDocument(uid: string, email: string): Promise<void> {
  // Store the user's id, their email, and the time the account was created.
  await setDoc(doc(db, "users", uid), {
    userId: uid,
    email,
    createdAt: serverTimestamp(),
  });
}

// Saves the budget level the user picked in the survey onto their profile.
// Merging writes only this one field, so the id, email and created date are left
// as they are. It is stored on the profile rather than on the phone so that it
// follows the user to any device, and so a second person signing in on the same
// phone is still asked rather than inheriting the first person's answer.
export async function saveBudgetTier(uid: string, tier: BudgetTier): Promise<void> {
  // Remembered first so the rest of this session can carry on even if the write
  // below fails. A failed write means nothing was stored, so the survey is asked
  // again the next time the app starts, which is the honest outcome.
  tierCache.set(uid, tier);

  await setDoc(doc(db, "users", uid), { budgetTier: tier }, { merge: true });
}

// Reads the saved level back. Returns null when the user has never answered the
// survey, which is what the navigator uses to decide whether to show it.
export async function getBudgetTier(uid: string): Promise<BudgetTier | null> {
  const cached = tierCache.get(uid);
  if (cached !== undefined) {
    return cached;
  }

  const snapshot = await getDoc(doc(db, "users", uid));
  const stored: unknown = snapshot.data()?.budgetTier;
  const tier = isBudgetTier(stored) ? stored : null;

  tierCache.set(uid, tier);
  return tier;
}

// Empties the remembered levels. Used by the tests so one case cannot carry a
// value into the next one, and by account deletion, so a level read before the
// account went cannot be handed to whoever signs in next on this phone.
export function clearBudgetTierCache(): void {
  tierCache.clear();
}

// Firestore commits at most 500 writes in one batch. Larger collections are
// deleted in several batches, which are individually atomic but not atomic with
// each other, so a failure part way through leaves some documents behind. That
// is acceptable here only because deleting is repeatable: running it again
// removes what is left and does nothing to what has already gone.
const BATCH_LIMIT = 500;

// Deletes every decision saved to this user's account (US33). Firestore has no
// "delete this collection" call at any tier, because a collection is not a real
// object, just the shape left by documents existing at a path. So the documents
// are listed and removed, and the collection stops existing once the last one does.
//
// Returns how many were deleted, so the caller can say something true about what
// happened rather than guessing.
export async function deleteAllDecisions(uid: string): Promise<number> {
  const snapshot = await getDocs(collection(db, "users", uid, "decisions"));
  const documents = snapshot.docs;

  for (let start = 0; start < documents.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const document of documents.slice(start, start + BATCH_LIMIT)) {
      batch.delete(document.ref);
    }
    await batch.commit();
  }

  return documents.length;
}

// Deletes the user's own profile document, which holds their id, email, sign-up
// date and budget level. Runs after the decisions, because the parent document
// going first would leave that subcollection with no visible owner while it is
// still being read from.
export async function deleteUserDocument(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}
