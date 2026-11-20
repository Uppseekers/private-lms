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

export type ZohoTraceCategory =
  | 'API_HANDSHAKE'
  | 'TOKEN_STORAGE'
  | 'AUTH_SESSION'
  | 'SERVER_RUNTIME';

export type ZohoTraceClassification =
  | 'OK'
  | 'SERVERLESS_500_CRASH'
  | 'TOKEN_STORAGE_FORMAT_ERROR'
  | 'FIRESTORE_RULES_DENIED'
  | 'FIREBASE_AUTH_401'
  | 'ZOHO_API_HANDSHAKE_ERROR'
  | 'REDIRECT_URI_MISMATCH'
  | 'NETWORK_ERROR'
  | 'INFO';

export interface ZohoTraceEntry {
  id: string;
  timestamp: string;
  stage: string;
  category: ZohoTraceCategory;
  classification: ZohoTraceClassification;
  ok: boolean;
  durationMs: number;
  method?: string;
  url?: string;
  httpStatus?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  rawResponseBody?: string;
  parsedResponse?: any;
  storageAudit?: Record<string, any>;
  summary: string;
  diagnosisHint?: string;
}

export interface ClientStorageAuditResult {
  email: string;
  emailKey: string;
  firebaseAuthEmail: string;
  firebaseAuthUid: string;
  staffDirectoryStatus: 'found_active' | 'found_inactive' | 'missing' | 'permission_denied' | 'error';
  staffDirectoryDetail: string;
  vaultDocStatus: 'valid' | 'format_error' | 'missing' | 'permission_denied' | 'error';
  vaultDocDetail: string;
  vaultFormatChecks?: {
    hasRequiredFields: boolean;
    missingFields: string[];
    sealedVaultLength: number;
    sealedVaultSegments: number;
    ivBytes: number;
    tagBytes: number;
    cipherBytes: number;
    validAesGcmShape: boolean;
    withinRulesSizeLimit: boolean;
  };
  sharedOrgMetaStatus: 'found' | 'missing' | 'permission_denied' | 'error';
  sharedOrgZsoid: string;
}

const TRACE_STORAGE_KEY = 'uppseekers_zoho_diagnostic_trace_v1';
const MAX_TRACE_ENTRIES = 60;

const memorySealedVaultByEmail = new Map<string, string>();
let cachedSharedOrgZsoid = '';
const traceListeners = new Set<() => void>();

function loadPersistedTraces(): ZohoTraceEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TRACE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_TRACE_ENTRIES) : [];
  } catch {
    return [];
  }
}

let zohoTraceEntries: ZohoTraceEntry[] = loadPersistedTraces();

function persistTraces() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TRACE_STORAGE_KEY, JSON.stringify(zohoTraceEntries.slice(0, MAX_TRACE_ENTRIES)));
  } catch {
    // Ignore quota errors
  }
}

export function getZohoTraceLog(): ZohoTraceEntry[] {
  return zohoTraceEntries;
}

export function subscribeZohoTraceLog(listener: () => void): () => void {
  traceListeners.add(listener);
  return () => {
    traceListeners.delete(listener);
  };
}

export function clearZohoTraceLog(): void {
  zohoTraceEntries = [];
  persistTraces();
  traceListeners.forEach((fn) => fn());
}

export function recordZohoTrace(
  entry: Omit<ZohoTraceEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): ZohoTraceEntry {
  const full: ZohoTraceEntry = {
    id: entry.id || `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    ...entry,
  };
  zohoTraceEntries = [full, ...zohoTraceEntries].slice(0, MAX_TRACE_ENTRIES);
  persistTraces();
  traceListeners.forEach((fn) => fn());
  return full;
}

function base64UrlByteLength(segment: string): number {
  if (!segment || !/^[A-Za-z0-9_-]+$/.test(segment)) return -1;
  try {
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4);
    const decoded = atob(padded);
    return decoded.length;
  } catch {
    return -1;
  }
}

export function inspectClientSealedVaultFormat(sealedVault?: string | null) {
  const trimmed = typeof sealedVault === 'string' ? sealedVault.trim() : '';
  if (!trimmed) {
    return {
      present: false,
      length: 0,
      segments: 0,
      ivBytes: 0,
      tagBytes: 0,
      cipherBytes: 0,
      validAesGcmShape: false,
      withinRulesSizeLimit: true,
    };
  }
  const parts = trimmed.split('.');
  const ivBytes = parts.length === 3 ? base64UrlByteLength(parts[0]) : -1;
  const tagBytes = parts.length === 3 ? base64UrlByteLength(parts[1]) : -1;
  const cipherBytes = parts.length === 3 ? base64UrlByteLength(parts[2]) : -1;
  const validAesGcmShape = parts.length === 3 && ivBytes === 12 && tagBytes === 16 && cipherBytes > 0;
  return {
    present: true,
    length: trimmed.length,
    segments: parts.length,
    ivBytes,
    tagBytes,
    cipherBytes,
    validAesGcmShape,
    withinRulesSizeLimit: trimmed.length >= 10 && trimmed.length <= 8000,
  };
}

function sanitizeJsonForTrace(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload.map(sanitizeJsonForTrace);
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(payload)) {
    if (key === 'sealedVault' && typeof val === 'string') {
      out[key] = inspectClientSealedVaultFormat(val);
    } else if (key.toLowerCase().includes('token') && typeof val === 'string' && val.length > 24 && key !== 'tokenExpiresAt') {
      out[key] = `<redacted, len=${val.length}>`;
    } else if (key.toLowerCase().includes('secret') && typeof val === 'string' && val.length > 8) {
      out[key] = `<redacted, len=${val.length}>`;
    } else if (val && typeof val === 'object') {
      out[key] = sanitizeJsonForTrace(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

function extractDiagnosticHeaders(headers: Headers): Record<string, string> {
  const keys = [
    'content-type',
    'x-vercel-id',
    'x-vercel-error',
    'x-vercel-cache',
    'x-matched-path',
    'server',
    'date',
    'cache-control',
  ];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const val = headers.get(k);
    if (val) out[k] = val;
  }
  return out;
}

function classifyHttpTrace(
  endpointPath: string,
  status: number,
  rawText: string,
  parsed: Record<string, any>,
  responseHeaders: Record<string, string>
): {
  category: ZohoTraceCategory;
  classification: ZohoTraceClassification;
  hint?: string;
} {
  const lowerRaw = rawText.toLowerCase();
  const lowerErr = String(parsed?.error || '').toLowerCase();

  if (status >= 500) {
    const isVercelCrash =
      lowerRaw.includes('function_invocation_failed') ||
      lowerRaw.includes('function_invocation_timeout') ||
      Boolean(responseHeaders['x-vercel-error']);
    if (isVercelCrash) {
      return {
        category: 'SERVER_RUNTIME',
        classification: 'SERVERLESS_500_CRASH',
        hint: `Vercel Serverless Function crashed before returning JSON (${responseHeaders['x-vercel-error'] || 'FUNCTION_INVOCATION_FAILED'}${responseHeaders['x-vercel-id'] ? ` · ${responseHeaders['x-vercel-id']}` : ''}). Confirm latest server.ts + vercel.json are deployed to Vercel.`,
      };
    }
    if (lowerErr.includes('vault') || lowerErr.includes('decrypt') || lowerErr.includes('refresh token')) {
      return {
        category: 'TOKEN_STORAGE',
        classification: 'TOKEN_STORAGE_FORMAT_ERROR',
        hint: 'Server returned HTTP 500 during stored token decryption or refresh. Inspect the sealedVault format check below.',
      };
    }
    return {
      category: 'SERVER_RUNTIME',
      classification: 'SERVERLESS_500_CRASH',
      hint: 'Backend route returned HTTP 500. Inspect the raw response body and server logs below to isolate whether the failure occurred in storage or upstream Zoho API.',
    };
  }

  if (status === 401) {
    return {
      category: 'AUTH_SESSION',
      classification: 'FIREBASE_AUTH_401',
      hint: 'Firebase ID token was rejected by /api middleware. Sign out and sign back in, or verify firebase-applet-config.json API key is bundled on the server.',
    };
  }

  if (lowerErr.includes('redirect')) {
    return {
      category: 'API_HANDSHAKE',
      classification: 'REDIRECT_URI_MISMATCH',
      hint: 'Add the exact Active Callback Route shown in Team Settings to Authorized Redirect URIs in Zoho API Console.',
    };
  }

  if (status >= 400) {
    return {
      category: endpointPath.includes('/connection') ? 'TOKEN_STORAGE' : 'API_HANDSHAKE',
      classification: 'ZOHO_API_HANDSHAKE_ERROR',
      hint: parsed?.error || `Endpoint returned HTTP ${status}.`,
    };
  }

  return {
    category: endpointPath.includes('/health') ? 'SERVER_RUNTIME' : 'API_HANDSHAKE',
    classification: 'OK',
  };
}

export async function probeServerHealth(): Promise<{ ok: boolean; status: number; data: Record<string, any> }> {
  const startedAt = performance.now();
  const url = '/api/health';
  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const durationMs = Math.round(performance.now() - startedAt);
    const rawText = await res.text().catch(() => '');
    const responseHeaders = extractDiagnosticHeaders(res.headers);
    let data: Record<string, any> = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { error: rawText.slice(0, 300) };
    }
    const { category, classification, hint } = classifyHttpTrace(url, res.status, rawText, data, responseHeaders);
    recordZohoTrace({
      stage: 'SERVER_HEALTH',
      category,
      classification,
      ok: res.ok,
      durationMs,
      method: 'GET',
      url,
      httpStatus: res.status,
      statusText: res.statusText,
      responseHeaders,
      rawResponseBody: rawText.slice(0, 4000),
      parsedResponse: data,
      summary: res.ok
        ? `Health check passed (${data.runtime || 'server'} · HTTP ${res.status})`
        : `Health check failed with HTTP ${res.status}`,
      diagnosisHint: hint,
    });
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startedAt);
    recordZohoTrace({
      stage: 'SERVER_HEALTH',
      category: 'SERVER_RUNTIME',
      classification: 'NETWORK_ERROR',
      ok: false,
      durationMs,
      method: 'GET',
      url,
      httpStatus: 0,
      summary: `Network error reaching ${url}: ${err?.message || 'Failed to fetch'}`,
      diagnosisHint: 'The API server is unreachable or blocked by network/CORS.',
    });
    return { ok: false, status: 0, data: { error: err?.message || 'Network error' } };
  }
}

export async function auditClientZohoTokenStorage(email?: string | null): Promise<ClientStorageAuditResult> {
  const startedAt = performance.now();
  const firebaseAuthEmail = normalizeEmail(auth.currentUser?.email);
  const firebaseAuthUid = auth.currentUser?.uid || '';
  const cleanEmail = normalizeEmail(email || firebaseAuthEmail);
  const emailKey = cleanEmail ? normalizeEmailKey(cleanEmail) : '';

  const result: ClientStorageAuditResult = {
    email: cleanEmail,
    emailKey,
    firebaseAuthEmail,
    firebaseAuthUid,
    staffDirectoryStatus: 'missing',
    staffDirectoryDetail: 'No email available to look up staff_directory.',
    vaultDocStatus: 'missing',
    vaultDocDetail: 'No email available to look up staff_zoho_vault.',
    sharedOrgMetaStatus: 'missing',
    sharedOrgZsoid: '',
  };

  if (!emailKey) {
    recordZohoTrace({
      stage: 'TOKEN_STORAGE_AUDIT',
      category: 'TOKEN_STORAGE',
      classification: 'FIREBASE_AUTH_401',
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      storageAudit: result,
      summary: 'Cannot audit Firestore token storage: no signed-in staff email resolved.',
      diagnosisHint: 'Sign in with a valid team account first.',
    });
    return result;
  }

  // 1. Check staff_directory/{emailKey} (required by Firestore rules isActiveStaff() for non-admins!)
  try {
    const dirSnap = await getDoc(doc(db, 'staff_directory', emailKey));
    if (dirSnap.exists()) {
      const dirData = dirSnap.data() || {};
      const st = String(dirData.status || '');
      result.staffDirectoryStatus = st === 'Active' ? 'found_active' : 'found_inactive';
      result.staffDirectoryDetail = `staff_directory/${emailKey} exists (role=${dirData.role || 'unknown'}, status=${st || 'unset'}).`;
    } else {
      result.staffDirectoryStatus = 'missing';
      result.staffDirectoryDetail = `staff_directory/${emailKey} does not exist. Non-admin writes to staff_zoho_vault require an Active staff_directory record.`;
    }
  } catch (err: any) {
    const code = String(err?.code || '');
    result.staffDirectoryStatus = code.includes('permission') ? 'permission_denied' : 'error';
    result.staffDirectoryDetail = `${code || 'error'}: ${err?.message || 'Failed to read staff_directory'}`;
  }

  // 2. Check staff_zoho_vault/{emailKey} document schema & AES-256-GCM sealedVault envelope format
  try {
    const vaultSnap = await getDoc(doc(db, 'staff_zoho_vault', emailKey));
    if (vaultSnap.exists()) {
      const raw = (vaultSnap.data() || {}) as Record<string, any>;
      const requiredFields = ['id', 'staffEmail', 'sealedVault'];
      const missingFields = requiredFields.filter((f) => !raw[f] || typeof raw[f] !== 'string');
      const shape = inspectClientSealedVaultFormat(raw.sealedVault);
      const hasRequiredFields = missingFields.length === 0;
      result.vaultFormatChecks = {
        hasRequiredFields,
        missingFields,
        sealedVaultLength: shape.length,
        sealedVaultSegments: shape.segments,
        ivBytes: shape.ivBytes,
        tagBytes: shape.tagBytes,
        cipherBytes: shape.cipherBytes,
        validAesGcmShape: shape.validAesGcmShape,
        withinRulesSizeLimit: shape.withinRulesSizeLimit,
      };
      if (hasRequiredFields && shape.validAesGcmShape && shape.withinRulesSizeLimit) {
        result.vaultDocStatus = 'valid';
        result.vaultDocDetail = `staff_zoho_vault/${emailKey} valid (${shape.length} chars, 3-part AES-256-GCM, zohoEmail=${raw.zohoEmail || '—'}, zsoid=${raw.zsoid || '—'}).`;
      } else {
        result.vaultDocStatus = 'format_error';
        result.vaultDocDetail = `staff_zoho_vault/${emailKey} format mismatch: missing=[${missingFields.join(',')}], segments=${shape.segments}, iv=${shape.ivBytes}B, tag=${shape.tagBytes}B, len=${shape.length}.`;
      }
    } else {
      result.vaultDocStatus = 'missing';
      result.vaultDocDetail = `staff_zoho_vault/${emailKey} not found (expected before first Zoho connect or after disconnecting).`;
    }
  } catch (err: any) {
    const code = String(err?.code || '');
    result.vaultDocStatus = code.includes('permission') ? 'permission_denied' : 'error';
    result.vaultDocDetail = `${code || 'error'}: ${err?.message || 'Failed to read staff_zoho_vault'}`;
  }

  // 3. Check portal_settings/zoho_org_meta (shared org zsoid for non-admin presenters)
  try {
    const metaSnap = await getDoc(doc(db, 'portal_settings', 'zoho_org_meta'));
    if (metaSnap.exists()) {
      const zsoid = String(metaSnap.data()?.matrix?.zsoid || '').trim();
      result.sharedOrgMetaStatus = zsoid ? 'found' : 'missing';
      result.sharedOrgZsoid = zsoid;
    } else {
      result.sharedOrgMetaStatus = 'missing';
    }
  } catch (err: any) {
    const code = String(err?.code || '');
    result.sharedOrgMetaStatus = code.includes('permission') ? 'permission_denied' : 'error';
  }

  const hasPermError =
    result.vaultDocStatus === 'permission_denied' || result.staffDirectoryStatus === 'permission_denied';
  const hasFormatError = result.vaultDocStatus === 'format_error';
  const missingDir =
    result.staffDirectoryStatus === 'missing' && firebaseAuthEmail !== 'uppseekers@gmail.com';

  recordZohoTrace({
    stage: 'TOKEN_STORAGE_AUDIT',
    category: 'TOKEN_STORAGE',
    classification: hasFormatError
      ? 'TOKEN_STORAGE_FORMAT_ERROR'
      : hasPermError
      ? 'FIRESTORE_RULES_DENIED'
      : 'OK',
    ok: !hasPermError && !hasFormatError && !missingDir,
    durationMs: Math.round(performance.now() - startedAt),
    storageAudit: result,
    summary: hasFormatError
      ? result.vaultDocDetail
      : hasPermError
      ? `Firestore security rules denied read on staff_zoho_vault/${emailKey} (${result.vaultDocDetail})`
      : missingDir
      ? `Missing staff_directory/${emailKey} doc — non-admin counsellor vault writes will be rejected by Firestore rules.`
      : `${result.vaultDocDetail} Shared org zsoid: ${result.sharedOrgZsoid || 'not cached yet'}.`,
    diagnosisHint: hasFormatError
      ? 'Disconnect and reconnect Zoho to regenerate a clean 3-segment AES-256-GCM sealed vault.'
      : hasPermError || missingDir
      ? 'Have an Admin run Resync Portal Access in Team Settings so this counsellor has an Active staff_directory document.'
      : undefined,
  });

  return result;
}

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
  const startedAt = performance.now();
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
        const shape = inspectClientSealedVaultFormat(sealed);
        if (!shape.validAesGcmShape) {
          recordZohoTrace({
            stage: 'TOKEN_STORAGE_READ',
            category: 'TOKEN_STORAGE',
            classification: 'TOKEN_STORAGE_FORMAT_ERROR',
            ok: false,
            durationMs: Math.round(performance.now() - startedAt),
            storageAudit: { docPath: `staff_zoho_vault/${emailKey}`, ...shape },
            summary: `Loaded malformed sealedVault from Firestore staff_zoho_vault/${emailKey} (segments=${shape.segments}, iv=${shape.ivBytes}B, tag=${shape.tagBytes}B).`,
            diagnosisHint: 'Disconnect and reconnect Zoho to overwrite the corrupted sealedVault token envelope.',
          });
        }
        return sealed;
      }
    }
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code.includes('permission')) {
      recordZohoTrace({
        stage: 'TOKEN_STORAGE_READ',
        category: 'TOKEN_STORAGE',
        classification: 'FIRESTORE_RULES_DENIED',
        ok: false,
        durationMs: Math.round(performance.now() - startedAt),
        storageAudit: { docPath: `staff_zoho_vault/${emailKey}`, firestoreErrorCode: code, message: err?.message },
        summary: `Firestore denied reading staff_zoho_vault/${emailKey} (${code}).`,
        diagnosisHint: 'Ensure this counsellor has an Active staff_directory document matching their Firebase Auth email.',
      });
    }
  }
  return '';
}

export async function saveStaffZohoSealedVault(
  payload: Record<string, any>,
  fallbackEmail?: string | null,
  fallbackName?: string | null
): Promise<void> {
  const startedAt = performance.now();
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

  const shape = inspectClientSealedVaultFormat(sealedVault);
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
    recordZohoTrace({
      stage: 'TOKEN_STORAGE_WRITE',
      category: 'TOKEN_STORAGE',
      classification: shape.validAesGcmShape ? 'OK' : 'TOKEN_STORAGE_FORMAT_ERROR',
      ok: shape.validAesGcmShape,
      durationMs: Math.round(performance.now() - startedAt),
      storageAudit: {
        docPath: `staff_zoho_vault/${emailKey}`,
        zohoEmail: record.zohoEmail,
        zsoid: record.zsoid,
        sealedVaultFormat: shape,
      },
      summary: shape.validAesGcmShape
        ? `Persisted sealed Zoho vault to Firestore staff_zoho_vault/${emailKey} (${shape.length} chars, 3-part AES-256-GCM).`
        : `Saved vault to Firestore, but sealedVault shape failed validation (${shape.segments} segments).`,
    });
  } catch (err: any) {
    const code = String(err?.code || 'firestore_error');
    console.warn('Could not persist staff_zoho_vault to Firestore:', err);
    recordZohoTrace({
      stage: 'TOKEN_STORAGE_WRITE',
      category: 'TOKEN_STORAGE',
      classification: code.includes('permission') ? 'FIRESTORE_RULES_DENIED' : 'TOKEN_STORAGE_FORMAT_ERROR',
      ok: false,
      durationMs: Math.round(performance.now() - startedAt),
      storageAudit: {
        docPath: `staff_zoho_vault/${emailKey}`,
        firestoreErrorCode: code,
        errorMessage: err?.message || String(err),
        sealedVaultFormat: shape,
        recordFieldLengths: {
          id: record.id.length,
          staffEmail: record.staffEmail.length,
          sealedVault: record.sealedVault.length,
          zsoid: record.zsoid.length,
          zuid: record.zuid.length,
        },
      },
      summary: `Failed to write Firestore staff_zoho_vault/${emailKey}: ${code} (${err?.message || 'permission denied'})`,
      diagnosisHint: code.includes('permission')
        ? 'Firestore security rules blocked writing the counsellor token vault. Verify the user has an Active staff_directory entry matching their Firebase Auth email.'
        : 'Check field lengths and payload types against isValidStaffZohoVault in firestore.rules.',
    });
  }
}

export async function deleteStaffZohoSealedVault(email?: string | null): Promise<void> {
  const startedAt = performance.now();
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return;
  memorySealedVaultByEmail.delete(cleanEmail);
  const emailKey = normalizeEmailKey(cleanEmail);
  try {
    await deleteDoc(doc(db, 'staff_zoho_vault', emailKey));
    recordZohoTrace({
      stage: 'TOKEN_STORAGE_DELETE',
      category: 'TOKEN_STORAGE',
      classification: 'OK',
      ok: true,
      durationMs: Math.round(performance.now() - startedAt),
      storageAudit: { docPath: `staff_zoho_vault/${emailKey}` },
      summary: `Cleared Firestore vault staff_zoho_vault/${emailKey}.`,
    });
  } catch (err: any) {
    recordZohoTrace({
      stage: 'TOKEN_STORAGE_DELETE',
      category: 'TOKEN_STORAGE',
      classification: 'INFO',
      ok: true,
      durationMs: Math.round(performance.now() - startedAt),
      storageAudit: { docPath: `staff_zoho_vault/${emailKey}`, note: err?.code || 'already deleted' },
      summary: `Delete on staff_zoho_vault/${emailKey} skipped (${err?.code || 'already absent'}).`,
    });
  }
}

export function isTrustedZohoPostMessageOrigin(origin: string): boolean {
  if (!origin) return false;
  return (
    origin === window.location.origin ||
    origin.endsWith('.run.app') ||
    origin.endsWith('.vercel.app') ||
    origin === 'https://uppseekers.com' ||
    origin.endsWith('.uppseekers.com') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('https://localhost')
  );
}

export function subscribeToZohoOAuthMessages(
  onResult: (data: Record<string, any>) => void
): () => void {
  let lastHandledSig = '';

  const dispatchOnce = (raw: any, transport: 'postMessage' | 'BroadcastChannel' | 'localStorage', origin?: string) => {
    if (!raw || typeof raw !== 'object') return;
    if (raw.type !== 'ZOHO_OAUTH_SUCCESS' && raw.type !== 'ZOHO_OAUTH_ERROR') return;
    const sig = `${raw.type}:${raw._ts || ''}:${raw.staffKey || ''}:${raw.zohoEmail || ''}:${raw.error || ''}`;
    if (sig === lastHandledSig) return;
    lastHandledSig = sig;

    const isSuccess = raw.type === 'ZOHO_OAUTH_SUCCESS';
    const rawErr = String(raw.error || '').toLowerCase();
    const diagCategory: ZohoTraceCategory =
      raw?.diagnostics?.category || (isSuccess ? 'API_HANDSHAKE' : 'API_HANDSHAKE');
    const classification: ZohoTraceClassification = isSuccess
      ? 'OK'
      : rawErr.includes('redirect')
      ? 'REDIRECT_URI_MISMATCH'
      : rawErr.includes('refresh token')
      ? 'TOKEN_STORAGE_FORMAT_ERROR'
      : 'ZOHO_API_HANDSHAKE_ERROR';

    recordZohoTrace({
      stage: 'OAUTH_POPUP_EVENT',
      category: diagCategory,
      classification,
      ok: isSuccess,
      durationMs: 0,
      parsedResponse: {
        transport,
        origin: origin || window.location.origin,
        ...sanitizeJsonForTrace(raw),
      },
      summary: isSuccess
        ? `Popup returned ZOHO_OAUTH_SUCCESS via ${transport} (${raw.zohoEmail || raw.staffKey || 'verified'})`
        : `Popup returned ZOHO_OAUTH_ERROR via ${transport}: ${raw.error || 'Unknown OAuth callback error'}`,
      diagnosisHint: isSuccess ? undefined : raw.error,
    });

    onResult(raw);
  };

  const handleWindowMessage = (event: MessageEvent) => {
    if (!isTrustedZohoPostMessageOrigin(event.origin)) return;
    dispatchOnce(event.data, 'postMessage', event.origin);
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== 'uppseekers_zoho_oauth_event' || !event.newValue) return;
    try {
      dispatchOnce(JSON.parse(event.newValue), 'localStorage');
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
      bc.onmessage = (ev) => dispatchOnce(ev.data, 'BroadcastChannel');
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

function resolveStageFromEndpoint(endpointPath: string, method: string): string {
  if (endpointPath.startsWith('/api/zoho/auth/url')) return 'OAUTH_URL';
  if (endpointPath.startsWith('/api/zoho/status')) return 'STATUS_CHECK';
  if (endpointPath.startsWith('/api/zoho/connections')) return 'CONNECTIONS_LIST';
  if (endpointPath.startsWith('/api/zoho/test')) return 'LIVE_API_TEST';
  if (endpointPath.startsWith('/api/zoho/diagnostics/probe')) return 'DIAGNOSTIC_PROBE';
  if (endpointPath.startsWith('/api/zoho/meetings')) return 'MEETING_CREATE';
  if (endpointPath.startsWith('/api/zoho/connection') && method.toUpperCase() === 'DELETE') return 'DISCONNECT';
  return 'ZOHO_API_CALL';
}

export async function zohoAuthenticatedFetch(
  endpointPath: string,
  init: RequestInit = {},
  staffUser?: { email?: string | null; name?: string | null } | null
): Promise<{ ok: boolean; status: number; data: Record<string, any> }> {
  const startedAt = performance.now();
  const method = (init.method || 'GET').toUpperCase();
  const stage = resolveStageFromEndpoint(endpointPath, method);
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
  const vaultShape = inspectClientSealedVaultFormat(sealedVault);

  let lastTokenLen = 0;
  let retriedWithFreshToken = false;

  const executeAttempt = async (forceRefreshToken: boolean) => {
    const token = await getFirebaseIdToken(forceRefreshToken);
    lastTokenLen = token ? token.length : 0;
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

  const redactedRequestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-staff-email': email || '(none)',
    'x-staff-name': name || '(none)',
    'x-client-origin': clientOrigin || '(none)',
    'x-zoho-sealed-vault': vaultShape.present
      ? `<present, len=${vaultShape.length}, segments=${vaultShape.segments}, validShape=${vaultShape.validAesGcmShape}>`
      : '(not sent)',
  };

  let parsedReqBody: any = undefined;
  if (typeof init.body === 'string' && init.body.trim()) {
    try {
      parsedReqBody = sanitizeJsonForTrace(JSON.parse(init.body));
    } catch {
      parsedReqBody = init.body.slice(0, 400);
    }
  }

  try {
    let res = await executeAttempt(false);
    if (res.status === 401) {
      retriedWithFreshToken = true;
      res = await executeAttempt(true);
    }

    redactedRequestHeaders.Authorization = lastTokenLen
      ? `Bearer <redacted Firebase JWT, len=${lastTokenLen}${retriedWithFreshToken ? ', force-refreshed' : ''}>`
      : '(missing Firebase ID token)';

    const durationMs = Math.round(performance.now() - startedAt);
    const responseHeaders = extractDiagnosticHeaders(res.headers);
    const rawText = await res.text().catch(() => '');
    let data: Record<string, any> = {};
    let isJsonResponse = false;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
        isJsonResponse = true;
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

    const { category, classification, hint } = classifyHttpTrace(
      endpointPath,
      res.status,
      rawText,
      data,
      responseHeaders
    );

    recordZohoTrace({
      stage,
      category,
      classification,
      ok: res.ok,
      durationMs,
      method,
      url: urlWithParams,
      httpStatus: res.status,
      statusText: res.statusText,
      requestHeaders: redactedRequestHeaders,
      requestBody: parsedReqBody,
      responseHeaders,
      rawResponseBody: !isJsonResponse || !res.ok ? rawText.slice(0, 4000) : undefined,
      parsedResponse: sanitizeJsonForTrace(data),
      summary: res.ok
        ? `${method} ${endpointPath} -> HTTP ${res.status} (${durationMs} ms)`
        : `${method} ${endpointPath} -> HTTP ${res.status}: ${data.error || res.statusText || 'Request failed'}`,
      diagnosisHint: hint,
    });

    if (data?.sharedOrgZsoid) {
      cachedSharedOrgZsoid = String(data.sharedOrgZsoid);
    }

    if (data?.sealedVault && email) {
      void saveStaffZohoSealedVault(data, email, name);
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startedAt);
    recordZohoTrace({
      stage,
      category: 'SERVER_RUNTIME',
      classification: 'NETWORK_ERROR',
      ok: false,
      durationMs,
      method,
      url: urlWithParams,
      httpStatus: 0,
      requestHeaders: redactedRequestHeaders,
      requestBody: parsedReqBody,
      summary: `${method} ${endpointPath} failed with network error: ${err?.message || 'Failed to fetch'}`,
      diagnosisHint: 'Browser could not complete the request. Check network connectivity or server availability.',
    });
    return {
      ok: false,
      status: 0,
      data: { error: err?.message || 'Network error calling Zoho API route.' },
    };
  }
}
