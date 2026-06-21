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

let authInstance: Auth | null = null;

/** Get the Firebase Auth instance, initialising the app on first call. */
export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  return authInstance;
}
