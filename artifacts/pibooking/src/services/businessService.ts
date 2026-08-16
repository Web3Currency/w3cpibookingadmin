import { BusinessProfile } from '../types';
import { supabase, isSupabaseConfigured, safeSupabaseUpsert } from '../lib/supabase';
import { EMPTY_BUSINESS_PROFILE } from '../config/business';

const LOCAL_BUSINESS_KEY = 'w3c_business_profile';

function logRLSHint(tableName: string) {
  console.warn(
    `[Supabase RLS Warning] Operation on table '${tableName}' was blocked by Row Level Security.\n` +
    `To allow public read/write or authenticated admin access, execute this SQL in your Supabase SQL Editor:\n` +
    `CREATE POLICY "Allow public all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);`
  );
}

export const businessService = {
  getBusinessProfileLocal(): BusinessProfile {
    const cached = localStorage.getItem(LOCAL_BUSINESS_KEY);
    if (!cached) return EMPTY_BUSINESS_PROFILE;
    try {
      return { ...EMPTY_BUSINESS_PROFILE, ...JSON.parse(cached) };
    } catch {
      return EMPTY_BUSINESS_PROFILE;
    }
  },

  async getBusinessProfileAsync(): Promise<BusinessProfile> {
    const localProfile = this.getBusinessProfileLocal();

    if (!isSupabaseConfigured()) {
      return localProfile;
    }

    console.log('[Supabase Request] Fetching business profile from "business_profile"...');

    try {
      const { data, error } = await supabase
        .from('business_profile')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase Note] Business profile fetch response:', error.message);
        if (error.code === '42501') logRLSHint('business_profile');
        return localProfile;
      }

      if (!data) {
        return localProfile;
      }

      console.log('[Supabase Success] Business profile loaded from database:', data.name);

      const remoteProfile: BusinessProfile = {
        id: data.id || 'w3c_digital',
        name: data.name || localProfile.name || '',
        tagline: data.tagline || localProfile.tagline || '',
        category: data.category || localProfile.category || 'web_dev',
        avatarUrl: data.avatar_url || localProfile.avatarUrl || '',
        piWalletAddress: data.pi_wallet_address || localProfile.piWalletAddress || '',
        verifiedPiMerchant: data.verified_pi_merchant ?? true,
        rating: Number(data.rating) || localProfile.rating || 5.0,
        reviewsCount: Number(data.reviews_count) || localProfile.reviewsCount || 0,
        location: data.location || localProfile.location || '',
        bio: data.bio || localProfile.bio || '',
        website: data.website || localProfile.website || '',
        phone: data.phone || localProfile.phone || '',
        email: data.email || localProfile.email || '',
        socials: Array.isArray(data.socials) ? data.socials : (localProfile.socials || []),
        businessHours: data.business_hours || localProfile.businessHours || EMPTY_BUSINESS_PROFILE.businessHours,
        blockedDates: Array.isArray(data.blocked_dates) ? data.blocked_dates : [],
        galleryImages: Array.isArray(data.gallery_images) ? data.gallery_images : [],
        services: [],
        updatedAt: data.updated_at,
      };

      localStorage.setItem(LOCAL_BUSINESS_KEY, JSON.stringify(remoteProfile));
      return remoteProfile;
    } catch (e: any) {
      console.error('[Supabase Exception] Error fetching business profile:', e?.message || e);
      return localProfile;
    }
  },

  async updateBusinessProfileAsync(updatedFields: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const current = this.getBusinessProfileLocal();
    const updated: BusinessProfile = {
      ...current,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(LOCAL_BUSINESS_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      console.log('[Supabase Request] Updating business profile in Supabase...', updatedFields);
      try {
        const payload: Record<string, any> = {
          id: current.id || 'w3c_digital',
          updated_at: updated.updatedAt,
        };

        if (updated.name !== undefined) payload.name = updated.name;
        if (updated.tagline !== undefined) payload.tagline = updated.tagline;
        if (updated.category !== undefined) payload.category = updated.category;
        if (updated.avatarUrl !== undefined) payload.avatar_url = updated.avatarUrl;
        if (updated.piWalletAddress !== undefined) payload.pi_wallet_address = updated.piWalletAddress;
        if (updated.verifiedPiMerchant !== undefined) payload.verified_pi_merchant = updated.verifiedPiMerchant;
        if (updated.rating !== undefined) payload.rating = updated.rating;
        if (updated.reviewsCount !== undefined) payload.reviews_count = updated.reviewsCount;
        if (updated.location !== undefined) payload.location = updated.location;
        if (updated.bio !== undefined) payload.bio = updated.bio;
        if (updated.website !== undefined) payload.website = updated.website;
        if (updated.phone !== undefined) payload.phone = updated.phone;
        if (updated.email !== undefined) payload.email = updated.email;
        if (updated.socials !== undefined) payload.socials = updated.socials;
        if (updated.businessHours !== undefined) payload.business_hours = updated.businessHours;
        if (updated.blockedDates !== undefined) payload.blocked_dates = updated.blockedDates;
        if (updated.galleryImages !== undefined) payload.gallery_images = updated.galleryImages;

        const { data, error } = await safeSupabaseUpsert('business_profile', payload);

        if (error) {
          console.warn('[Supabase Note] Failed to update business profile in database:', error.message);
          if (error.code === '42501') logRLSHint('business_profile');
        } else {
          console.log('[Supabase Success] Business profile updated in database:', data);
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Business profile update failed:', e?.message || e);
      }

      return await this.getBusinessProfileAsync();
    }

    return updated;
  }
};
