import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

function parseServiceAccount(): Record<string, any> | null {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.client_email && parsed.private_key) {
      return parsed;
    }
  } catch {
    // Also support base64-encoded JSON in env vars
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed && parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

const serviceAccount = parseServiceAccount();

export function hasAdminServiceAccount(): boolean {
  return Boolean(serviceAccount);
}

const adminApp: App = getApps().length
  ? getApp()
  : serviceAccount
  ? initializeApp({
      credential: cert(serviceAccount as any),
      projectId: firebaseConfig.projectId,
    })
  : initializeApp({
      projectId: firebaseConfig.projectId,
    });

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(
  adminApp,
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)'
);
