import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const APP_BRANDING_BUCKET = 'w3c-assets';
export const APP_BRANDING_FOLDER = 'branding/logo';
export const APP_BRANDING_CONFIG_ID = 'global';
export const MAX_LOGO_SIZE = 2 * 1024 * 1024;
export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export type AppBranding = {
  logoPath: string | null;
  logoUrl: string | null;
  updatedAt?: string;
};

export type LogoUploadResult = {
  logoPath: string;
  logoUrl: string;
};

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
}

export function validateLogoFile(file: File): string | null {
  if (!ALLOWED_LOGO_TYPES.includes(file.type as (typeof ALLOWED_LOGO_TYPES)[number])) {
    return 'Invalid image type. Use PNG, JPG/JPEG, or WebP.';
  }

  if (file.size > MAX_LOGO_SIZE) {
    return 'Image is too large. Maximum size is 2 MB.';
  }

  return null;
}

function publicUrl(path: string): string {
  return supabase.storage.from(APP_BRANDING_BUCKET).getPublicUrl(path).data.publicUrl;
}

export const appBrandingService = {
  async getBranding(): Promise<AppBranding> {
    assertConfigured();

    const { data, error } = await supabase
      .from('app_branding')
      .select('logo_path, updated_at')
      .eq('id', APP_BRANDING_CONFIG_ID)
      .maybeSingle();

    if (error) throw error;

    const logoPath = data?.logo_path ?? null;
    return {
      logoPath,
      logoUrl: logoPath ? publicUrl(logoPath) : null,
      updatedAt: data?.updated_at,
    };
  },

  async uploadLogo(file: File, previousLogoPath?: string | null): Promise<LogoUploadResult> {
    assertConfigured();

    const validationError = validateLogoFile(file);
    if (validationError) throw new Error(validationError);

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const uniqueName = `logo-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const path = `${APP_BRANDING_FOLDER}/${uniqueName}`;

    const { error: uploadError } = await supabase.storage
      .from(APP_BRANDING_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '300',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const logoUrl = publicUrl(path);

    // The database reference is the activation point. The previous logo remains active
    // until this update succeeds. If the DB update fails, clean up only the new upload.
    const { error: updateError } = await supabase
      .from('app_branding')
      .update({ logo_path: path, updated_at: new Date().toISOString() })
      .eq('id', APP_BRANDING_CONFIG_ID);

    if (updateError) {
      await supabase.storage.from(APP_BRANDING_BUCKET).remove([path]);
      throw updateError;
    }

    // The new path is now active. Cleanup of the old file happens only after activation.
    if (previousLogoPath && previousLogoPath !== path) {
      const { error: cleanupError } = await supabase.storage
        .from(APP_BRANDING_BUCKET)
        .remove([previousLogoPath]);

      if (cleanupError) {
        console.warn('[Branding] New logo is active, but old logo cleanup failed:', cleanupError.message);
      }
    }

    return { logoPath: path, logoUrl };
  },

  async resetLogo(previousLogoPath?: string | null): Promise<void> {
    assertConfigured();

    const { error: updateError } = await supabase
      .from('app_branding')
      .update({ logo_path: null, updated_at: new Date().toISOString() })
      .eq('id', APP_BRANDING_CONFIG_ID);

    if (updateError) throw updateError;

    if (previousLogoPath) {
      const { error: cleanupError } = await supabase.storage
        .from(APP_BRANDING_BUCKET)
        .remove([previousLogoPath]);

      if (cleanupError) {
        console.warn('[Branding] Logo reset succeeded, but old logo cleanup failed:', cleanupError.message);
      }
    }
  },
};
