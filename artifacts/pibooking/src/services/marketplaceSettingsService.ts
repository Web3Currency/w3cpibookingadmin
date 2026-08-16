import { supabase, isSupabaseConfigured, safeSupabaseUpdate, safeSupabaseUpsert } from '../lib/supabase';

export interface MarketplaceSettings {
  id: string;
  become_provider_popup_enabled: boolean;
  updated_at?: string;
}

const LOCAL_SETTINGS_KEY = 'w3c_marketplace_settings_local';

function formatRlsErrorMessage(errorMsg: string): string {
  if (errorMsg.includes('row-level security') || errorMsg.includes('42501') || errorMsg.includes('violates row-level security policy')) {
    return (
      'Supabase RLS policy blocked the update on "marketplace_settings". ' +
      'To allow access, run this SQL in your Supabase SQL Editor:\n' +
      'CREATE POLICY "Allow public all" ON public.marketplace_settings FOR ALL USING (true) WITH CHECK (true);'
    );
  }
  return errorMsg;
}

export const marketplaceSettingsService = {
  /**
   * Fetch current marketplace settings row from Supabase where id = 'global'.
   * Returns current boolean state for become_provider_popup_enabled.
   */
  async getBecomeProviderPopupEnabled(): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('marketplace_settings')
          .select('become_provider_popup_enabled')
          .eq('id', 'global')
          .maybeSingle();

        if (!error && data !== null && typeof data.become_provider_popup_enabled === 'boolean') {
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(data.become_provider_popup_enabled));
          return data.become_provider_popup_enabled;
        }

        if (error) {
          console.warn('[Supabase Note] Failed to fetch marketplace_settings:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Exception] Failed to query marketplace_settings:', err?.message || err);
      }
    }

    // Fallback to local cache or default false
    const cached = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (cached !== null) {
      try {
        return JSON.parse(cached) === true;
      } catch {
        // ignore
      }
    }

    return false;
  },

  /**
   * Update become_provider_popup_enabled setting in public.marketplace_settings where id = 'global'.
   */
  async updateBecomeProviderPopupEnabled(enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        // First try updating existing 'global' row using safe update helper
        const { data: updateData, error: updateError } = await safeSupabaseUpdate(
          'marketplace_settings',
          {
            become_provider_popup_enabled: enabled,
            updated_at: now,
          },
          'id',
          'global'
        );

        if (!updateError && updateData && updateData.length > 0) {
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(enabled));
          return { success: true };
        }

        // If update error is RLS, format helpful instructions
        if (updateError && (updateError.code === '42501' || updateError.message?.includes('row-level security'))) {
          const formattedErr = formatRlsErrorMessage(updateError.message);
          console.warn('[Supabase RLS Error] Update blocked on marketplace_settings:', formattedErr);
          return { success: false, error: formattedErr };
        }

        // If row doesn't exist yet or update returned 0 rows, try safe upsert
        const { data: upsertData, error: upsertError } = await safeSupabaseUpsert(
          'marketplace_settings',
          {
            id: 'global',
            become_provider_popup_enabled: enabled,
            updated_at: now,
          },
          { onConflict: 'id' }
        );

        if (!upsertError && upsertData && upsertData.length > 0) {
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(enabled));
          return { success: true };
        }

        const rawErr = upsertError?.message || updateError?.message || 'Failed to update marketplace_settings table.';
        const formattedErr = formatRlsErrorMessage(rawErr);
        console.error('[Supabase Error] Updating marketplace_settings failed:', formattedErr);
        return { success: false, error: formattedErr };
      } catch (err: any) {
        const rawErr = err?.message || 'Unexpected exception when updating marketplace_settings.';
        const formattedErr = formatRlsErrorMessage(rawErr);
        console.error('[Supabase Exception] Updating marketplace_settings exception:', formattedErr);
        return { success: false, error: formattedErr };
      }
    }

    // If Supabase is unconfigured, persist in local cache for offline/dev mode
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(enabled));
    return { success: true };
  },
};

