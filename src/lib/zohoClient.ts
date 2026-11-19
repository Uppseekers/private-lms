import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, getFirebaseIdToken, normalizeEmail, normalizeEmailKey } from './firebase';

export interface StaffZohoVaultDoc {
  id: string;
  staffEmail: string;
  staffName: string;
  zohoEmail: string;
  zohoDisplayName: string;
  zsoid: string;
  zuid: string;
  accountsServer: string;
  meetingBase: string;
  sealedVault: string;
  connectedAt: string;
  updatedAt: string;
}

const memorySealedVaultByEmail = new Map<string, string>();
let cachedSharedOrgZsoid = '';

export async function readSharedOrgZsoid(): Promise<string> {
  if (cachedSharedOrgZsoid) return cachedSharedOrgZsoid;
  try {
    const snap = await getDoc(doc(db, 'portal_settings', 'zoho_org_meta'));
    if (snap.exists()) {
      const zsoid = String(snap.data()?.matrix?.zsoid || '').trim();
      if (zsoid) {
        cachedSharedOrgZsoid = zsoid;
        return zsoid;
      }
    }
  } catch {
    // Non-fatal if not yet created or permission restricted
  }
  return '';
}

export async function saveSharedOrgZsoid(
  zsoid?: string | null,
  accountsServer?: string | null,
  meetingBase?: string | null
): Promise<void> {
  const cleanZsoid = String(zsoid || '').trim();
  if (!cleanZsoid) return;
  cachedSharedOrgZsoid = cleanZsoid;

  const authEmail = normalizeEmail(auth.currentUser?.email);
  if (!authEmail) return;

  try {
    await setDoc(doc(db, 'portal_settings', 'zoho_org_meta'), {
      id: 'zoho_org_meta',
      matrix: {
        zsoid: cleanZsoid.slice(0, 120),
        accountsServer: String(accountsServer || 'https://accounts.zoho.com').slice(0, 200),
        meetingBase: String(meetingBase || 'https://meeting.zoho.com').slice(0, 200),
      },
      updatedBy: authEmail.slice(0, 200),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Only Admins have write access to portal_settings; ignore for standard staff
  }
}

export async function listAllStaffZohoVaultDocs(): Promise<StaffZohoVaultDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'staff_zoho_vault'));
    const docs: StaffZohoVaultDoc[] = [];
    snap.forEach((d) => {
      const raw = d.data() as StaffZohoVaultDoc;
      if (raw?.staffEmail && raw?.sealedVault) {
        memorySealedVaultByEmail.set(normalizeEmail(raw.staffEmail), raw.sealedVault);
        docs.push({ ...raw, id: d.id });
      }
    });
    return docs;
  } catch {
    return [];
  }
}

export async function readStaffZohoSealedVault(email?: string | null): Promise<string> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return '';
  const cached = memorySealedVaultByEmail.get(cleanEmail);
  if (cached) return cached;

  const emailKey = normalizeEmailKey(cleanEmail);
  try {
    const snap = await getDoc(doc(db, 'staff_zoho_vault', emailKey));
    if (snap.exists()) {
      const data = snap.data() as Partial<StaffZohoVaultDoc> | undefined;
      const sealed = typeof data?.sealedVault === 'string' ? data.sealedVault : '';
      if (data?.zsoid) {
        cachedSharedOrgZsoid = String(data.zsoid);
      }
      if (sealed) {
        memorySealedVaultByEmail.set(cleanEmail, sealed);
        return sealed;
      }
    }
  } catch {
    // Non-fatal if rules haven't propagated or offline
  }
  return '';
}

export async function saveStaffZohoSealedVault(
  payload: Record<string, any>,
  fallbackEmail?: string | null,
  fallbackName?: string | null
): Promise<void> {
  const sealedVault = typeof payload?.sealedVault === 'string' ? payload.sealedVault.trim() : '';
  const cleanEmail = normalizeEmail(payload?.staffEmail || payload?.staffKey || fallbackEmail);
  if (!sealedVault || !cleanEmail || !cleanEmail.includes('@')) return;

  memorySealedVaultByEmail.set(cleanEmail, sealedVault);
  const emailKey = normalizeEmailKey(cleanEmail);
  const now = new Date().toISOString();
  const zsoid = String(payload?.zsoid || '').trim().slice(0, 120);
  if (zsoid) {
    void saveSharedOrgZsoid(zsoid, payload?.accountsServer, payload?.meetingBase);
  }

  const record: StaffZohoVaultDoc = {
    id: emailKey,
    staffEmail: cleanEmail.slice(0, 200),
    staffName: String(payload?.staffName || fallbackName || cleanEmail).trim().slice(0, 200),
    zohoEmail: String(payload?.zohoEmail || '').trim().slice(0, 200),
    zohoDisplayName: String(payload?.zohoDisplayName || payload?.zohoEmail || '').trim().slice(0, 200),
    zsoid,
    zuid: String(payload?.zuid || '').trim().slice(0, 120),
    accountsServer: String(payload?.accountsServer || 'https://accounts.zoho.com').trim().slice(0, 200),
    meetingBase: String(payload?.meetingBase || 'https://meeting.zoho.com').trim().slice(0, 200),
    sealedVault: sealedVault.slice(0, 8000),
    connectedAt: String(payload?.connectedAt || now).slice(0, 80),
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'staff_zoho_vault', emailKey), record);
  } catch (err) {
    console.warn('Could not persist staff_zoho_vault to Firestore:', err);
  }
}

export async function deleteStaffZohoSealedVault(email?: string | null): Promise<void> {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;
  memorySealedVaultByEmail.delete(cleanEmail);
  const emailKey = normalizeEmailKey(cleanEmail);
  try {
    await deleteDoc(doc(db, 'staff_zoho_vault', emailKey));
  } catch {
    // Ignore if already deleted
  }
}

export function isTrustedZohoPostMessageOrigin(origin: string): boolean {
  if (!origin) return false;
  return (
    origin === window.location.origin ||
    origin.endsWith('.run.app') ||
    origin.endsWith('.vercel.app') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('https://localhost')
  );
}

export function subscribeToZohoOAuthMessages(
  onResult: (data: Record<string, any>) => void
): () => void {
  let lastHandledSig = '';

  const dispatchOnce = (raw: any) => {
    if (!raw || typeof raw !== 'object') return;
    if (raw.type !== 'ZOHO_OAUTH_SUCCESS' && raw.type !== 'ZOHO_OAUTH_ERROR') return;
    const sig = `${raw.type}:${raw._ts || ''}:${raw.staffKey || ''}:${raw.zohoEmail || ''}:${raw.error || ''}`;
    if (sig === lastHandledSig) return;
    lastHandledSig = sig;
    onResult(raw);
  };

  const handleWindowMessage = (event: MessageEvent) => {
    if (!isTrustedZohoPostMessageOrigin(event.origin)) return;
    dispatchOnce(event.data);
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== 'uppseekers_zoho_oauth_event' || !event.newValue) return;
    try {
      dispatchOnce(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed storage value
    }
  };

  window.addEventListener('message', handleWindowMessage);
  window.addEventListener('storage', handleStorageEvent);

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel('uppseekers_zoho_oauth');
      bc.onmessage = (ev) => dispatchOnce(ev.data);
    } catch {
      bc = null;
    }
  }

  return () => {
    window.removeEventListener('message', handleWindowMessage);
    window.removeEventListener('storage', handleStorageEvent);
    if (bc) {
      try {
        bc.close();
      } catch {
        // Ignore
      }
    }
  };
}

export async function zohoAuthenticatedFetch(
  endpointPath: string,
  init: RequestInit = {},
  staffUser?: { email?: string | null; name?: string | null } | null
): Promise<{ ok: boolean; status: number; data: Record<string, any> }> {
  const email = normalizeEmail(staffUser?.email);
  const name = (staffUser?.name || '').trim();
  const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const params = new URLSearchParams();
  if (clientOrigin) {
    params.set('clientOrigin', clientOrigin);
  }
  if (endpointPath.startsWith('/api/zoho/auth/url')) {
    const sharedZsoid = await readSharedOrgZsoid();
    if (sharedZsoid) {
      params.set('sharedOrgZsoid', sharedZsoid);
    }
  }

  const queryStr = params.toString();
  const separator = endpointPath.includes('?') ? '&' : '?';
  const urlWithParams = queryStr ? `${endpointPath}${separator}${queryStr}` : endpointPath;

  const sealedVault = await readStaffZohoSealedVault(email);

  const executeAttempt = async (forceRefreshToken: boolean) => {
    const token = await getFirebaseIdToken(forceRefreshToken);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(email ? { 'x-staff-email': email } : {}),
      ...(name ? { 'x-staff-name': name } : {}),
      ...(clientOrigin ? { 'x-client-origin': clientOrigin } : {}),
      ...(sealedVault ? { 'x-zoho-sealed-vault': sealedVault } : {}),
    };
    return fetch(urlWithParams, {
      ...init,
      headers,
    });
  };

  let res = await executeAttempt(false);
  if (res.status === 401) {
    res = await executeAttempt(true);
  }

  const rawText = await res.text().catch(() => '');
  let data: Record<string, any> = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      const stripped = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
      data = {
        error: stripped
          ? `Server returned HTTP ${res.status}: ${stripped}`
          : `Server returned HTTP ${res.status}.`,
      };
    }
  } else if (!res.ok) {
    data = { error: `Server returned HTTP ${res.status}.` };
  }

  if (data?.sharedOrgZsoid) {
    cachedSharedOrgZsoid = String(data.sharedOrgZsoid);
  }

  if (data?.sealedVault && email) {
    void saveStaffZohoSealedVault(data, email, name);
  }

  return { ok: res.ok, status: res.status, data };
}
