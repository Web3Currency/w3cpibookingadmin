import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

const PASSCODE_STORAGE_KEY = 'w3c_admin_passcode';
const AUTH_SESSION_KEY = 'w3c_admin_authenticated';
const DEFAULT_PASSCODE = '8888';

export const authService = {
  getAdminPasscode(): string {
    return localStorage.getItem(PASSCODE_STORAGE_KEY) || DEFAULT_PASSCODE;
  },

  setAdminPasscode(newPasscode: string): void {
    localStorage.setItem(PASSCODE_STORAGE_KEY, newPasscode);
  },

  verifyAdminAuth(passcode: string): boolean {
    const currentPasscode = this.getAdminPasscode();
    const isValid = passcode.trim() === currentPasscode.trim();
    if (isValid) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    }
    return isValid;
  },

  async loginWithEmail(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      // Fallback to passcode check if passcode is provided in password field
      if (this.verifyAdminAuth(password)) {
        return { user: null, session: null, error: null };
      }
      return { user: null, session: null, error: 'Authentication service unavailable or invalid credentials.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: err?.message || 'Failed to authenticate. Please check your credentials.' };
    }
  },

  async signUpWithEmail(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { user: null, session: null, error: 'Authentication service unavailable.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (data.session) {
        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      }
      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: err?.message || 'Failed to create admin account.' };
    }
  },

  async sendMagicLink(email: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { error: 'Authentication service unavailable.' };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
      });

      return { error: error ? error.message : null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to send login code.' };
    }
  },

  async getCurrentSupabaseUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  },

  isAdminAuthenticated(): boolean {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
  },

  async logoutAdmin(): Promise<void> {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
  }
};
