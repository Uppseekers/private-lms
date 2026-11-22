import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Video,
  Unplug,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { StaffMember } from '@/types';
import {
  deleteStaffZohoSealedVault,
  listAllStaffZohoVaultDocs,
  readStaffZohoSealedVault,
  saveSharedOrgZsoid,
  saveStaffZohoSealedVault,
  subscribeToZohoOAuthMessages,
  zohoAuthenticatedFetch,
} from '@/lib/zohoClient';
import { cn } from '@/lib/utils';
import ZohoOAuthDiagnosticConsole from './ZohoOAuthDiagnosticConsole';

interface ZohoConnectionSummary {
  staffKey: string;
  staffEmail: string;
  staffName: string;
  zohoEmail: string;
  zohoDisplayName: string;
  zsoid: string;
  zuid: string;
  connectedAt?: string;
  updatedAt?: string;
}

interface DiagnosticsState {
  loading: boolean;
  configured: boolean;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasAppUrl: boolean;
  redirectUri: string;
  redirectUriSource?: string;
  clientIdPreview?: string;
  clientIdValidFormat?: boolean;
  clientSecretLength?: number;
  secretLooksLikeClientId?: boolean;
  connections: ZohoConnectionSummary[];
  error?: string;
}

interface Props {
  currentUser: StaffMember;
  employeeOnlyMode?: boolean;
}

const PRODUCTION_ORIGIN = 'https://users.uppseekers.com';
const PRODUCTION_CALLBACK_URL = `${PRODUCTION_ORIGIN}/api/zoho/oauth/callback`;
const DEV_ORIGIN = 'https://ais-dev-ad6i7xzq6z67b7dvfben3e-916026696776.asia-southeast1.run.app';
const SHARED_ORIGIN = 'https://ais-pre-ad6i7xzq6z67b7dvfben3e-916026696776.asia-southeast1.run.app';
const DEV_CALLBACK_URL = `${DEV_ORIGIN}/api/zoho/oauth/callback`;
const SHARED_CALLBACK_URL = `${SHARED_ORIGIN}/api/zoho/oauth/callback`;

export default function ZohoSetupDiagnosticsPanel({ currentUser, employeeOnlyMode = false }: Props) {
  const [diag, setDiag] = useState<DiagnosticsState>({
    loading: true,
    configured: false,
    hasClientId: false,
    hasClientSecret: false,
    hasAppUrl: false,
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/api/zoho/oauth/callback` : DEV_CALLBACK_URL,
    connections: [],
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [disconnectingKey, setDisconnectingKey] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showEmployeeDiagnostics, setShowEmployeeDiagnostics] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    zohoEmail?: string;
    zsoid?: string;
    latencyMs?: number;
    checkedAt?: string;
    error?: string;
  } | null>(null);

  const loadDiagnostics = async () => {
    setDiag(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      const [{ ok, data }, vaultDocs] = await Promise.all([
        zohoAuthenticatedFetch('/api/zoho/connections', { method: 'GET' }, currentUser),
        employeeOnlyMode ? Promise.resolve([]) : listAllStaffZohoVaultDocs(),
      ]);
      if (!ok) {
        setDiag(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to read Zoho server diagnostics.',
        }));
        return;
      }

      const byKey = new Map<string, ZohoConnectionSummary>();
      const serverConns: ZohoConnectionSummary[] = Array.isArray(data.connections) ? data.connections : [];
      for (const c of serverConns) {
        if (c?.staffKey) {
          byKey.set(c.staffKey.toLowerCase(), c);
        }
      }
      for (const v of vaultDocs) {
        const key = (v.staffEmail || '').trim().toLowerCase();
        if (key && !byKey.has(key)) {
          byKey.set(key, {
            staffKey: key,
            staffEmail: v.staffEmail,
            staffName: v.staffName || v.staffEmail,
            zohoEmail: v.zohoEmail,
            zohoDisplayName: v.zohoDisplayName,
            zsoid: v.zsoid,
            zuid: v.zuid,
            connectedAt: v.connectedAt,
            updatedAt: v.updatedAt,
          });
        }
      }

      const mergedConnections = Array.from(byKey.values());
      const firstOrgZsoid = data.sharedOrgZsoid || mergedConnections[0]?.zsoid;
      if (!employeeOnlyMode && firstOrgZsoid) {
        void saveSharedOrgZsoid(firstOrgZsoid);
      }

      setDiag({
        loading: false,
        configured: Boolean(data.configured),
        hasClientId: Boolean(data.hasClientId),
        hasClientSecret: Boolean(data.hasClientSecret),
        hasAppUrl: Boolean(data.hasAppUrl),
        redirectUri: data.redirectUri || DEV_CALLBACK_URL,
        redirectUriSource: data.redirectUriSource || (data.hasAppUrl ? 'APP_URL' : 'HOST_FALLBACK'),
        clientIdPreview: data.clientIdPreview || '',
        clientIdValidFormat: data.clientIdValidFormat !== false,
        clientSecretLength: typeof data.clientSecretLength === 'number' ? data.clientSecretLength : 0,
        secretLooksLikeClientId: Boolean(data.secretLooksLikeClientId),
        connections: mergedConnections,
      });
    } catch (err: any) {
      setDiag(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Network error reading diagnostics.',
      }));
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    return subscribeToZohoOAuthMessages((payload) => {
      if (payload.type === 'ZOHO_OAUTH_SUCCESS') {
        setIsConnecting(false);
        void saveStaffZohoSealedVault(payload, currentUser?.email, currentUser?.name).then(() => {
          loadDiagnostics();
        });
        setActionBanner({
          type: 'success',
          message: `Connected Zoho account (${payload.zohoEmail || payload.zohoDisplayName || 'Verified'}).`,
        });
      } else if (payload.type === 'ZOHO_OAUTH_ERROR') {
        setIsConnecting(false);
        setActionBanner({
          type: 'error',
          message: payload.error || 'Zoho OAuth did not complete.',
        });
      }
    });
  }, [currentUser?.id, currentUser?.email]);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey(prev => (prev === key ? null : prev));
    }, 1800);
  };

  const handleConnectZoho = async () => {
    setActionBanner(null);
    setIsConnecting(true);
    try {
      const { ok, status, data } = await zohoAuthenticatedFetch('/api/zoho/auth/url', { method: 'GET' }, currentUser);
      if (!ok || !data.url) {
        if (employeeOnlyMode) {
          setShowEmployeeDiagnostics(true);
        }
        setActionBanner({
          type: 'error',
          message:
            data.error ||
            (status === 401
              ? 'Your login session expired. Please sign out and sign back in, then click Connect again.'
              : `Could not start Zoho OAuth (HTTP ${status}). Verify ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are set.`),
        });
        setIsConnecting(false);
        return;
      }

      const width = 620;
      const height = 720;
      const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
      const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
      const popup = window.open(
        data.url,
        'zoho_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      if (!popup || popup.closed) {
        setActionBanner({
          type: 'error',
          message: 'Popup was blocked by the browser. Allow popups for this site and click Connect again.',
        });
        setIsConnecting(false);
        return;
      }
      const timer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(timer);
          setIsConnecting(false);
          window.setTimeout(() => {
            void loadDiagnostics();
          }, 400);
        }
      }, 500);
    } catch (err: any) {
      setActionBanner({ type: 'error', message: err?.message || 'Network error starting OAuth.' });
      setIsConnecting(false);
    }
  };

  const handleRunTest = async (targetStaffKey?: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const targetSealedVault = targetStaffKey ? await readStaffZohoSealedVault(targetStaffKey) : '';
      const { data } = await zohoAuthenticatedFetch(
        '/api/zoho/test',
        {
          method: 'POST',
          body: JSON.stringify(
            targetStaffKey
              ? { staffKey: targetStaffKey, ...(targetSealedVault ? { sealedVault: targetSealedVault } : {}) }
              : {}
          ),
        },
        currentUser
      );
      setTestResult({
        ok: Boolean(data.ok),
        zohoEmail: data.zohoEmail,
        zsoid: data.zsoid,
        latencyMs: data.latencyMs,
        checkedAt: data.checkedAt,
        error: data.error,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: err?.message || 'Failed to reach Zoho test endpoint.',
      });
    }
    setIsTesting(false);
  };

  const handleDisconnect = async (staffKey: string) => {
    setDisconnectingKey(staffKey);
    setActionBanner(null);
    try {
      const { ok, data } = await zohoAuthenticatedFetch(
        `/api/zoho/connection?staffKey=${encodeURIComponent(staffKey)}`,
        { method: 'DELETE' },
        currentUser
      );
      if (!ok) {
        setActionBanner({ type: 'error', message: data.error || 'Failed to disconnect counselor.' });
      } else {
        await deleteStaffZohoSealedVault(staffKey);
        setActionBanner({ type: 'info', message: `Disconnected Zoho Meeting account for ${staffKey}.` });
        await loadDiagnostics();
      }
    } catch {
      setActionBanner({ type: 'error', message: 'Network error while disconnecting.' });
    }
    setDisconnectingKey(null);
  };

  const myEmailKey = (currentUser?.email || '').trim().toLowerCase();
  const myConnection = diag.connections.find(
    c => c.staffKey === myEmailKey || c.staffEmail.toLowerCase() === myEmailKey
  );
  const isCurrentUserConnected = Boolean(myConnection);
  const sharedOrgId = diag.connections[0]?.zsoid;

  if (employeeOnlyMode) {
    return (
      <Card className="border-slate-200 shadow-sm text-left">
        <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-600" />
              My Zoho Meeting Account
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect your Zoho Meeting seat ({currentUser?.email}) to automatically generate join &amp; host links in Class Scheduler.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadDiagnostics}
            disabled={diag.loading}
            className="bg-white text-xs h-8 px-3 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', diag.loading && 'animate-spin')} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-xs">
          {actionBanner && (
            <div
              className={cn(
                'p-3 rounded-lg border flex items-start gap-2',
                actionBanner.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : actionBanner.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              )}
            >
              {actionBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 min-w-0">
                <p className="font-semibold">{actionBanner.message}</p>
                {actionBanner.type === 'error' && diag.redirectUri && (
                  <p className="text-[11px] font-mono break-all opacity-80">
                    Active Redirect URI: {diag.redirectUri}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', isCurrentUserConnected ? 'bg-emerald-500' : 'bg-amber-400')} />
                <span className="font-bold text-slate-900 text-sm">
                  {diag.loading
                    ? 'Checking connection...'
                    : isCurrentUserConnected
                    ? `Connected: ${myConnection?.zohoEmail || myConnection?.zohoDisplayName}`
                    : 'Not Connected Yet'}
                </span>
              </div>
              <p className="text-slate-600">
                {isCurrentUserConnected
                  ? `Zoho Organization ID (zsoid): ${myConnection?.zsoid || 'Verified'}`
                  : 'Sign in with the Zoho email invited to your Uppseekers Zoho Meeting organization.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={handleConnectZoho}
                disabled={isConnecting || !diag.configured}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 mr-1.5" />
                    {isCurrentUserConnected ? 'Reconnect Zoho' : 'Connect My Zoho Account'}
                  </>
                )}
              </Button>
              {isCurrentUserConnected && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRunTest()}
                    disabled={isTesting}
                    className="bg-white text-slate-800 border-slate-300 text-xs font-semibold h-9 px-3"
                  >
                    <Activity className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDisconnect(myEmailKey)}
                    disabled={disconnectingKey === myEmailKey}
                    className="bg-white text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold h-9 px-3"
                  >
                    <Unplug className="w-3.5 h-3.5 mr-1.5" />
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>

          {testResult && (
            <div
              className={cn(
                'p-3 rounded-lg border text-xs',
                testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-950'
              )}
            >
              <span className="font-semibold">
                {testResult.ok
                  ? `Handshake Verified (${testResult.zohoEmail} · zsoid ${testResult.zsoid})`
                  : `Test Failed: ${testResult.error}`}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Seeing an HTTP 500 or connection error? Run the live OAuth trace &amp; token storage inspector.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmployeeDiagnostics((prev) => !prev)}
              className="bg-white border-slate-300 text-slate-800 text-xs h-8 px-3 whitespace-nowrap shrink-0"
            >
              <Activity className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              {showEmployeeDiagnostics ? 'Hide OAuth Trace Utility' : 'Open OAuth Trace Utility'}
            </Button>
          </div>

          {showEmployeeDiagnostics && (
            <div className="pt-2">
              <ZohoOAuthDiagnosticConsole currentUser={currentUser} compact />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 md:col-span-2">
      {/* Row 1: Console Walkthrough + Live Server Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Step-by-Step Zoho API Console Guide */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between gap-4 py-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Zoho API Console Setup (.com Shared Org)
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Starting from Choose a Client Type on api-console.zoho.com
              </p>
            </div>
            <a
              href="https://api-console.zoho.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 whitespace-nowrap shrink-0"
            >
              Open Console <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </CardHeader>

          <CardContent className="p-6 space-y-5 text-xs text-slate-700">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">01.</span>
                <div>
                  <p className="font-semibold text-slate-900">Select Server-based Applications</p>
                  <p className="text-slate-600 mt-0.5">
                    On the <span className="font-semibold">Choose a Client Type</span> screen, click{' '}
                    <span className="font-semibold text-slate-900">Server-based Applications</span> (do not pick Self Client or JavaScript).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">02.</span>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-semibold text-slate-900">Enter Client Details & Homepage URL</p>
                  <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/70">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">Client Name</span>
                      <span className="font-mono text-slate-900 truncate block">Uppseekers Counseling Portal</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy('clientName', 'Uppseekers Counseling Portal')}
                      className="h-7 px-2.5 text-[11px] shrink-0 bg-white"
                    >
                      {copiedKey === 'clientName' ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedKey === 'clientName' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/70">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">Homepage URL</span>
                      <span className="font-mono text-slate-900 truncate block">{PRODUCTION_ORIGIN}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy('homepage', PRODUCTION_ORIGIN)}
                      className="h-7 px-2.5 text-[11px] shrink-0 bg-white"
                    >
                      {copiedKey === 'homepage' ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedKey === 'homepage' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">03.</span>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="font-semibold text-slate-900">Add All Authorized Redirect URIs</p>
                  <p className="text-slate-600">
                    Click <span className="font-semibold">Add URI</span> so Production, Development, and Shared environments all succeed:
                  </p>
                  <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/70">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">
                        Production Redirect URI
                        {diag.redirectUri === PRODUCTION_CALLBACK_URL && (
                          <span className="ml-1.5 text-emerald-700 font-semibold">(Active Now)</span>
                        )}
                      </span>
                      <span className="font-mono text-slate-900 break-all block">{PRODUCTION_CALLBACK_URL}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy('prodUri', PRODUCTION_CALLBACK_URL)}
                      className="h-7 px-2.5 text-[11px] shrink-0 bg-white"
                    >
                      {copiedKey === 'prodUri' ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedKey === 'prodUri' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/70">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">
                        Development Redirect URI
                        {diag.redirectUri === DEV_CALLBACK_URL && (
                          <span className="ml-1.5 text-emerald-700 font-semibold">(Active Now)</span>
                        )}
                      </span>
                      <span className="font-mono text-slate-900 break-all block">{DEV_CALLBACK_URL}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy('devUri', DEV_CALLBACK_URL)}
                      className="h-7 px-2.5 text-[11px] shrink-0 bg-white"
                    >
                      {copiedKey === 'devUri' ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedKey === 'devUri' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50/70">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">
                        Shared / Deployed Redirect URI
                        {diag.redirectUri === SHARED_CALLBACK_URL && (
                          <span className="ml-1.5 text-emerald-700 font-semibold">(Active Now)</span>
                        )}
                      </span>
                      <span className="font-mono text-slate-900 break-all block">{SHARED_CALLBACK_URL}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy('sharedUri', SHARED_CALLBACK_URL)}
                      className="h-7 px-2.5 text-[11px] shrink-0 bg-white"
                    >
                      {copiedKey === 'sharedUri' ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedKey === 'sharedUri' ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
                <span className="font-mono tabular-nums font-bold text-slate-900 shrink-0">04.</span>
                <div>
                  <p className="font-semibold text-slate-900">Copy Credentials to Server Environment Secrets</p>
                  <p className="text-slate-600 mt-0.5">
                    Click <span className="font-semibold">Create</span>, open the <span className="font-semibold">Client Secret</span> tab, and save{' '}
                    <span className="font-mono text-slate-900">ZOHO_CLIENT_ID</span> and{' '}
                    <span className="font-mono text-slate-900">ZOHO_CLIENT_SECRET</span> in your server environment secrets (AI Studio Secrets / Cloud Run env). Leave data center as <span className="font-semibold">.com (Global US)</span>.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Live Server Readiness & Handshake Test */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between gap-4 py-4">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Server Diagnostics & Live Handshake
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time verification of server OAuth environment and Zoho Meeting API v2
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadDiagnostics}
              disabled={diag.loading}
              className="bg-white text-xs h-8 px-3 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', diag.loading && 'animate-spin')} />
              Re-check Status
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-5 text-xs">
            {diag.error && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{diag.error}</span>
              </div>
            )}

            {actionBanner && (
              <div
                className={cn(
                  'p-3 rounded-lg border flex items-start gap-2',
                  actionBanner.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : actionBanner.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-900'
                    : 'border-slate-200 bg-slate-50 text-slate-800'
                )}
              >
                {actionBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <span>{actionBanner.message}</span>
              </div>
            )}

            {/* Key/Value Diagnostics List (single-elevation hairline table) */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900 font-mono">ZOHO_CLIENT_ID</p>
                  <p className="text-[11px] text-slate-500">
                    {diag.hasClientId && diag.clientIdPreview
                      ? `Loaded: ${diag.clientIdPreview}`
                      : 'Server-side Zoho OAuth client identifier'}
                  </p>
                </div>
                <span className={cn('font-semibold flex items-center gap-1.5', diag.hasClientId && diag.clientIdValidFormat !== false ? 'text-emerald-700' : 'text-amber-700')}>
                  {diag.hasClientId && diag.clientIdValidFormat !== false ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {diag.loading ? 'Checking...' : diag.hasClientId ? (diag.clientIdValidFormat === false ? 'Unexpected Format' : 'Detected') : 'Missing'}
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900 font-mono">ZOHO_CLIENT_SECRET</p>
                  <p className="text-[11px] text-slate-500">
                    {diag.secretLooksLikeClientId
                      ? 'Warning: Value starts with 1000. or matches Client ID — paste the Client Secret instead'
                      : diag.hasClientSecret && diag.clientSecretLength
                      ? `Loaded (${diag.clientSecretLength} chars · stored strictly server-side)`
                      : 'Stored strictly in server secrets (never exposed to browser)'}
                  </p>
                </div>
                <span className={cn('font-semibold flex items-center gap-1.5', diag.hasClientSecret && !diag.secretLooksLikeClientId ? 'text-emerald-700' : 'text-amber-700')}>
                  {diag.hasClientSecret && !diag.secretLooksLikeClientId ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {diag.loading ? 'Checking...' : diag.secretLooksLikeClientId ? 'Invalid (Looks Like ID)' : diag.hasClientSecret ? 'Detected' : 'Missing'}
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">Active Callback Route</p>
                  <p className="text-[11px] text-slate-500 font-mono break-all">{diag.redirectUri}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-700 font-medium whitespace-nowrap">
                    {diag.redirectUriSource === 'ZOHO_REDIRECT_URI'
                      ? 'ZOHO_REDIRECT_URI Env'
                      : diag.redirectUriSource === 'APP_URL'
                      ? 'APP_URL Env'
                      : diag.hasAppUrl
                      ? 'Env Matched'
                      : 'Origin Fallback'}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy('activeUri', diag.redirectUri)}
                    className="h-7 px-2.5 text-[11px] bg-white"
                  >
                    {copiedKey === 'activeUri' ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedKey === 'activeUri' ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">Zoho Organization (Shared .com)</p>
                  <p className="text-[11px] text-slate-500">
                    accounts.zoho.com · meeting.zoho.com{sharedOrgId ? ` · zsoid ${sharedOrgId}` : ''}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-slate-800 font-semibold whitespace-nowrap shrink-0">
                  {diag.connections.length} {diag.connections.length === 1 ? 'counselor' : 'counselors'}
                </span>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                type="button"
                onClick={handleConnectZoho}
                disabled={isConnecting || !diag.configured}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 mr-1.5" />
                    {isCurrentUserConnected ? 'Reconnect My Zoho Account' : 'Connect My Zoho Account'}
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleRunTest()}
                disabled={isTesting || !diag.configured || !isCurrentUserConnected}
                className="bg-white text-slate-800 border-slate-300 text-xs font-semibold h-9 px-4"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Testing Zoho API...
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Run Live API Test
                  </>
                )}
              </Button>
            </div>

            {!diag.configured && !diag.loading && (
              <p className="text-[11px] text-slate-500">
                Buttons unlock automatically once <span className="font-mono text-slate-800">ZOHO_CLIENT_ID</span> and{' '}
                <span className="font-mono text-slate-800">ZOHO_CLIENT_SECRET</span> are detected in the server environment.
              </p>
            )}

            {testResult && (
              <div
                className={cn(
                  'p-3.5 rounded-lg border text-xs space-y-1',
                  testResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-950'
                )}
              >
                <div className="flex items-center justify-between gap-2 font-semibold">
                  <span className="flex items-center gap-1.5">
                    {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                    {testResult.ok ? 'Zoho Meeting API v2 Handshake Succeeded' : 'Zoho Meeting API Test Failed'}
                  </span>
                  {typeof testResult.latencyMs === 'number' && (
                    <span className="font-mono tabular-nums text-[11px] opacity-80">{testResult.latencyMs} ms</span>
                  )}
                </div>
                {testResult.ok ? (
                  <p className="text-[11px] text-emerald-900 font-mono tabular-nums">
                    Host: {testResult.zohoEmail} · zsoid: {testResult.zsoid}
                  </p>
                ) : (
                  <p className="text-[11px] text-red-800">{testResult.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Connected Counselors Table */}
      <Card className="border-slate-200 shadow-none overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between gap-4 py-3.5">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Connected Team Accounts (Shared Zoho Org)
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Each counselor connects their individual Zoho seat so meetings host under their own account
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs text-slate-600 font-semibold">
            {diag.connections.length} Connected
          </span>
        </CardHeader>

        <CardContent className="p-0">
          {diag.connections.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900">No counselor Zoho accounts connected yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                After saving <span className="font-mono">ZOHO_CLIENT_ID</span> and <span className="font-mono">ZOHO_CLIENT_SECRET</span>, click{' '}
                <span className="font-semibold text-slate-700">Connect My Zoho Account</span> above or use{' '}
                <span className="font-semibold text-slate-700">Connect Zoho Meeting</span> inside Class Scheduler.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-white border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Team Member</th>
                    <th className="px-5 py-3">Zoho Account</th>
                    <th className="px-5 py-3">Org ID (zsoid)</th>
                    <th className="px-5 py-3">Connected</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {diag.connections.map((conn) => (
                    <tr key={conn.staffKey} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{conn.staffName || conn.staffKey}</div>
                        <div className="text-[11px] text-slate-500">{conn.staffEmail || conn.staffKey}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{conn.zohoEmail || '—'}</div>
                        {conn.zohoDisplayName && (
                          <div className="text-[11px] text-slate-500">{conn.zohoDisplayName}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-slate-700">
                        {conn.zsoid}
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-slate-500">
                        {conn.connectedAt
                          ? new Date(conn.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Active'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRunTest(conn.staffKey)}
                            disabled={isTesting}
                            className="h-7 px-2.5 text-[11px] bg-white"
                          >
                            Test
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(conn.staffKey)}
                            disabled={disconnectingKey === conn.staffKey}
                            className="h-7 px-2.5 text-[11px] text-red-600 border-red-200 hover:bg-red-50 bg-white"
                          >
                            <Unplug className="w-3 h-3 mr-1" />
                            {disconnectingKey === conn.staffKey ? 'Removing...' : 'Disconnect'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 3: Full Request/Response Cycle & Token Storage Diagnostic Utility */}
      <ZohoOAuthDiagnosticConsole currentUser={currentUser} />
    </div>
  );
}
