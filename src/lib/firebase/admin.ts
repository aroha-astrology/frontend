// firebase-admin stub — full implementation pending firebase-admin package installation
// This file exists so that API routes importing it compile without errors.

export function getFirebaseAdminAuth(): {
  verifyIdToken: (token: string) => Promise<{ phone_number?: string; uid: string }>;
} {
  throw new Error(
    'Firebase Admin is not configured. Set FIREBASE_AUTH_SERVICE_ACCOUNT_JSON and install firebase-admin.',
  );
}
