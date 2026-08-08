// Deletes the account and everything belonging to it (US33): the cloud copies,
// everything on this phone, and the Firebase account itself.
//
// This is the sibling of localData.ts, and the difference between the two is the
// whole point of this file.
//
// localData.ts (US31) keeps going when a step fails and reports what did not
// clear, because a partial local wipe is recoverable: the user is still signed
// in, still has the button, and can press it again.
//
// This one STOPS at the first failure and never reaches the last step. The
// Firestore rule is `request.auth.uid == uid`, so every permission to delete this
// user's documents is derived from the account existing. Delete the account
// first, or carry on past a failed cloud step, and whatever is left in Firestore
// can never be deleted by anyone: no client can authenticate as that uid again,
// and under D-011 there is no Cloud Function with admin rights to sweep up.
//
// Hence: data first, account last, abort on failure. A failed attempt leaves the
// user signed in and able to try again, which is recoverable. Orphaned cloud
// data is not, and it is exactly what US33 promises will not happen.

import { deleteAccountErrorMessage } from "@/features/auth/errorMessages";
import { clearLocalData } from "@/features/privacy/localData";
import { deleteCurrentUser, reauthenticate } from "@/services/auth";
import { auth } from "@/services/firebase";
import {
  clearBudgetTierCache,
  deleteAllDecisions,
  deleteUserDocument,
} from "@/services/firestore/users";
import { clearPasswordResetRequested } from "@/services/localdb/passwordResetFlag";
import { clearTotpSecret } from "@/services/localdb/totpStorage";

// Named so the failure message can say which part did not go, rather than
// "something went wrong". These are user-facing, so they are worded as things a
// person would recognise rather than as file names.
export type DeletionStep =
  | "your password"
  | "the history saved to your account"
  | "your account record"
  | "the data on this phone"
  | "your two-factor key"
  | "your account";

export type DeleteAccountResult =
  | { ok: true; decisionsDeleted: number }
  // Which step stopped it, and whether anything was destroyed before it did.
  // The screen needs the second part: "nothing was deleted" and "some of it was
  // deleted, press again" are different things to tell somebody.
  //
  // The message is built here rather than on the screen, so the wording for a
  // wrong password lives next to the code that knows it was the password that
  // failed, and cannot drift from it.
  | { ok: false; failedAt: DeletionStep; anythingDeleted: boolean; message: string };

// Runs the whole deletion. The password is taken here rather than being checked
// by the screen beforehand, so the order can never be skipped by a caller: proof
// of identity is step one, and nothing is destroyed until it passes.
export async function deleteAccount(password: string): Promise<DeleteAccountResult> {
  // Step 1. Prove it is really them, before anything is destroyed.
  //
  // Firebase would demand this anyway on a session older than a few minutes
  // (auth/requires-recent-login), but only at the final step, by which point the
  // data would already be gone. Asking first turns a stale session from a
  // half-finished deletion into a refused one. See reauthenticate() for why the
  // documented catch-and-retry pattern is not used here.
  try {
    await reauthenticate(password);
  } catch (error) {
    return {
      ok: false,
      failedAt: "your password",
      anythingDeleted: false,
      message: deleteAccountErrorMessage(error),
    };
  }

  // From here on, anything that fails leaves the account intact and retryable.
  // `anythingDeleted` tracks whether the first destructive step has run, so the
  // message can tell the truth about how far it got.
  let anythingDeleted = false;

  // Step 2. The cloud copies of accepted decisions. These go before the user
  // document, and both go before the account.
  //
  // Known limit, accepted rather than missed: with no connection, a Firestore
  // write promise does not reject, it waits for the server, so this sits here
  // instead of failing and the screen stays on "Deleting...". That is the safe
  // direction to be wrong in, since nothing is orphaned and Back still works,
  // but it is not a good experience. A timeout would be safe to add later
  // (every step is repeatable), and it is on the manual test checklist.
  let decisionsDeleted = 0;
  try {
    decisionsDeleted = await deleteAllDecisions(currentUid());
    anythingDeleted = decisionsDeleted > 0;
  } catch {
    return stopped("the history saved to your account", anythingDeleted);
  }

  // Step 3. The profile document: id, email, sign-up date, budget level.
  try {
    await deleteUserDocument(currentUid());
    anythingDeleted = true;
  } catch {
    return stopped("your account record", anythingDeleted);
  }

  // Step 4. Everything this app stored on the phone. Reusing US31's list rather
  // than writing a second one is deliberate: two lists would drift, and the one
  // that drifted would be this one, silently leaving data behind.
  const local = await clearLocalData();
  anythingDeleted = true;
  if (!local.ok) {
    return stopped("the data on this phone", anythingDeleted);
  }

  // Step 5. The account-scoped secrets US31 deliberately leaves alone, because
  // there the account survives. Here it does not, so they have to go too, or the
  // next person to register on this phone inherits a second factor belonging to
  // an account that no longer exists.
  try {
    await clearTotpSecret();
    await clearPasswordResetRequested();
    clearBudgetTierCache();
  } catch {
    return stopped("your two-factor key", anythingDeleted);
  }

  // Step 6. The account itself, last, once nothing is left that needs its
  // permissions. Deleting it signs the user out, which the listener in useAuth
  // notices and returns them to the login screen on its own (US33 33.2). No
  // navigation happens here.
  try {
    await deleteCurrentUser();
  } catch (error) {
    return {
      ok: false,
      failedAt: "your account",
      anythingDeleted,
      // Specific, because the one error worth naming here is a session that went
      // stale between opening the screen and pressing the button, which tells the
      // user to log out and back in rather than to keep retrying.
      message: deleteAccountErrorMessage(error),
    };
  }

  return { ok: true, decisionsDeleted };
}

// The message for a step that failed part way through. Every one of these is
// retryable, and says so, because each step is safe to run again: deleting is
// repeatable, so a second attempt removes what is left and does nothing to what
// has already gone.
function stopped(failedAt: DeletionStep, anythingDeleted: boolean): DeleteAccountResult {
  const opening = anythingDeleted
    ? `Some of your data was deleted, but this was not: ${failedAt}.`
    : `Nothing was deleted. This step did not go through: ${failedAt}.`;

  return {
    ok: false,
    failedAt,
    anythingDeleted,
    // Saying the account still exists matters. Somebody who has just pressed
    // Delete and seen an error needs to know whether they are still signed in
    // and can try again, or whether they are locked out of a half-deleted account.
    message: `${opening} Your account still exists, so you can try again.`,
  };
}

// The uid is read fresh at each step rather than captured once, so the deletion
// can never run against a stale id if the session changed underneath it.
// Throwing here would be a bug rather than a user error: reauthenticate() has
// already established that somebody is signed in.
function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("No signed-in user to delete.");
  }
  return uid;
}
