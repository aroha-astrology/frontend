// Firebase client initialisation (lazy singleton).
// Auth is the only product used (phone OTP). Env var names mirror jyotish-backend
// (NEXT_PUBLIC_FIREBASE_AUTH_*) so the same Firebase project config is reused.
//
// `getAuth()` is called lazily (not at module load) so it never runs during
// server-side prerender — Firebase Auth is browser-only and would otherwise
// throw `auth/invalid-api-key` while building.

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_AUTH_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_AUTH_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_AUTH_APP_ID,
};

/** True when the minimum web config needed for auth is present. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId,
);

// Google/Apple popup sign-in loads its handler from `authDomain` but authorises
// with `apiKey`; when the two name different Firebase projects the handler dies
// on `INVALID_CONTINUE_URI` and the app surfaces only a generic error. That
// shipped to production once already, from a half-done aroha-prod migration
// that moved authDomain/appId but not apiKey/projectId. This module is imported
// during prerender, so throwing here fails the build instead of failing at
// users' sign-in.
if (
  isFirebaseConfigured &&
  !firebaseConfig.authDomain!.startsWith(`${firebaseConfig.projectId}.`)
) {
  throw new Error(
    `Firebase config mixes projects: authDomain "${firebaseConfig.authDomain}" does not belong to projectId "${firebaseConfig.projectId}". All NEXT_PUBLIC_FIREBASE_AUTH_* vars must come from one project.`,
  );
}

let authInstance: Auth | null = null;

/** Get the Firebase Auth instance, initialising the app on first call. */
export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  return authInstance;
}
