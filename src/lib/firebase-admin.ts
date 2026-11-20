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

const DEFAULT_FIREBASE_APPLET_CONFIG: FirebaseAppletConfig = {
  projectId: 'continual-bus-9w1xt',
  apiKey: 'AIzaSyBl077aH7inl8JWhPf78AZua8tAsnxWfgk',
  firestoreDatabaseId: 'ai-studio-uppseeekersstude-b87d90a0-49bf-4266-9b2c-411586d81e1b',
};

function loadFirebaseAppletConfig(): FirebaseAppletConfig {
  // Direct literal path first so @vercel/nft traces firebase-applet-config.json into serverless bundles
  try {
    const directPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(directPath)) {
      const parsed = JSON.parse(fs.readFileSync(directPath, 'utf8'));
      if (parsed && typeof parsed.projectId === 'string') {
        return {
          ...DEFAULT_FIREBASE_APPLET_CONFIG,
          ...parsed,
        };
      }
    }
  } catch {
    // Try secondary candidate paths below
  }

  if (typeof __dirname !== 'undefined') {
    const fallbackCandidates = [
      path.resolve(__dirname, '../../firebase-applet-config.json'),
      path.resolve(__dirname, '../firebase-applet-config.json'),
    ];
    for (const candidate of fallbackCandidates) {
      try {
        if (fs.existsSync(candidate)) {
          const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
          if (parsed && typeof parsed.projectId === 'string') {
            return {
              ...DEFAULT_FIREBASE_APPLET_CONFIG,
              ...parsed,
            };
          }
        }
      } catch {
        // Try next candidate path
      }
    }
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || DEFAULT_FIREBASE_APPLET_CONFIG.projectId,
    apiKey: process.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_APPLET_CONFIG.apiKey,
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || DEFAULT_FIREBASE_APPLET_CONFIG.firestoreDatabaseId,
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

const parsedServiceAccount = parseServiceAccount();
let validServiceAccountActive = false;

function initAdminAppSafely(): App {
  if (getApps().length > 0) {
    validServiceAccountActive = Boolean(parsedServiceAccount);
    return getApp();
  }
  if (parsedServiceAccount) {
    try {
      const app = initializeApp({
        credential: cert(parsedServiceAccount as any),
        projectId: firebaseAppletConfig.projectId,
      });
      validServiceAccountActive = true;
      return app;
    } catch (err: any) {
      console.warn('[Firebase Admin] Service account initialization failed, falling back to project-only init:', err?.message || err);
      validServiceAccountActive = false;
    }
  }
  return initializeApp({
    projectId: firebaseAppletConfig.projectId,
  });
}

export function hasAdminServiceAccount(): boolean {
  return validServiceAccountActive;
}

const adminApp: App = initAdminAppSafely();

export const firebaseWebApiKey: string = String(firebaseAppletConfig.apiKey || DEFAULT_FIREBASE_APPLET_CONFIG.apiKey || '');

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = (() => {
  try {
    if (firebaseAppletConfig.firestoreDatabaseId && firebaseAppletConfig.firestoreDatabaseId !== '(default)') {
      return getFirestore(adminApp, firebaseAppletConfig.firestoreDatabaseId);
    }
  } catch (err: any) {
    console.warn('[Firebase Admin] Named Firestore init failed, using default database:', err?.message || err);
  }
  return getFirestore(adminApp);
})();
