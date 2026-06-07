// Auth session context. One onAuthStateChanged listener is the single
// source of truth for "who is signed in". Registration (US04), login
// (US05), and logout (US06) all change Firebase's state; this listener is
// what the navigator reads to swap between the auth and app stacks.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

import { auth } from "@/services/firebase";

type AuthState = {
  user: User | null;
  // True until the first auth event arrives. AsyncStorage persistence means
  // a returning user is restored asynchronously on cold start, so we hold
  // the UI on a neutral state until we know whether someone is signed in.
  initializing: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, initializing: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
