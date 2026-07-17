"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User as FirebaseUser } from "firebase/auth";
import posthog from "posthog-js";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { api, type SessionResponse, type User } from "@/lib/api";

/**
 * Bridges Firebase auth state to the backend app user.
 *
 * Phone OTP itself is performed by the sign-in/sign-up pages via the Firebase
 * client SDK. Once Firebase has a signed-in user, this provider exchanges the
 * ID token for an app user (`POST /v1/auth/session`, idempotent) and exposes
 * the result. Pages drive routing using `established()`'s `created` flag.
 */
interface AuthContextValue {
  /** The raw Firebase user, or null when signed out. */
  firebaseUser: FirebaseUser | null;
  /** The backend app user, or null until a session is established. */
  user: User | null;
  /** True until the initial auth state has been resolved. */
  loading: boolean;
  /** Create/fetch the backend session for the current Firebase user. */
  establishSession: () => Promise<SessionResponse>;
  /** Re-fetch the app user from the backend. */
  refresh: () => Promise<void>;
  /** Sign out of Firebase and clear state. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  loading: true,
  establishSession: async () => {
    throw new Error("AuthProvider not mounted");
  },
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Dedupe concurrent session exchanges (listener + page can race on login).
  const inFlight = useRef<Promise<SessionResponse> | null>(null);

  const establishSession = (): Promise<SessionResponse> => {
    if (inFlight.current) return inFlight.current;
    const p = api
      .createSession()
      .then((res) => {
        setUser(res.user);
        // Identify by opaque user ID only — no name or other PII as a
        // PostHog person property (see 2026-07-17 audit).
        posthog.identify(res.user.id);
        return res;
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = p;
    return p;
  };

  const refresh = async () => {
    if (!getFirebaseAuth().currentUser) return;
    const freshUser = await api.getMe();
    setUser(freshUser);
  };

  const signOut = async () => {
    await fbSignOut(getFirebaseAuth());
    posthog.reset();
    setUser(null);
    setFirebaseUser(null);
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  };

  useEffect(() => {
    // Without Firebase config there is nothing to subscribe to — keep the app
    // usable (signed-out) instead of throwing auth/invalid-api-key on load.
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          await establishSession();
        } catch {
          // Leave user null; pages surface their own errors on explicit calls.
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, user, loading, establishSession, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
