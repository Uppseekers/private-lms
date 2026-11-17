import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db = getFirestore(
  app,
  (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)'
);

let provisionerAuthInstance: Auth | null = null;

/**
 * Secondary Firebase Auth instance using inMemoryPersistence so an Admin
 * provisioning a new user on the client never signs out their own session.
 */
export function getProvisionerAuth(): Auth {
  if (provisionerAuthInstance) return provisionerAuthInstance;
  const existing = getApps().find((a) => a.name === 'provisioner');
  const provisionerApp = existing || initializeApp(firebaseConfig, 'provisioner');
  try {
    provisionerAuthInstance = initializeAuth(provisionerApp, {
      persistence: inMemoryPersistence,
    });
  } catch {
    provisionerAuthInstance = getAuth(provisionerApp);
  }
  return provisionerAuthInstance;
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

export function normalizeEmailKey(email?: string | null): string {
  const clean = normalizeEmail(email);
  if (!clean) return 'unknown_user';
  return clean.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export function toValidDocId(raw: string, fallbackPrefix = 'doc'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 128);
  return cleaned || `${fallbackPrefix}_${Date.now()}`;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}
