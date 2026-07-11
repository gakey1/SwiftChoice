// Keeps track of who is signed in, in one shared place the whole app can read.
// A single Firebase listener watches for sign up, login and logout and updates
// this state. The navigator reads it to decide whether to show the login screens
// or the main app.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

import { auth } from "@/services/firebase";
import { reloadAndCheckVerified } from "@/services/auth";

type AuthState = {
  user: User | null;
  // True until Firebase replies the first time. Because the session is saved on
  // the device, a returning user is loaded a moment after start up, so a neutral
  // state is held until it is clear whether anyone is signed in.
  initializing: boolean;
  // Whether the signed-in user has confirmed a real inbox. It is tracked on its
  // own because it only changes when Firebase is asked again (see below), not
  // through the normal login listener.
  emailVerified: boolean;
  // Asks Firebase again and updates emailVerified. The verify screen's
  // "I have verified" button calls this after the user clicks the link in their
  // email, since that happens outside the app.
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

  // Start the one listener that watches Firebase for login changes, and stop it
  // again when this provider is removed.
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
