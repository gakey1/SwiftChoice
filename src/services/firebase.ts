// Firebase initialisation for SwiftChoice.
// Single source for the initialised Firebase app, Auth, and Firestore.
// UI code MUST import from here, never from "firebase/app" directly.

import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
// `getReactNativePersistence` is exported by @firebase/auth's React Native
// entry point. Metro resolves it correctly at runtime via the `react-native`
// field in the package's manifest, but TypeScript walks the regular
// `firebase/auth` types which omit it. The runtime behaviour is correct;
// the type system just cannot see it. This is a known gap, tracked
// upstream. The `@ts-expect-error` is the canonical workaround.
// @ts-expect-error firebase/auth React Native types are not exposed publicly
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Missing Firebase config. Copy .env.example to .env and fill in the values from the Firebase console.",
  );
}

// Fast Refresh can re-evaluate this module. Avoid re-initialising the
// Firebase app, which would throw.
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth must be called exactly once per app. On subsequent
// module evaluations (Fast Refresh) the second call throws; fall back
// to getAuth which returns the existing instance.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);

export { app, auth, db };
