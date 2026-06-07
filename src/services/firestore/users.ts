// Cloud user record. Firebase Auth owns credentials; this document is the
// application-side mirror used for display and joins (US04 4.4).

import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/services/firebase";

// Document id equals the Auth uid, so the path is deterministic and the
// security rule (request.auth.uid == uid) protects it.
export async function createUserDocument(uid: string, email: string): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    userId: uid,
    email,
    createdAt: serverTimestamp(),
  });
}
