import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]!;

  const raw = process.env.FIREBASE_AUTH_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_AUTH_SERVICE_ACCOUNT_JSON env var is not set');

  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
