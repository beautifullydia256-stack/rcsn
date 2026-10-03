import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Shown after password recovery (link or OTP). Session must already exist (PASSWORD_RECOVERY).
 */
export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setHasSession(!!session);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="h-screen min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400" />
      </div>
    );
  }

  return (
    <div className="h-screen min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-4 overflow-y-auto sm:overflow-hidden relative selection:bg-[#00873E] selection:text-white">
      {/* Background Campus Image - Crisp, Sharp, 100% Clear & Natural */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/images/rcsn/rcsn-campus-gardens.webp"
          alt="RCSN Campus Grounds"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Floating Back to School Website Button - iOS Liquid Glass Pill */}
      <Link
        to="/"
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 text-white text-xs font-semibold backdrop-blur-md border border-white/25 shadow-lg transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Website</span>
      </Link>

      {/* Apple iOS Liquid Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm sm:max-w-md p-5 sm:p-7 rounded-[28px] 
          bg-slate-950/40 dark:bg-black/45 
          backdrop-blur-md backdrop-saturate-[150%] 
          border border-white/30 border-t-white/60 border-l-white/40 border-b-white/20 
          shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(255,255,255,0.15)] 
          my-auto overflow-hidden"
      >
        {/* Top Liquid Glass Specular Sheen (iOS Liquid Edge) */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
        {/* Subtle diagonal liquid light ray */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* School Crest / Badge Only - Free-standing, no box */}
        <div className="text-center mb-3 relative z-10">
          <Link to="/" className="inline-block group focus:outline-none" title="Return to Home">
            <img
              src="/images/rcsn/logo.png"
              alt="RCSN Crest"
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-200 filter contrast-105"
            />
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2 drop-shadow-sm">
            Set New Password
          </h1>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
            RCSN Portal Security
          </p>
        </div>

        {!hasSession ? (
          <div className="space-y-4 text-left relative z-10">
            <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/40 backdrop-blur-md">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Reset Session Expired</span>
              </div>
              <p className="text-white/85 text-xs leading-relaxed">
                There is no active password recovery session. Please request a fresh reset link or enter your SMS code again.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                to="/auth/forgot"
                className="w-full py-2.5 px-4 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-[0_4px_14px_rgba(0,135,62,0.4)] border border-emerald-400/40 transition text-center flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Request New Reset Link</span>
              </Link>
              <Link
                to="/login"
                className="w-full py-2 rounded-xl bg-black/20 hover:bg-black/35 text-white/80 hover:text-white text-xs font-semibold border border-white/20 transition text-center"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 backdrop-blur-md text-center space-y-2 relative z-10">
            <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto" />
            <h3 className="text-sm font-bold text-white">Password Updated Successfully!</h3>
            <p className="text-xs text-white/80">Redirecting to login portal…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-left relative z-10">
            <p className="text-white/85 text-xs sm:text-sm leading-relaxed drop-shadow-sm">
              Create a strong new password for your RCSN account (minimum 8 characters).
            </p>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={loading}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
                placeholder="Repeat new password"
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-950/80 border border-red-700/60 text-red-200 px-3.5 py-2.5 rounded-xl text-xs backdrop-blur-md flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-[0.99] text-white text-sm font-bold shadow-[0_4px_14px_rgba(0,135,62,0.4)] border border-emerald-400/40 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Saving Password…' : 'Save New Password & Sign In'}
            </button>

            <div className="pt-3 text-center border-t border-white/10 mt-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-colors drop-shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
