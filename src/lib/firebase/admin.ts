import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const raw = process.env.FIREBASE_AUTH_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_AUTH_SERVICE_ACCOUNT_JSON is not set');

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `FIREBASE_AUTH_SERVICE_ACCOUNT_JSON is invalid JSON — check Vercel env var. ` +
      `Parse error: ${(e as Error).message}`
    );
  }
  return initializeApp({ credential: cert(serviceAccount) });
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
