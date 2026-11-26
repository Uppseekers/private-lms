import React, { useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Globe,
  Upload,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDatabase } from '@/context/DatabaseContext';
import { sanitizeUserErrorMessage } from '@/lib/friendlyError';

async function compressImageFileToDataUrl(
  file: File,
  maxWidth: number,
  maxHeight: number,
  maxBytes: number
): Promise<string> {
  // Preserve SVG uploads cleanly if within size limit
  if (file.type === 'image/svg+xml') {
    const text = await file.text();
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    if (encoded.length <= maxBytes) return encoded;
    throw new Error('SVG file is too large. Please upload a smaller icon or paste an image URL.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new Error('Selected file could not be loaded.'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported image format. Please use PNG, JPG, SVG, WebP, or ICO.'));
      img.onload = () => {
        let targetW = img.naturalWidth || maxWidth;
        let targetH = img.naturalHeight || maxHeight;
        const scale = Math.min(1, maxWidth / targetW, maxHeight / targetH);
        targetW = Math.max(16, Math.round(targetW * scale));
        targetH = Math.max(16, Math.round(targetH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser image processing is unavailable.'));
          return;
        }
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Try PNG first to preserve transparent backgrounds
        let dataUrl = canvas.toDataURL('image/png');
        if (dataUrl.length > maxBytes) {
          dataUrl = canvas.toDataURL('image/webp', 0.88);
        }
        if (dataUrl.length > maxBytes) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }
        if (dataUrl.length > maxBytes) {
          reject(new Error('Image is still too large after optimization. Please choose a smaller file or paste an image URL.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function isValidImageInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function PortalBrandingSettingsCard({
  onSaved,
}: {
  onSaved?: (msg: string) => void;
}) {
  const { portalBranding, savePortalBranding, resetPortalBranding } = useDatabase();

  const [portalName, setPortalName] = useState(portalBranding.portalName || 'Uppseekers');
  const [logoUrl, setLogoUrl] = useState(portalBranding.logoUrl || '');
  const [faviconUrl, setFaviconUrl] = useState(portalBranding.faviconUrl || '');
  const [logoBroken, setLogoBroken] = useState(false);
  const [faviconBroken, setFaviconBroken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPortalName(portalBranding.portalName || 'Uppseekers');
    setLogoUrl(portalBranding.logoUrl || '');
    setFaviconUrl(portalBranding.faviconUrl || '');
  }, [portalBranding.portalName, portalBranding.logoUrl, portalBranding.faviconUrl]);

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

  useEffect(() => {
    setFaviconBroken(false);
  }, [faviconUrl]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStatusMessage(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 480, 180, 380000);
      setLogoUrl(dataUrl);
      setStatusMessage({ type: 'success', text: 'Logo image loaded. Click Save Branding to publish across the portal.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: sanitizeUserErrorMessage(err, 'Could not process the selected logo file.') });
    }
  };

  const handleFaviconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStatusMessage(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 128, 128, 160000);
      setFaviconUrl(dataUrl);
      setStatusMessage({ type: 'success', text: 'Favicon loaded. Click Save Branding to update the browser tab icon.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: sanitizeUserErrorMessage(err, 'Could not process the selected favicon file.') });
    }
  };

  const handleSave = async () => {
    setStatusMessage(null);
    if (!isValidImageInput(logoUrl)) {
      setStatusMessage({ type: 'error', text: 'Logo URL must be a valid HTTPS link or uploaded image.' });
      return;
    }
    if (!isValidImageInput(faviconUrl)) {
      setStatusMessage({ type: 'error', text: 'Favicon URL must be a valid HTTPS link or uploaded image.' });
      return;
    }

    setIsSaving(true);
    try {
      await savePortalBranding({
        portalName: portalName.trim() || 'Uppseekers',
        logoUrl: logoUrl.trim(),
        faviconUrl: faviconUrl.trim(),
      });
      setStatusMessage({
        type: 'success',
        text: 'Portal logo and favicon updated and published live for all users.',
      });
      onSaved?.('Updated portal branding (logo & favicon)');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: sanitizeUserErrorMessage(err, 'Unable to save branding right now. Please talk to your Admin.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAll = async () => {
    setStatusMessage(null);
    setIsResetting(true);
    try {
      await resetPortalBranding();
      setPortalName('Uppseekers');
      setLogoUrl('');
      setFaviconUrl('');
      setStatusMessage({
        type: 'success',
        text: 'Portal logo and favicon have been restored to Uppseekers defaults.',
      });
      onSaved?.('Reset portal branding (logo & favicon) to default');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: sanitizeUserErrorMessage(err, 'Unable to reset branding right now. Please talk to your Admin.'),
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Portal Branding — Logo &amp; Favicon</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload an image file or paste an image URL to customize the portal sidebar logo, login screen branding, and browser tab favicon for all staff and students.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetAll}
            disabled={isResetting || isSaving}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9 text-xs font-semibold whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            {isResetting ? 'Resetting...' : 'Reset to Default'}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isResetting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-xs font-semibold whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Branding'}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={
            statusMessage.type === 'success'
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 flex items-center gap-2'
              : 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 flex items-center gap-2'
          }
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Brand Name */}
      <Card className="border-slate-200 shadow-none">
        <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Brand Display Name
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="max-w-md space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Portal Name</label>
            <input
              type="text"
              value={portalName}
              onChange={(e) => setPortalName(e.target.value)}
              placeholder="Uppseekers"
              maxLength={120}
              className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              Displayed beside the default icon, as alt text for your custom logo, and on the sign-in screen.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Configuration */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              Portal Logo
            </CardTitle>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl('')}
                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Clear Logo
              </button>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Live Preview */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Live Sidebar Preview
              </span>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {logoUrl && !logoBroken ? (
                    <img
                      src={logoUrl}
                      alt={portalName || 'Portal Logo'}
                      onError={() => setLogoBroken(true)}
                      className="h-9 max-w-[180px] object-contain"
                    />
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-lg tracking-tight text-slate-900 truncate">
                        {portalName || 'Uppseekers'}
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-medium shrink-0">
                  {logoUrl && !logoBroken ? 'Custom Logo' : 'Default Lockup'}
                </span>
              </div>
              {logoBroken && (
                <p className="text-[11px] text-rose-600 mt-1.5">
                  The logo URL could not be loaded as an image. Please check the URL or upload an image file.
                </p>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                className="w-full border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 h-10 text-xs font-semibold"
              >
                <Upload className="w-4 h-4 mr-2 text-indigo-600" />
                Upload Logo Image (PNG, SVG, JPG, WebP)
              </Button>
              <p className="text-[11px] text-slate-400">
                Recommended: Horizontal transparent PNG or SVG (around 320×80 px). Images are optimized automatically.
              </p>
            </div>

            {/* Paste URL */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                Or Paste Logo Image URL
              </label>
              <input
                type="text"
                value={logoUrl.startsWith('data:image/') ? '' : logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder={
                  logoUrl.startsWith('data:image/')
                    ? 'Uploaded image file active (paste a URL here to replace)'
                    : 'https://example.com/logo.png'
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Favicon Configuration */}
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              Browser Favicon
            </CardTitle>
            {faviconUrl && (
              <button
                type="button"
                onClick={() => setFaviconUrl('')}
                className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Clear Favicon
              </button>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Live Browser Tab Preview */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Live Browser Tab Preview
              </span>
              <div className="rounded-xl border border-slate-200 bg-slate-100 pt-2.5 px-3">
                <div className="inline-flex items-center gap-2 bg-white border border-b-0 border-slate-200 rounded-t-lg px-3.5 py-2 max-w-[240px]">
                  {faviconUrl && !faviconBroken ? (
                    <img
                      src={faviconUrl}
                      alt="Favicon preview"
                      onError={() => setFaviconBroken(true)}
                      className="w-4 h-4 object-contain shrink-0 rounded-xs"
                    />
                  ) : (
                    <img
                      src="/favicon.svg"
                      alt="Default favicon"
                      className="w-4 h-4 object-contain shrink-0"
                    />
                  )}
                  <span className="text-xs font-medium text-slate-800 truncate">
                    {portalName || 'Uppseekers'} Portal
                  </span>
                </div>
              </div>
              {faviconBroken && (
                <p className="text-[11px] text-rose-600 mt-1.5">
                  The favicon URL could not be loaded as an image. Please check the URL or upload a square icon file.
                </p>
              )}
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,image/webp,image/jpeg"
                onChange={handleFaviconFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => faviconInputRef.current?.click()}
                className="w-full border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 h-10 text-xs font-semibold"
              >
                <Upload className="w-4 h-4 mr-2 text-indigo-600" />
                Upload Favicon Icon (PNG, SVG, ICO, WebP)
              </Button>
              <p className="text-[11px] text-slate-400">
                Recommended: Square 64×64 or 128×128 PNG or SVG icon for crisp rendering on retina browser tabs.
              </p>
            </div>

            {/* Paste URL */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                Or Paste Favicon URL
              </label>
              <input
                type="text"
                value={faviconUrl.startsWith('data:image/') ? '' : faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder={
                  faviconUrl.startsWith('data:image/')
                    ? 'Uploaded favicon file active (paste a URL here to replace)'
                    : 'https://example.com/favicon.png'
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
