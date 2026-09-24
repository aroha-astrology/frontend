// Firebase client initialisation (lazy singleton).
// Auth is the only product used (phone OTP). Env var names mirror jyotish-backend
// (NEXT_PUBLIC_FIREBASE_AUTH_*) so the same Firebase project config is reused.
//
// `getAuth()` is called lazily (not at module load) so it never runs during
// server-side prerender — Firebase Auth is browser-only and would otherwise
// throw `auth/invalid-api-key` while building.

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithCustomToken, type Auth } from "firebase/auth";

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

/**
 * E2E only (frontend/e2e, playwright.config.ts): set at BUILD time to point
 * auth at the local Firebase Auth emulator. Never set on Vercel, so the whole
 * branch below is dead code in real builds.
 */
const AUTH_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

/** An unsigned custom token — the Auth emulator accepts these, real Firebase never does. */
function unsignedEmulatorToken(uid: string): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: "e2e@demo-aroha.iam.gserviceaccount.com",
    sub: "e2e@demo-aroha.iam.gserviceaccount.com",
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid,
  })}.`;
}

/** Get the Firebase Auth instance, initialising the app on first call. */
export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  if (AUTH_EMULATOR_HOST) {
    const auth = authInstance;
    connectAuthEmulator(auth, `http://${AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    // Lets a Playwright test sign in without the phone-OTP UI.
    (window as unknown as { __arohaE2E?: unknown }).__arohaE2E = {
      signIn: (uid: string) => signInWithCustomToken(auth, unsignedEmulatorToken(uid)).then(() => undefined),
    };
  }
  return authInstance;
}
