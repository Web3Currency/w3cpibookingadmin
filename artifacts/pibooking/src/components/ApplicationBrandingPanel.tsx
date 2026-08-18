import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, RotateCcw, Save, ShieldCheck, Trash2, X } from 'lucide-react';
import { appBrandingService, MAX_LOGO_SIZE, validateLogoFile } from '../services/appBrandingService';

interface ApplicationBrandingPanelProps {
  onClose: () => void;
  showToast: (message: string) => void;
}

export const ApplicationBrandingPanel: React.FC<ApplicationBrandingPanelProps> = ({ onClose, showToast }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBranding = async () => {
    setLoading(true);
    setError(null);
    try {
      const branding = await appBrandingService.getBranding();
      setLogoPath(branding.logoPath);
      setLogoUrl(branding.logoUrl);
      setPreviewUrl(branding.logoUrl);
    } catch (err: any) {
      setError(err?.message || 'Unable to load application branding.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBranding();
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setSelectedFile(null);

    if (!file) return;

    const validationError = validateLogoFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }

    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setError('Choose an image before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await appBrandingService.uploadLogo(selectedFile, logoPath);
      setLogoPath(result.logoPath);
      setLogoUrl(result.logoUrl);
      setPreviewUrl(result.logoUrl);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      showToast('Application logo updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save the application logo. The current logo remains active.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!logoPath) return;
    setResetting(true);
    setError(null);
    try {
      await appBrandingService.resetLogo(logoPath);
      setLogoPath(null);
      setLogoUrl(null);
      setPreviewUrl(null);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      showToast('Application logo reset successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset the application logo.');
    } finally {
      setResetting(false);
    }
  };

  const hasPendingChange = Boolean(selectedFile);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-zinc-200 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-5 sm:p-6 bg-white/95 backdrop-blur border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900">
              <ImagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-zinc-900">Application Branding</h2>
              <p className="text-xs text-zinc-500">Manage the application logo stored in Supabase Storage.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" />
            <p className="text-[11px] leading-5 text-emerald-900">
              Uploads are restricted by Supabase Storage policies to authorized admins. Files are limited to PNG, JPG/JPEG, or WebP and 2 MB.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}

          <section className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">Current Logo</h3>
              <p className="text-[11px] text-zinc-500 mt-1">The currently active logo reference.</p>
            </div>

            <div className="min-h-40 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center p-5">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Current application logo" className="max-h-28 max-w-full object-contain" />
              ) : (
                <div className="text-center text-xs text-zinc-400">No Supabase logo is currently active.</div>
              )}
            </div>
          </section>

          <section className="p-5 rounded-2xl bg-white border border-zinc-200 space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">Change Logo</h3>
              <p className="text-[11px] text-zinc-500 mt-1">Choose a file from your device. Image URLs are not accepted.</p>
            </div>

            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={saving || resetting}
              className="w-full min-h-24 rounded-2xl border-2 border-dashed border-zinc-300 hover:border-amber-400 hover:bg-amber-50/40 transition flex flex-col items-center justify-center gap-2 text-xs font-bold text-zinc-700 disabled:opacity-50"
            >
              <ImagePlus className="w-5 h-5 text-amber-600" />
              <span>Choose Image</span>
              <span className="text-[10px] font-normal text-zinc-500">PNG, JPG/JPEG, WebP · Max 2 MB</span>
            </button>

            {previewUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700">Preview</span>
                  {selectedFile && <span className="text-[10px] text-zinc-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>}
                </div>
                <div className="min-h-40 rounded-2xl border border-amber-200 bg-zinc-50 flex items-center justify-center p-5">
                  <img src={previewUrl} alt="Logo preview" className="max-h-28 max-w-full object-contain" />
                </div>
              </div>
            )}
          </section>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-end">
            <button
              type="button"
              onClick={() => void loadBranding()}
              disabled={loading || saving || resetting}
              className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>

            {logoPath && (
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={loading || saving || resetting}
                className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Reset Logo
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!hasPendingChange || saving || resetting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : 'Save Logo'}
            </button>
          </div>

          <p className="text-[10px] leading-4 text-zinc-400">
            Maximum file size: {MAX_LOGO_SIZE / 1024 / 1024} MB. The existing logo remains active until the new upload and database activation both succeed.
          </p>
        </div>
      </div>
    </div>
  );
};
