import React, { useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { authService } from '../../services/authService';
import {
  ShieldCheck,
  AlertCircle,
  X,
  LogIn,
  Mail,
  Lock,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface ConsoleAuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const ConsoleAuthModal: React.FC<ConsoleAuthModalProps> = ({ onSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both admin email and password.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured()) {
      const { user, session, error } = await authService.loginWithEmail(email, password);
      setLoading(false);

      if (error) {
        setErrorMsg(error);
      } else if (user || session) {
        setSuccessMsg('Authentication successful!');
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } else {
      // Offline / Direct verification
      const isValid = authService.verifyAdminAuth(password);
      setLoading(false);
      if (isValid) {
        setSuccessMsg('Authentication successful!');
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        setErrorMsg('Invalid email or password. Access denied.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-6 space-y-5 shadow-2xl relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-inner shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-zinc-900">Pipe Business OS Console</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono border border-amber-200">
                Admin
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">
              Secure Administrator Verification Portal
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Admin Email & Password Sign In */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Email</span>
            </label>
            <input
              type="email"
              required
              placeholder="admin@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder-zinc-400 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Business Console</span>
              </>
            )}
          </button>
        </form>

        <div className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-200 flex items-center justify-between">
          <span>System Status:</span>
          <span className="font-mono text-emerald-700 flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active & Encrypted</span>
          </span>
        </div>
      </div>
    </div>
  );
};
