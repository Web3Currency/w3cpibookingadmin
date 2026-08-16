import { Provider } from '../types';
import { supabase, isSupabaseConfigured, safeSupabaseInsert, safeSupabaseUpdate } from '../lib/supabase';

const LOCAL_PROVIDERS_KEY = 'w3c_providers';

function logRLSHint(tableName: string) {
  console.warn(
    `[Supabase RLS Warning] Operation on table '${tableName}' was blocked by Row Level Security.\n` +
    `To allow public read/write or authenticated admin access, execute this SQL in your Supabase SQL Editor:\n` +
    `CREATE POLICY "Allow public all" ON public.${tableName} FOR ALL USING (true) WITH CHECK (true);`
  );
}

function getExperienceLevelCandidates(val?: string | null): (string | null)[] {
  if (!val) return [null];
  const trimmed = val.trim();
  if (!trimmed) return [null];

  const candidates: string[] = [trimmed];
  const lower = trimmed.toLowerCase();

  if (lower.includes('entry')) {
    candidates.push('Entry Level', 'Entry', 'entry_level', 'entry', 'Junior');
  } else if (lower.includes('intermed')) {
    candidates.push('Intermediate', 'intermediate', 'Mid-Level', 'Mid', 'mid');
  } else if (lower.includes('senior') || lower.includes('expert')) {
    candidates.push('Senior / Expert', 'Senior', 'Expert', 'senior_expert', 'senior', 'expert', 'Lead');
  } else {
    candidates.push(lower, trimmed.toUpperCase());
  }

  return Array.from(new Set(candidates));
}

async function executeSafeProviderUpdate(
  providerId: string,
  basePayload: Record<string, any>,
  rawExperienceLevel?: string | null
): Promise<{ data: any; error: any }> {
  const expCandidates = getExperienceLevelCandidates(rawExperienceLevel);

  for (const candidate of expCandidates) {
    const payload = { ...basePayload };
    if (candidate !== null) {
      payload.experience_level = candidate;
    } else {
      delete payload.experience_level;
    }

    const { data, error } = await safeSupabaseUpdate('providers', payload, 'id', providerId);

    if (!error) {
      return { data, error: null };
    }

    const isCheckConstraintError =
      error.code === '23514' ||
      (error.message && error.message.toLowerCase().includes('check constraint'));

    if (!isCheckConstraintError) {
      if (error.message && (error.message.includes('array') || error.message.includes('syntax') || error.message.includes('type'))) {
        const altPayload = { ...payload };
        if (Array.isArray(altPayload.specialties)) altPayload.specialties = altPayload.specialties.join(', ');
        if (Array.isArray(altPayload.skills)) altPayload.skills = altPayload.skills.join(', ');
        if (Array.isArray(altPayload.languages)) altPayload.languages = altPayload.languages.join(', ');

        const altResult = await safeSupabaseUpdate('providers', altPayload, 'id', providerId);
        if (!altResult.error) return altResult;
      }
      return { data, error };
    }
  }

  const fallbackPayload = { ...basePayload };
  delete fallbackPayload.experience_level;
  let res = await safeSupabaseUpdate('providers', fallbackPayload, 'id', providerId);

  if (res.error && (res.error.message?.includes('array') || res.error.message?.includes('syntax') || res.error.message?.includes('type'))) {
    if (Array.isArray(fallbackPayload.specialties)) fallbackPayload.specialties = fallbackPayload.specialties.join(', ');
    if (Array.isArray(fallbackPayload.skills)) fallbackPayload.skills = fallbackPayload.skills.join(', ');
    if (Array.isArray(fallbackPayload.languages)) fallbackPayload.languages = fallbackPayload.languages.join(', ');
    res = await safeSupabaseUpdate('providers', fallbackPayload, 'id', providerId);
  }

  return res;
}

async function executeSafeProviderInsert(
  basePayload: Record<string, any>,
  rawExperienceLevel?: string | null
): Promise<{ data: any; error: any }> {
  const expCandidates = getExperienceLevelCandidates(rawExperienceLevel);

  for (const candidate of expCandidates) {
    const payload = { ...basePayload };
    if (candidate !== null) {
      payload.experience_level = candidate;
    } else {
      delete payload.experience_level;
    }

    const { data, error } = await safeSupabaseInsert('providers', payload);

    if (!error) {
      return { data, error: null };
    }

    const isCheckConstraintError =
      error.code === '23514' ||
      (error.message && error.message.toLowerCase().includes('check constraint'));

    if (!isCheckConstraintError) {
      if (error.message && (error.message.includes('array') || error.message.includes('syntax') || error.message.includes('type'))) {
        const altPayload = { ...payload };
        if (Array.isArray(altPayload.specialties)) altPayload.specialties = altPayload.specialties.join(', ');
        if (Array.isArray(altPayload.skills)) altPayload.skills = altPayload.skills.join(', ');
        if (Array.isArray(altPayload.languages)) altPayload.languages = altPayload.languages.join(', ');

        const altResult = await safeSupabaseInsert('providers', altPayload);
        if (!altResult.error) return altResult;
      }
      return { data, error };
    }
  }

  const fallbackPayload = { ...basePayload };
  delete fallbackPayload.experience_level;
  let res = await safeSupabaseInsert('providers', fallbackPayload);

  if (res.error && (res.error.message?.includes('array') || res.error.message?.includes('syntax') || res.error.message?.includes('type'))) {
    if (Array.isArray(fallbackPayload.specialties)) fallbackPayload.specialties = fallbackPayload.specialties.join(', ');
    if (Array.isArray(fallbackPayload.skills)) fallbackPayload.skills = fallbackPayload.skills.join(', ');
    if (Array.isArray(fallbackPayload.languages)) fallbackPayload.languages = fallbackPayload.languages.join(', ');
    res = await safeSupabaseInsert('providers', fallbackPayload);
  }

  return res;
}

export const providerService = {
  getProvidersLocal(): Provider[] {
    const cached = localStorage.getItem(LOCAL_PROVIDERS_KEY);
    if (!cached) return [];
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  },

  async getProvidersAsync(): Promise<Provider[]> {
    const localProviders = this.getProvidersLocal();

    if (!isSupabaseConfigured()) {
      return localProviders;
    }

    console.log('[Supabase Request] Fetching providers from table "providers"...');

    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[Supabase Note] Failed to fetch providers from database:', error.message);
        if (error.code === '42501') logRLSHint('providers');
        return localProviders;
      }

      if (!data || data.length === 0) {
        localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify([]));
        return [];
      }

      console.log(`[Supabase Success] Received ${data.length} providers from database.`);

      const remoteProviders: Provider[] = data.map((row: any) => ({
        id: row.id,
        fullName: row.full_name || '',
        piUsername: row.pi_username || undefined,
        piUid: row.pi_uid || undefined,
        piWalletAddress: row.pi_wallet_address || undefined,
        roleTitle: row.role_title || '',
        headline: row.headline || undefined,
        bio: row.bio || undefined,
        photoUrl: row.photo_url || undefined,
        location: row.location || undefined,

        experienceLevel: row.experience_level || undefined,
        yearsExperience: row.years_experience !== undefined && row.years_experience !== null ? Number(row.years_experience) : undefined,
        serviceMode: row.service_mode || undefined,
        specialties: Array.isArray(row.specialties) ? row.specialties : (typeof row.specialties === 'string' && row.specialties ? row.specialties.split(',').map((s: string) => s.trim()) : []),
        skills: Array.isArray(row.skills) ? row.skills : (typeof row.skills === 'string' && row.skills ? row.skills.split(',').map((s: string) => s.trim()) : []),
        languages: Array.isArray(row.languages) ? row.languages : (typeof row.languages === 'string' && row.languages ? row.languages.split(',').map((s: string) => s.trim()) : []),

        availabilityStatus: row.availability_status || undefined,
        responseTime: row.response_time || undefined,
        status: row.status || 'Approved',
        profileVisibility: row.profile_visibility || undefined,

        profileVerified: row.profile_verified !== undefined && row.profile_verified !== null ? Boolean(row.profile_verified) : false,
        piVerified: row.pi_verified !== undefined && row.pi_verified !== null ? Boolean(row.pi_verified) : false,

        website: row.website || undefined,
        socialLinks: Array.isArray(row.social_links) ? row.social_links : (typeof row.social_links === 'string' && row.social_links ? JSON.parse(row.social_links) : []),
        portfolioImages: Array.isArray(row.portfolio_images) ? row.portfolio_images : [],

        rating: row.rating !== undefined && row.rating !== null ? Number(row.rating) : undefined,
        reviewsCount: row.reviews_count !== undefined && row.reviews_count !== null ? Number(row.reviews_count) : undefined,
        contactEmail: row.contact_email || undefined,
        contactPhone: row.contact_phone || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(remoteProviders));
      return remoteProviders;
    } catch (e: any) {
      console.error('[Supabase Exception] Error fetching providers from database:', e?.message || e);
      return localProviders;
    }
  },

  async getProviderByIdAsync(id: string): Promise<Provider | null> {
    const all = await this.getProvidersAsync();
    return all.find((p) => p.id === id) || null;
  },

  async getProviderByPiUid(piUid: string): Promise<Provider | null> {
    const all = await this.getProvidersAsync();
    return all.find((p) => p.piUid === piUid) || null;
  },

  async addProvider(provider: Omit<Provider, 'id'>): Promise<Provider> {
    const newId = `prv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newProvider: Provider = {
      ...provider,
      id: newId,
      status: provider.status || 'Approved',
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Inserting provider "${newProvider.fullName}" into Supabase...`);
      try {
        const insertPayload: Record<string, any> = {
          full_name: newProvider.fullName,
          pi_username: newProvider.piUsername || null,
          pi_uid: newProvider.piUid || null,
          pi_wallet_address: newProvider.piWalletAddress || null,
          role_title: newProvider.roleTitle || 'Specialist',
          headline: newProvider.headline || null,
          bio: newProvider.bio || null,
          photo_url: newProvider.photoUrl || null,
          location: newProvider.location || null,

          years_experience: newProvider.yearsExperience !== undefined && newProvider.yearsExperience !== null ? newProvider.yearsExperience : null,
          service_mode: newProvider.serviceMode || null,
          specialties: newProvider.specialties || [],
          skills: newProvider.skills || [],
          languages: newProvider.languages || [],

          availability_status: newProvider.availabilityStatus || null,
          response_time: newProvider.responseTime || null,
          status: newProvider.status || 'Approved',
          profile_visibility: newProvider.profileVisibility || null,

          profile_verified: newProvider.profileVerified ?? false,
          pi_verified: newProvider.piVerified ?? false,

          website: newProvider.website || null,
          social_links: newProvider.socialLinks || [],
          portfolio_images: newProvider.portfolioImages || [],

          contact_email: newProvider.contactEmail || null,
          contact_phone: newProvider.contactPhone || null,
        };

        const { data, error } = await executeSafeProviderInsert(insertPayload, newProvider.experienceLevel);

        if (error) {
          console.warn('[Supabase Note] Failed to insert provider:', error.message);
          if (error.code === '42501') logRLSHint('providers');
        } else if (data && data[0]) {
          console.log('[Supabase Success] Provider saved to database:', data[0]);
          if (data[0].id) {
            newProvider.id = data[0].id;
          }
        }
      } catch (e: any) {
        console.error('[Supabase Exception] Provider insertion failed:', e?.message || e);
      }
    }

    const currentProviders = this.getProvidersLocal();
    const updatedProviders = [...currentProviders.filter((p) => p.id !== newProvider.id), newProvider];
    localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(updatedProviders));

    return newProvider;
  },

  async updateProvider(providerId: string, updates: Partial<Provider>): Promise<void> {
    const currentProviders = this.getProvidersLocal();
    const targetLocalIndex = currentProviders.findIndex((p) => p.id === providerId);
    let updatedLocalProvider: Provider | null = null;

    if (targetLocalIndex >= 0) {
      updatedLocalProvider = {
        ...currentProviders[targetLocalIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatedLocalProvider = {
        id: providerId,
        fullName: updates.fullName || '',
        roleTitle: updates.roleTitle || 'Specialist',
        status: updates.status || 'Approved',
        ...updates,
        updatedAt: new Date().toISOString(),
      } as Provider;
    }

    if (isSupabaseConfigured()) {
      console.log(`[Supabase Request] Updating provider id="${providerId}" in Supabase...`);
      let updateSucceeded = false;
      let newDbId: string | null = null;

      const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerId);

      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.piUsername !== undefined) payload.pi_username = updates.piUsername || null;
      if (updates.piUid !== undefined) payload.pi_uid = updates.piUid || null;
      if (updates.piWalletAddress !== undefined) payload.pi_wallet_address = updates.piWalletAddress || null;
      if (updates.roleTitle !== undefined) payload.role_title = updates.roleTitle;
      if (updates.headline !== undefined) payload.headline = updates.headline || null;
      if (updates.bio !== undefined) payload.bio = updates.bio || null;
      if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl || null;
      if (updates.location !== undefined) payload.location = updates.location || null;

      if (updates.yearsExperience !== undefined) payload.years_experience = updates.yearsExperience !== undefined && updates.yearsExperience !== null ? updates.yearsExperience : null;
      if (updates.serviceMode !== undefined) payload.service_mode = updates.serviceMode || null;
      if (updates.specialties !== undefined) payload.specialties = updates.specialties || [];
      if (updates.skills !== undefined) payload.skills = updates.skills || [];
      if (updates.languages !== undefined) payload.languages = updates.languages || [];

      if (updates.availabilityStatus !== undefined) payload.availability_status = updates.availabilityStatus || null;
      if (updates.responseTime !== undefined) payload.response_time = updates.responseTime || null;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.profileVisibility !== undefined) payload.profile_visibility = updates.profileVisibility || null;

      if (updates.profileVerified !== undefined) payload.profile_verified = updates.profileVerified;
      if (updates.piVerified !== undefined) payload.pi_verified = updates.piVerified;

      if (updates.website !== undefined) payload.website = updates.website || null;
      if (updates.socialLinks !== undefined) payload.social_links = updates.socialLinks || [];
      if (updates.portfolioImages !== undefined) payload.portfolio_images = updates.portfolioImages || [];

      if (updates.contactEmail !== undefined) payload.contact_email = updates.contactEmail || null;
      if (updates.contactPhone !== undefined) payload.contact_phone = updates.contactPhone || null;

      if (isUuidFormat) {
        try {
          const { data, error } = await executeSafeProviderUpdate(providerId, payload, updates.experienceLevel);

          if (!error && data && data.length > 0) {
            console.log('[Supabase Success] Provider updated in database:', data);
            updateSucceeded = true;
          } else {
            console.warn('[Supabase Note] Provider update returned 0 rows or error, attempting fallback insert:', error?.message);
          }
        } catch (e: any) {
          console.error('[Supabase Exception] Provider update failed:', e?.message || e);
        }
      }

      if (!updateSucceeded && updatedLocalProvider) {
        console.log(`[Supabase Fallback] Inserting provider "${updatedLocalProvider.fullName}" into database...`);
        try {
          const fullInsertPayload: Record<string, any> = {
            full_name: updatedLocalProvider.fullName,
            pi_username: updatedLocalProvider.piUsername || null,
            pi_uid: updatedLocalProvider.piUid || null,
            pi_wallet_address: updatedLocalProvider.piWalletAddress || null,
            role_title: updatedLocalProvider.roleTitle || 'Specialist',
            headline: updatedLocalProvider.headline || null,
            bio: updatedLocalProvider.bio || null,
            photo_url: updatedLocalProvider.photoUrl || null,
            location: updatedLocalProvider.location || null,

            years_experience: updatedLocalProvider.yearsExperience !== undefined && updatedLocalProvider.yearsExperience !== null ? updatedLocalProvider.yearsExperience : null,
            service_mode: updatedLocalProvider.serviceMode || null,
            specialties: updatedLocalProvider.specialties || [],
            skills: updatedLocalProvider.skills || [],
            languages: updatedLocalProvider.languages || [],

            availability_status: updatedLocalProvider.availabilityStatus || null,
            response_time: updatedLocalProvider.responseTime || null,
            status: updatedLocalProvider.status || 'Approved',
            profile_visibility: updatedLocalProvider.profileVisibility || null,

            profile_verified: updatedLocalProvider.profileVerified ?? false,
            pi_verified: updatedLocalProvider.piVerified ?? false,

            website: updatedLocalProvider.website || null,
            social_links: updatedLocalProvider.socialLinks || [],
            portfolio_images: updatedLocalProvider.portfolioImages || [],

            contact_email: updatedLocalProvider.contactEmail || null,
            contact_phone: updatedLocalProvider.contactPhone || null,
          };

          if (isUuidFormat) {
            fullInsertPayload.id = providerId;
          }

          const { data, error } = await executeSafeProviderInsert(fullInsertPayload, updatedLocalProvider.experienceLevel);

          if (error) {
            console.warn('[Supabase Note] Fallback insert for provider failed:', error.message);
            if (error.code === '42501') logRLSHint('providers');
          } else if (data && data[0]) {
            console.log('[Supabase Success] Provider saved via fallback insert:', data[0]);
            if (data[0].id) {
              newDbId = data[0].id;
            }
          }
        } catch (e: any) {
          console.error('[Supabase Exception] Fallback insert failed:', e?.message || e);
        }
      }

      if (newDbId && updatedLocalProvider) {
        const oldId = updatedLocalProvider.id;
        updatedLocalProvider.id = newDbId;
        const currentLocals = this.getProvidersLocal();
        const updatedList = currentLocals.map((p) => (p.id === oldId ? updatedLocalProvider! : p));
        localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(updatedList));
      }
    }

    const locals = this.getProvidersLocal();
    const existingIndex = locals.findIndex((p) => p.id === (updatedLocalProvider?.id || providerId));
    if (existingIndex >= 0) {
      locals[existingIndex] = updatedLocalProvider!;
    } else {
      locals.push(updatedLocalProvider!);
    }
    localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(locals));
  },

  async uploadProviderPhoto(_providerId: string, _file: File): Promise<string | null> {
    return null;
  }
};
