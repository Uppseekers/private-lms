import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };

function normalizeServiceAccountObject(parsed: any): Record<string, any> | null {
  if (!parsed || typeof parsed !== 'object') return null;
  if (!parsed.client_email || !parsed.private_key) return null;
  return {
    ...parsed,
    private_key: String(parsed.private_key).replace(/\\n/g, '\n'),
  };
}

function parseServiceAccount(): Record<string, any> | null {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1).trim();
  }
  try {
    const normalized = normalizeServiceAccountObject(JSON.parse(raw));
    if (normalized) return normalized;
  } catch {
    // Also support base64-encoded JSON in env vars
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      const normalized = normalizeServiceAccountObject(JSON.parse(decoded));
      if (normalized) return normalized;
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
