// Keeps track of who is signed in, in one shared place the whole app can read.
// A single Firebase listener watches for sign up, login and logout and updates
// this state. RootNavigator reads it to decide whether to show the login screens
// or the main app.

// The context, the listener's lifecycle, and the state it writes to.
import { createContext, useContext, useEffect, useState } from "react";
// The type for whatever the provider wraps.
import type { ReactNode } from "react";
// The one Firebase subscription this file owns.
import { onAuthStateChanged } from "firebase/auth";
// Firebase's own user type, passed straight through to consumers.
import type { User } from "firebase/auth";

// The configured Firebase auth instance.
import { auth } from "@/services/firebase";
// Re-asks Firebase whether the email has been verified since.
import { reloadAndCheckVerified } from "@/services/auth";

// What every consumer of useAuth() gets.
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

// The signed-out defaults, used if a component reads the context without the
// provider above it. initializing starts true, so nothing decides too early.
const AuthContext = createContext<AuthState>({
  user: null,
  initializing: true,
  emailVerified: false,
  refreshEmailVerified: async () => false,
});

// Wraps the app and owns the single Firebase listener.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  // Start the one listener that watches Firebase for login changes, and stop it
  // again when this provider is removed. Empty deps, so it is started once.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setEmailVerified(next?.emailVerified ?? false);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Verification happens in the user's inbox, outside the app, so there is
  // nothing to listen for. This asks Firebase on demand and updates the state.
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

// How any screen reads the current session.
export function useAuth(): AuthState {
  return useContext(AuthContext);
}
