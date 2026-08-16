import { useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAdminAuthenticated());
  const [passcode, setPasscode] = useState<string>(() => authService.getAdminPasscode());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      if (isSupabaseConfigured()) {
        const currentUser = await authService.getCurrentSupabaseUser();
        if (mounted && currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      }
      if (mounted) setLoading(false);
    }

    checkUser();

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            setIsAuthenticated(true);
          }
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, []);

  const loginWithPasscode = useCallback((enteredPasscode: string): boolean => {
    const success = authService.verifyAdminAuth(enteredPasscode);
    if (success) {
      setIsAuthenticated(true);
    }
    return success;
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    const result = await authService.loginWithEmail(email, pass);
    if (result.user || result.session) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    setLoading(false);
    return result;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    const result = await authService.signUpWithEmail(email, pass);
    if (result.user || result.session) {
      setUser(result.user);
      setIsAuthenticated(true);
    }
    setLoading(false);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logoutAdmin();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const updatePasscode = useCallback((newPasscode: string) => {
    authService.setAdminPasscode(newPasscode);
    setPasscode(newPasscode);
  }, []);

  return {
    isAuthenticated,
    passcode,
    user,
    loading,
    loginWithPasscode,
    loginWithEmail,
    signUpWithEmail,
    logout,
    updatePasscode,
  };
}
