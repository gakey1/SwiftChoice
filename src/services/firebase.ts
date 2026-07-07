// Sets up Firebase for the whole app in one place. Anything that needs Firebase
// (login and the cloud database) imports it from here, so it only starts up
// once and the rest of the app never touches Firebase directly.

import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
// getReactNativePersistence really does exist and works when the app runs, but
// the TypeScript types for firebase/auth leave it out, so the type checker
// complains about it. The line below tells TypeScript to expect and ignore that
// one error. It is a known gap in the library.
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

// Stop straight away with a clear message if the Firebase settings are missing.
// This almost always means the .env file has not been set up yet.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Missing Firebase config. Copy .env.example to .env and fill in the values from the Firebase console.",
  );
}

// While developing, the app can reload this file more than once. Only start
// Firebase if it has not been started already, otherwise it throws an error.
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Set up login and keep the user signed in between app restarts by saving the
// session on the device. This can only run once, so if it has already run the
// existing setup is grabbed instead of making a new one.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

// The cloud database, where accounts and history are stored.
const db: Firestore = getFirestore(app);

export { app, auth, db };
