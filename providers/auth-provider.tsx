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
import { api, type Profile, type SessionResponse, type User } from "@/lib/api";

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
  /** All profiles on this account (primary + additional), or null until first loaded. */
  profiles: Profile[] | null;
  /** The currently-active profile (derived: profiles?.find(p => p.isActive) ?? null). */
  activeProfile: Profile | null;
  /** Create/fetch the backend session for the current Firebase user. */
  establishSession: () => Promise<SessionResponse>;
  /** Re-fetch the app user from the backend. */
  refresh: () => Promise<void>;
  /** Re-fetch the profiles list from the backend. */
  refreshProfiles: () => Promise<void>;
  /** Activate a profile (by id, or 'primary') and refresh local state. */
  switchProfile: (id: string) => Promise<void>;
  /** Sign out of Firebase and clear state. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  user: null,
  loading: true,
  profiles: null,
  activeProfile: null,
  establishSession: async () => {
    throw new Error("AuthProvider not mounted");
  },
  refresh: async () => {},
  refreshProfiles: async () => {},
  switchProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Dedupe concurrent session exchanges (listener + page can race on login).
  const inFlight = useRef<Promise<SessionResponse> | null>(null);

  /** Re-fetch the profiles list. Non-fatal on failure — leaves `profiles` as-is rather than breaking auth. */
  const refreshProfiles = async () => {
    if (!getFirebaseAuth().currentUser) return;
    try {
      const list = await api.listProfiles();
      setProfiles(list);
    } catch (err) {
      // Non-fatal — don't let a profiles-fetch failure break the auth flow.
      console.error("Failed to load profiles", err);
    }
  };

  /**
   * A fresh app open must always land on the default (primary) profile. `users.activeProfileId`
   * is a persistent DB column (see profiles.service.ts's `activateProfile`), so a switch made in
   * a PRIOR session — e.g. checking a partner's/child's chart — is otherwise sticky forever and
   * silently scopes every kundli/horoscope/report call in the NEW session to that other profile
   * until the reader notices and switches back manually. Runs once per `establishSession()` call
   * (i.e. once per cold start / re-login, not on every `refresh()` poll — see the periodic-refresh
   * effect below, which intentionally does not touch profiles). Non-fatal on failure, same
   * swallow-and-log discipline as `refreshProfiles`: a transient fetch error here must not break
   * sign-in over a profile-reset nicety.
   */
  const resetToPrimaryOnOpen = async () => {
    try {
      const list = await api.listProfiles();
      const active = list.find((p) => p.isActive);
      if (active && !active.isPrimary) {
        await switchProfile("primary");
      } else {
        setProfiles(list);
      }
    } catch (err) {
      console.error("Failed to reset to primary profile on open", err);
    }
  };

  const establishSession = (): Promise<SessionResponse> => {
    if (inFlight.current) return inFlight.current;
    const p = api
      .createSession()
      .then(async (res) => {
        setUser(res.user);
        // Identify by opaque user ID only — no name or other PII as a
        // PostHog person property (see 2026-07-17 audit).
        posthog.identify(res.user.id);
        await resetToPrimaryOnOpen();
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

  /**
   * Activate a profile and refresh local profile + user state. `User` has no
   * `activeProfileId` field, so `profiles` alone is the source of truth for
   * the active profile — but `user.unlockedHouses`/`user.gemstoneUnlocked`
   * are scoped to whichever profile is active server-side, so `user` must be
   * re-fetched too or every unlock-gated screen keeps showing the
   * previously-active profile's unlock state after a switch.
   *
   * Deliberately does NOT go through `refreshProfiles()` — that helper
   * swallows fetch errors (correct for the auth-boot-flow call site), which
   * would let this resolve "successfully" even if the post-activate refetch
   * failed, leaving `profiles`/`activeProfile`/`user` silently stale. Here
   * both refetches are unguarded so a failure rejects this promise and the
   * caller (e.g. a profile switcher) can show an error/retry instead.
   */
  const switchProfile = async (id: string) => {
    await api.activateProfile(id);
    const [freshProfiles] = await Promise.all([api.listProfiles(), refresh()]);
    setProfiles(freshProfiles);
  };

  const signOut = async () => {
    await fbSignOut(getFirebaseAuth());
    posthog.reset();
    setUser(null);
    setFirebaseUser(null);
    setProfiles(null);
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
        setProfiles(null);
      }
      setLoading(false);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps `user.features`/`isAdmin`/wallet fields from going stale in an
  // already-open session — without this, an admin flag toggle (or a group
  // membership change) only ever reaches a signed-in user the NEXT time they
  // establish a fresh session (sign-in, or app cold start), since nothing
  // else calls refresh() on a timer. Three triggers, all best-effort
  // (swallow errors — a missed background refresh isn't worth surfacing):
  // a periodic poll, the tab regaining focus (web), and the app resuming
  // from background (native/Capacitor).
  useEffect(() => {
    if (!isFirebaseConfigured || !getFirebaseAuth().currentUser) return;

    const REFRESH_INTERVAL_MS = 3 * 60_000;
    const safeRefresh = () => {
      if (getFirebaseAuth().currentUser) void refresh().catch(() => {});
    };

    const intervalId = setInterval(safeRefresh, REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") safeRefresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    let removeResumeListener: (() => void) | undefined;
    (async () => {
      try {
        const { App: CapacitorApp } = await import("@capacitor/app");
        const handle = await CapacitorApp.addListener("resume", safeRefresh);
        removeResumeListener = () => void handle.remove();
      } catch {
        // @capacitor/app not resolvable (plain web build) — visibilitychange already covers this case there.
      }
    })();

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      removeResumeListener?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  const activeProfile = profiles?.find((p) => p.isActive) ?? null;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        profiles,
        activeProfile,
        establishSession,
        refresh,
        refreshProfiles,
        switchProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
