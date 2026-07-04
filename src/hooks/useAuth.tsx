// Auth session context. One onAuthStateChanged listener is the single
// source of truth for "who is signed in". Registration (US04), login
// (US05), and logout (US06) all change Firebase's state; this listener is
// what the navigator reads to swap between the auth and app stacks.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

import { auth } from "@/services/firebase";
import { reloadAndCheckVerified } from "@/services/auth";

type AuthState = {
  user: User | null;
  // True until the first auth event arrives. AsyncStorage persistence means
  // a returning user is restored asynchronously on cold start, so we hold
  // the UI on a neutral state until we know whether someone is signed in.
  initializing: boolean;
  // Whether the signed-in user has confirmed a real inbox. Tracked as its own
  // state because it only changes after an explicit reload() (see below), not
  // through onAuthStateChanged.
  emailVerified: boolean;
  // Pulls fresh state from Firebase and updates emailVerified. Called by
  // VerifyEmailScreen's "I have verified" button after the user clicks the
  // link (which happens outside the app, so the cached user is stale).
  refreshEmailVerified: () => Promise<boolean>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  initializing: true,
  emailVerified: false,
  refreshEmailVerified: async () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setEmailVerified(next?.emailVerified ?? false);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const refreshEmailVerified = async (): Promise<boolean> => {
    const verified = await reloadAndCheckVerified();
    setEmailVerified(verified);
    return verified;
  };

  return (
    <AuthContext.Provider value={{ user, initializing, emailVerified, refreshEmailVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
