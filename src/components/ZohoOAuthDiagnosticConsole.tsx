import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play,
  Copy,
  Check,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { StaffMember } from '@/types';
import {
  ClientStorageAuditResult,
  ZohoTraceEntry,
  auditClientZohoTokenStorage,
  clearZohoTraceLog,
  getZohoTraceLog,
  probeServerHealth,
  subscribeZohoTraceLog,
  zohoAuthenticatedFetch,
} from '@/lib/zohoClient';
import { cn } from '@/lib/utils';

interface ServerProbeStage {
  stage: string;
  category: 'SERVER_RUNTIME' | 'AUTH_SESSION' | 'TOKEN_STORAGE' | 'API_HANDSHAKE';
  status: 'pass' | 'warn' | 'fail';
  durationMs: number;
  summary: string;
  data?: Record<string, any>;
}

interface ServerCallbackEvent {
  id: string;
  timestamp: string;
  stage: string;
  category: 'API_HANDSHAKE' | 'TOKEN_STORAGE' | 'AUTH_SESSION' | 'SERVER_RUNTIME';
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  staffKey?: string;
  redirectUri?: string;
  accountsServer?: string;
  meetingBase?: string;
  summary: string;
  details?: Record<string, any>;
}

interface ServerProbeResponse {
  ok: boolean;
  checkedAt?: string;
  totalDurationMs?: number;
  verdict?: {
    status: 'pass' | 'fail';
    rootCauseCategory: string;
    headline: string;
    recommendation: string;
  };
  stages?: ServerProbeStage[];
  recentServerEvents?: ServerCallbackEvent[];
  error?: string;
}

type FilterMode = 'all' | 'errors' | 'handshake' | 'storage' | 'server_callbacks';

interface Props {
  currentUser: StaffMember;
  compact?: boolean;
}

function formatClock(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case 'SERVER_RUNTIME':
      return 'Server Runtime';
    case 'AUTH_SESSION':
      return 'Auth Session';
    case 'TOKEN_STORAGE':
      return 'Token Storage';
    case 'API_HANDSHAKE':
      return 'API Handshake';
    default:
      return cat;
  }
}

export default function ZohoOAuthDiagnosticConsole({ currentUser, compact = false }: Props) {
  const [traces, setTraces] = useState<ZohoTraceEntry[]>(() => getZohoTraceLog());
  const [serverProbe, setServerProbe] = useState<ServerProbeResponse | null>(null);
  const [clientStorageAudit, setClientStorageAudit] = useState<ClientStorageAuditResult | null>(null);
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [suiteError, setSuiteError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedDump, setCopiedDump] = useState(false);

  useEffect(() => {
    setTraces(getZohoTraceLog());
    return subscribeZohoTraceLog(() => {
      setTraces([...getZohoTraceLog()]);
    });
  }, []);

  const handleRunFullSuite = async () => {
    setIsRunningSuite(true);
    setSuiteError(null);
    try {
      // 1. Server health / cold-start runtime check
      await probeServerHealth();

      // 2. Client Firestore token storage format & security rules check
      const storageRes = await auditClientZohoTokenStorage(currentUser?.email);
      setClientStorageAudit(storageRes);

      // 3. Status endpoint check (verifies Firebase auth + server vault read)
      await zohoAuthenticatedFetch('/api/zoho/status', { method: 'GET' }, currentUser);

      // 4. OAuth Authorize URL generation check (exact endpoint hit when clicking Connect)
      await zohoAuthenticatedFetch('/api/zoho/auth/url', { method: 'GET' }, currentUser);

      // 5. Server-side 4-stage deep diagnostic probe (crypto/format/handshake + server callback log)
      const probeRes = await zohoAuthenticatedFetch(
        '/api/zoho/diagnostics/probe',
        { method: 'POST', body: JSON.stringify({}) },
        currentUser
      );

      if (probeRes.ok && probeRes.data) {
        setServerProbe(probeRes.data as ServerProbeResponse);
      } else {
        setServerProbe({
          ok: false,
          checkedAt: new Date().toISOString(),
          error:
            probeRes.data?.error ||
            `Diagnostic probe endpoint returned HTTP ${probeRes.status}. Inspect the raw trace entry below.`,
        });
        setSuiteError(
          probeRes.data?.error ||
            `Server returned HTTP ${probeRes.status} on /api/zoho/diagnostics/probe.`
        );
      }

      // Auto-expand the first error trace if any step failed, otherwise expand the newest trace
      const latest = getZohoTraceLog();
      const firstErr = latest.find((t) => !t.ok || (t.httpStatus && t.httpStatus >= 500));
      if (firstErr) {
        setExpandedId(firstErr.id);
      } else if (latest[0]) {
        setExpandedId(latest[0].id);
      }
    } catch (err: any) {
      setSuiteError(err?.message || 'Unexpected error while running diagnostic suite.');
    } finally {
      setIsRunningSuite(false);
    }
  };

  const errorTraces = useMemo(
    () => traces.filter((t) => !t.ok || (typeof t.httpStatus === 'number' && t.httpStatus >= 400)),
    [traces]
  );

  const serverEvents = serverProbe?.recentServerEvents || [];

  const filteredTraces = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return traces.filter((t) => {
      if (filterMode === 'errors' && t.ok && (!t.httpStatus || t.httpStatus < 400)) return false;
      if (filterMode === 'handshake' && t.category !== 'API_HANDSHAKE') return false;
      if (filterMode === 'storage' && t.category !== 'TOKEN_STORAGE') return false;
      if (!q) return true;
      const haystack = [
        t.stage,
        t.url,
        t.summary,
        t.diagnosisHint,
        t.rawResponseBody,
        String(t.httpStatus || ''),
        t.classification,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [traces, filterMode, searchTerm]);

  const filteredServerEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return serverEvents;
    return serverEvents.filter((evt) =>
      [evt.stage, evt.staffKey, evt.summary, evt.redirectUri, String(evt.httpStatus)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [serverEvents, searchTerm]);

  const pillarSummaries = useMemo(() => {
    const stages = serverProbe?.stages || [];
    const byCat = (cat: ServerProbeStage['category']) => stages.find((s) => s.category === cat);
    const last500 = traces.find((t) => typeof t.httpStatus === 'number' && t.httpStatus >= 500);
    const last401 = traces.find((t) => t.httpStatus === 401);
    const lastStorageFail = traces.find((t) => t.category === 'TOKEN_STORAGE' && !t.ok);
    const lastHandshakeFail = traces.find((t) => t.category === 'API_HANDSHAKE' && !t.ok);

    const runtimeStage = byCat('SERVER_RUNTIME');
    const authStage = byCat('AUTH_SESSION');
    const storageStage = byCat('TOKEN_STORAGE');
    const handshakeStage = byCat('API_HANDSHAKE');

    return [
      {
        key: 'SERVER_RUNTIME',
        label: 'Server Runtime & HTTP 500',
        status: last500
          ? 'fail'
          : runtimeStage
          ? runtimeStage.status
          : traces.some((t) => t.stage === 'SERVER_HEALTH' && t.ok)
          ? 'pass'
          : 'idle',
        detail: last500
          ? `HTTP ${last500.httpStatus} captured on ${last500.url || last500.stage}${
              last500.responseHeaders?.['x-vercel-id']
                ? ` · ${last500.responseHeaders['x-vercel-id']}`
                : ''
            }`
          : runtimeStage
          ? runtimeStage.summary
          : 'Run suite to verify serverless runtime & env.',
      },
      {
        key: 'AUTH_SESSION',
        label: 'Firebase Auth & Identity',
        status: last401 ? 'fail' : authStage ? authStage.status : 'idle',
        detail: last401
          ? `HTTP 401 on ${last401.url || last401.stage} — Firebase ID token rejected.`
          : authStage
          ? authStage.summary
          : `Signed in as ${currentUser?.email || 'unknown'}`,
      },
      {
        key: 'TOKEN_STORAGE',
        label: 'Token Storage Format',
        status: lastStorageFail
          ? 'fail'
          : clientStorageAudit &&
            (clientStorageAudit.vaultDocStatus === 'format_error' ||
              clientStorageAudit.vaultDocStatus === 'permission_denied')
          ? 'fail'
          : storageStage
          ? storageStage.status
          : 'idle',
        detail: lastStorageFail
          ? lastStorageFail.summary
          : storageStage
          ? storageStage.summary
          : clientStorageAudit
          ? clientStorageAudit.vaultDocDetail
          : 'Checks AES-256-GCM 3-segment vault & Firestore rules.',
      },
      {
        key: 'API_HANDSHAKE',
        label: 'Zoho API Handshake',
        status: lastHandshakeFail ? 'fail' : handshakeStage ? handshakeStage.status : 'idle',
        detail: lastHandshakeFail
          ? lastHandshakeFail.summary
          : handshakeStage
          ? handshakeStage.summary
          : 'Checks authorize URL, redirect URI & Zoho API v2.',
      },
    ] as const;
  }, [serverProbe, traces, clientStorageAudit, currentUser?.email]);

  const buildDiagnosticReport = () => ({
    exportedAt: new Date().toISOString(),
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    staffEmail: currentUser?.email || '',
    staffRole: currentUser?.role || '',
    clientStorageAudit,
    serverProbe,
    traceLog: traces,
  });

  const handleCopyReport = () => {
    const serialized = JSON.stringify(buildDiagnosticReport(), null, 2);
    navigator.clipboard?.writeText(serialized).catch(() => {});
    setCopiedDump(true);
    window.setTimeout(() => setCopiedDump(false), 2000);
  };

  const handleDownloadReport = () => {
    const serialized = JSON.stringify(buildDiagnosticReport(), null, 2);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoho-oauth-diagnostics-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderStatusText = (status: 'pass' | 'warn' | 'fail' | 'idle') => {
    if (status === 'pass') {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Pass
        </span>
      );
    }
    if (status === 'warn') {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
          Notice
        </span>
      );
    }
    if (status === 'fail') {
      return (
        <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-xs whitespace-nowrap shrink-0">
          <AlertCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    }
    return <span className="text-slate-400 font-medium text-xs whitespace-nowrap shrink-0">Pending</span>;
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden text-left">
      {/* Header Toolbar */}
      <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">
            Zoho OAuth Request/Response &amp; Token Storage Diagnostics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Logs live HTTP requests, raw HTTP 500 server payloads, Vercel error IDs, and AES-256-GCM / Firestore vault format checks to isolate handshake vs. storage faults.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={handleRunFullSuite}
            disabled={isRunningSuite}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 px-4 whitespace-nowrap shrink-0"
          >
            {isRunningSuite ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Running Probes...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Run Full Diagnostic Suite
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyReport}
            className="bg-white border-slate-300 text-slate-700 text-xs h-9 px-3 whitespace-nowrap shrink-0"
          >
            {copiedDump ? (
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1.5" />
            )}
            {copiedDump ? 'Copied JSON' : 'Copy JSON'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            className="bg-white border-slate-300 text-slate-700 text-xs h-9 px-3 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              clearZohoTraceLog();
              setExpandedId(null);
            }}
            className="bg-white border-slate-300 text-slate-600 hover:text-red-700 text-xs h-9 px-3 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear
          </Button>
        </div>
      </div>

      {/* Root-Cause Isolation Strip (4 Pillars, Hairline Divided) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 bg-white">
        {pillarSummaries.map((pillar) => (
          <div key={pillar.key} className="p-4 space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900 truncate">{pillar.label}</span>
              {renderStatusText(pillar.status)}
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed break-words">
              {pillar.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Verdict / Suite Error Banner */}
      {(serverProbe?.verdict || suiteError) && (
        <div
          className={cn(
            'px-5 py-3 border-b border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2',
            suiteError || serverProbe?.verdict?.status === 'fail'
              ? 'bg-red-50/80 text-red-950'
              : 'bg-emerald-50/70 text-emerald-950'
          )}
        >
          <div className="flex items-start gap-2 min-w-0">
            {suiteError || serverProbe?.verdict?.status === 'fail' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <span className="font-semibold">
                {suiteError || serverProbe?.verdict?.headline}
              </span>
              {!suiteError && serverProbe?.verdict?.recommendation && (
                <span className="text-slate-700 ml-1.5">
                  — {serverProbe.verdict.recommendation}
                </span>
              )}
            </div>
          </div>
          {serverProbe?.checkedAt && (
            <span className="font-mono tabular-nums text-[11px] text-slate-500 whitespace-nowrap shrink-0">
              {formatClock(serverProbe.checkedAt)} · {serverProbe.totalDurationMs ?? 0} ms
            </span>
          )}
        </div>
      )}

      {/* Client Firestore Token Storage Format Inspector (shown once audited) */}
      {clientStorageAudit && !compact && (
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="font-semibold text-slate-900">
              Client Firestore Token Vault Format Check ({clientStorageAudit.emailKey || 'unset'})
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Auth: {clientStorageAudit.firebaseAuthEmail || 'none'} · Directory: {clientStorageAudit.staffDirectoryStatus} · Vault: {clientStorageAudit.vaultDocStatus} · Shared zsoid: {clientStorageAudit.sharedOrgZsoid || 'unset'}
            </span>
          </div>
          {clientStorageAudit.vaultFormatChecks && (
            <div className="font-mono tabular-nums text-[11px] text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Envelope segments: {clientStorageAudit.vaultFormatChecks.sealedVaultSegments}/3</span>
              <span aria-hidden="true">·</span>
              <span>IV: {clientStorageAudit.vaultFormatChecks.ivBytes}B (req 12B)</span>
              <span aria-hidden="true">·</span>
              <span>AuthTag: {clientStorageAudit.vaultFormatChecks.tagBytes}B (req 16B)</span>
              <span aria-hidden="true">·</span>
              <span>Ciphertext: {clientStorageAudit.vaultFormatChecks.cipherBytes}B</span>
              <span aria-hidden="true">·</span>
              <span>Size: {clientStorageAudit.vaultFormatChecks.sealedVaultLength}/8000 chars</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  clientStorageAudit.vaultFormatChecks.validAesGcmShape
                    ? 'text-emerald-700 font-semibold'
                    : 'text-red-700 font-semibold'
                }
              >
                {clientStorageAudit.vaultFormatChecks.validAesGcmShape ? 'AES-256-GCM Shape Valid' : 'Invalid Envelope Shape'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar & Search */}
      <div className="px-5 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {(
            [
              { id: 'all', label: `All Events (${traces.length})` },
              { id: 'errors', label: `Errors & 500s (${errorTraces.length})` },
              { id: 'handshake', label: 'API Handshake' },
              { id: 'storage', label: 'Token Storage' },
              { id: 'server_callbacks', label: `Server Callbacks (${serverEvents.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0',
                filterMode === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by 500, URL, error..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Table View: Either Client Request/Response Trace Log OR Server Callback Events */}
      {filterMode === 'server_callbacks' ? (
        filteredServerEvents.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-900">No server-side OAuth callback events captured on this instance yet</p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Click <span className="font-semibold text-slate-700">Connect My Zoho Account</span> to trigger the OAuth callback, then click <span className="font-semibold text-slate-700">Run Full Diagnostic Suite</span> to pull the server-side callback log.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 whitespace-nowrap">Time</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Server Stage</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Staff</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">HTTP</th>
                  <th className="px-4 py-2.5">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServerEvents.map((evt) => {
                  const isOpen = expandedId === evt.id;
                  return (
                    <React.Fragment key={evt.id}>
                      <tr
                        onClick={() => setExpandedId(isOpen ? null : evt.id)}
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {formatClock(evt.timestamp)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-900 font-semibold whitespace-nowrap">
                          {evt.stage}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                          {evt.staffKey || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-mono tabular-nums whitespace-nowrap">
                          <span className={evt.ok ? 'text-emerald-700 font-semibold' : 'text-red-700 font-semibold'}>
                            {evt.httpStatus || (evt.ok ? '200' : 'ERR')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 max-w-md truncate">{evt.summary}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={5} className="px-5 py-4">
                            <div className="space-y-2 text-[11px] font-mono">
                              <div className="text-slate-600">
                                Redirect URI: <span className="text-slate-900 break-all">{evt.redirectUri || '—'}</span>
                                {' · '}DC: <span className="text-slate-900">{evt.accountsServer || '—'}</span>
                              </div>
                              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto max-h-60 whitespace-pre-wrap break-words">
                                {JSON.stringify(evt.details || {}, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : filteredTraces.length === 0 ? (
        <div className="p-8 text-center space-y-2">
          <p className="text-xs font-semibold text-slate-900">
            {traces.length === 0
              ? 'No OAuth request/response traces recorded yet'
              : 'No trace entries match your active filter'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click <span className="font-semibold text-slate-700">Run Full Diagnostic Suite</span> or attempt <span className="font-semibold text-slate-700">Connect My Zoho Account</span> to capture the full HTTP request/response cycle and any HTTP 500 payloads.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-2.5 whitespace-nowrap">Time</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Stage / Endpoint</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Category</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                <th className="px-4 py-2.5 text-right whitespace-nowrap">Duration</th>
                <th className="px-4 py-2.5">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTraces.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const is5xx = typeof entry.httpStatus === 'number' && entry.httpStatus >= 500;
                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        is5xx
                          ? 'bg-red-50/40 hover:bg-red-50/80'
                          : !entry.ok
                          ? 'bg-amber-50/30 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {formatClock(entry.timestamp)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-900">
                          {entry.method ? `${entry.method} ` : ''}
                          {entry.stage}
                        </div>
                        {entry.url && (
                          <div className="text-[11px] font-mono text-slate-500 max-w-[260px] truncate">
                            {entry.url}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        {categoryLabel(entry.category)}
                      </td>
                      <td className="px-4 py-2.5 font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={cn(
                            'font-semibold',
                            entry.ok
                              ? 'text-emerald-700'
                              : is5xx
                              ? 'text-red-700'
                              : 'text-amber-700'
                          )}
                        >
                          {typeof entry.httpStatus === 'number'
                            ? entry.httpStatus === 0
                              ? 'NET_ERR'
                              : `HTTP ${entry.httpStatus}`
                            : entry.ok
                            ? 'OK'
                            : 'FAIL'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {entry.durationMs} ms
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 max-w-md truncate">
                        {entry.summary}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={6} className="px-5 py-4 space-y-4">
                          {entry.diagnosisHint && (
                            <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800">
                              <span className="font-semibold text-slate-900">Root-Cause Hint ({entry.classification}): </span>
                              {entry.diagnosisHint}
                            </div>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-[11px]">
                            {/* Request Column */}
                            <div className="space-y-2 min-w-0">
                              <p className="font-semibold text-slate-900">Request Context (Secrets Redacted)</p>
                              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto max-h-64 font-mono whitespace-pre-wrap break-words">
                                {JSON.stringify(
                                  {
                                    method: entry.method || 'CLIENT_EVENT',
                                    url: entry.url || '(local)',
                                    headers: entry.requestHeaders || undefined,
                                    body: entry.requestBody || undefined,
                                    storageAudit: entry.storageAudit || undefined,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>

                            {/* Response / Raw 500 Body Column */}
                            <div className="space-y-2 min-w-0">
                              <p className="font-semibold text-slate-900">
                                Response Payload &amp; Headers
                                {is5xx ? ' (HTTP 500 Raw Detail)' : ''}
                              </p>
                              {entry.rawResponseBody && (
                                <div className="space-y-1">
                                  <span className="text-[11px] font-semibold text-red-700 block">
                                    Raw Server Response Body:
                                  </span>
                                  <pre className="p-3 bg-red-950 text-red-100 rounded-lg overflow-x-auto max-h-40 font-mono whitespace-pre-wrap break-words">
                                    {entry.rawResponseBody}
                                  </pre>
                                </div>
                              )}
                              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto max-h-64 font-mono whitespace-pre-wrap break-words">
                                {JSON.stringify(
                                  {
                                    httpStatus: entry.httpStatus,
                                    statusText: entry.statusText,
                                    responseHeaders: entry.responseHeaders || undefined,
                                    parsedResponse: entry.parsedResponse || undefined,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
