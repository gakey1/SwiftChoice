// Saves a copy of the new user in the Firestore database after they sign up.
// Firebase already handles the actual login details, so this document is just
// the app's own record of the user. It is used to show their info and to link
// their data to them later.

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

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
// value into the next one.
export function clearBudgetTierCache(): void {
  tierCache.clear();
}
