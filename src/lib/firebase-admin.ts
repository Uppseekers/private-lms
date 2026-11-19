import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

interface FirebaseAppletConfig {
  projectId: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
  [key: string]: any;
}

function loadFirebaseAppletConfig(): FirebaseAppletConfig {
  const candidates: string[] = [path.resolve(process.cwd(), 'firebase-applet-config.json')];
  if (typeof __dirname !== 'undefined') {
    candidates.push(
      path.resolve(__dirname, '../../firebase-applet-config.json'),
      path.resolve(__dirname, '../firebase-applet-config.json')
    );
  }
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (parsed && typeof parsed.projectId === 'string') {
          return parsed;
        }
      }
    } catch {
      // Try next candidate path
    }
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'continual-bus-9w1xt',
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || '(default)',
  };
}

export const firebaseAppletConfig = loadFirebaseAppletConfig();

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
      projectId: firebaseAppletConfig.projectId,
    })
  : initializeApp({
      projectId: firebaseAppletConfig.projectId,
    });

export const firebaseWebApiKey: string = String(firebaseAppletConfig.apiKey || '');

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore =
  firebaseAppletConfig.firestoreDatabaseId && firebaseAppletConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(adminApp, firebaseAppletConfig.firestoreDatabaseId)
    : getFirestore(adminApp);
