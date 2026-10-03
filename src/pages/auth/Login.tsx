import React, { useState, useEffect, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { registerApiUrl } from '../../lib/registerApiOrigin';
import { useAuthStore } from '../../store/authStore';
import { applyReturnUrlOverride, resolvePostLoginPath, userMustChangePassword } from '../../lib/postAuthRedirect';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { NO_INTERNET_USER_MESSAGE, userFacingAuthOrNetworkMessage } from '../../lib/networkErrorMessage';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setRole } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaProgress, setCaptchaProgress] = useState(0);
  const [captchaTimedOut, setCaptchaTimedOut] = useState(false);

  const userHasTypedEmailRef = useRef(false);
  const [browserOnline, setBrowserOnline] = useState(
    () => typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true
  );

  const turnstileKey = isDesktopApp ? '' : (import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '');

  // 15-second fallback for slow CDN / firewalled school networks
  useEffect(() => {
    if (!turnstileKey || captchaToken) return;
    const t = setTimeout(() => {
      setCaptchaTimedOut(true);
      setCaptchaReady(true);
    }, 15_000);
    return () => clearTimeout(t);
  }, [turnstileKey, captchaToken]);

  // Animate progress bar toward 85% while waiting
  useEffect(() => {
    if (!turnstileKey) return;
    if (captchaReady || captchaTimedOut) {
      setCaptchaProgress(100);
      return;
    }
    const interval = setInterval(() => {
      setCaptchaProgress((p) => p + (85 - p) * 0.04);
    }, 100);
    return () => clearInterval(interval);
  }, [turnstileKey, captchaReady, captchaTimedOut]);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const emailQ = searchParams.get('email');
    if (emailQ && !userHasTypedEmailRef.current) {
      setFormData((fd) => ({ ...fd, email: decodeURIComponent(emailQ).trim() }));
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const attemptRestore = async () => {
      try {
        const { data: current } = await supabase.auth.getSession();
        if (current?.session?.user) {
          if (navigator.onLine) {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (cancelled) return;
            if (userError || !userData?.user) {
              try {
                await supabase.auth.signOut({ scope: 'local' });
              } catch {}
              useAuthStore.getState().logout();
              window.localStorage.removeItem('pwezacore_remember');
              return;
            }
            if (userMustChangePassword(userData.user)) {
              navigate('/login/complete-password', { replace: true });
              return;
            }
            const path = await resolvePostLoginPath(userData.user);
            if (!cancelled) {
              navigate(applyReturnUrlOverride(path), { replace: true });
            }
            return;
          }

          if (userMustChangePassword(current.session.user)) {
            navigate('/login/complete-password', { replace: true });
            return;
          }
          const path = await resolvePostLoginPath(current.session.user);
          if (!cancelled) {
            navigate(applyReturnUrlOverride(path), { replace: true });
          }
          return;
        }

        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('pwezacore_remember') : null;
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved?.access_token || !saved?.refresh_token) return;
        const { data, error: err } = await supabase.auth.setSession({
          access_token: saved.access_token,
          refresh_token: saved.refresh_token,
        });
        if (cancelled) return;
        if (err || !data?.session) {
          window.localStorage.removeItem('pwezacore_remember');
          return;
        }
        setShowSuccess(true);
        await completePostLogin(data.session, data.session.user);
      } catch {
        // ignore
      }
    };
    void attemptRestore();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 1500);
    return () => clearTimeout(t);
  }, [showSuccess]);

  async function completePostLogin(session: any, user: any) {
    if (userMustChangePassword(user)) {
      setUser(user);
      const userMetadata = user?.raw_user_meta_data || user?.user_metadata || {};
      let resolvedRole = (userMetadata?.role || '').toLowerCase();
      if (!resolvedRole && user?.id) {
        try {
          const { data: userRows } = await supabase.from('users').select('role').eq('user_id', user.id).limit(1);
          resolvedRole = (userRows?.[0]?.role || '').toLowerCase();
        } catch {
          /* ignore */
        }
      }
      if (!resolvedRole && (userMetadata as { student_id?: string })?.student_id) {
        resolvedRole = 'student';
      }
      setRole(resolvedRole || 'student');
      navigate('/login/complete-password', { replace: true });
      return;
    }
    const userMetadata = user?.raw_user_meta_data || user?.user_metadata || {};
    let resolvedRole = (userMetadata?.role || '').toLowerCase();
    if (!resolvedRole && user?.id) {
      try {
        const { data: userRows } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', user.id)
          .limit(1);
        const dbRole = userRows?.[0]?.role;
        resolvedRole = (dbRole || '').toLowerCase();
      } catch {
        /* ignore */
      }
    }
    if (!resolvedRole && (userMetadata as { student_id?: string })?.student_id) {
      resolvedRole = 'student';
    }
    const preferred = await resolvePostLoginPath(user);
    const targetUrl = applyReturnUrlOverride(preferred);
    setUser(user);
    setRole(resolvedRole || 'student');
    navigate(targetUrl, { replace: true });
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'email') {
      const inputType = (e.nativeEvent as InputEvent).inputType;
      if (inputType === 'insertReplacementText' && userHasTypedEmailRef.current) {
        e.target.value = formData.email;
        return;
      }
      userHasTypedEmailRef.current = true;
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resendConfirmationEmail = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(NO_INTERNET_USER_MESSAGE);
      return;
    }
    setResendingEmail(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (err) throw err;
      setEmailSent(true);
      setError('');
    } catch (err: unknown) {
      setError(userFacingAuthOrNetworkMessage(err, 'Failed to resend confirmation email'));
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(NO_INTERNET_USER_MESSAGE);
      return;
    }
    setLoading(true);
    if (turnstileKey && !captchaToken && !captchaTimedOut) {
      setError('Security verification in progress — please wait a moment and try again.');
      setLoading(false);
      return;
    }
    try {
      let email = (formData.email || '').trim();
      const password = formData.password;
      let data: any = null;
      let authError: any = null;

      const looksLikePhone = !email.includes('@') && /^[0-9+\s]+$/.test(email) && email.length > 0;
      if (looksLikePhone) {
        try {
          const resolveRes = await fetch(registerApiUrl('/api/misc?action=auth-resolve-login-identifier'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: email }),
          });
          const resolveData = await resolveRes.json().catch(() => ({ email: null }));
          if (!resolveData.email) {
            throw new Error('Invalid login credentials');
          }
          email = resolveData.email;
        } catch (resolveErr) {
          if (resolveErr instanceof Error && resolveErr.message === 'Invalid login credentials') throw resolveErr;
          throw new Error('Invalid login credentials');
        }
      }

      const loginResult = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      data = loginResult.data;
      authError = loginResult.error;

      if (authError) {
        if (authError.message.includes('email not confirmed') || authError.message.includes('Email not confirmed')) {
          const role = data?.user?.raw_user_meta_data?.role;
          if (role === 'admin') {
            throw new Error('Please check your email and click the confirmation link before logging in.');
          }
        } else {
          throw new Error(authError.message || 'Invalid login credentials');
        }
      }
      if (!data?.user) throw new Error('Login failed - no user account received');

      if (rememberMe && typeof window !== 'undefined' && data.session) {
        const access_token = data.session.access_token;
        const refresh_token = data.session.refresh_token;
        if (access_token && refresh_token) {
          window.localStorage.setItem('pwezacore_remember', JSON.stringify({ access_token, refresh_token }));
        }
      }
      setShowSuccess(true);
      await completePostLogin(data.session, data.user);
    } catch (err: unknown) {
      setError(userFacingAuthOrNetworkMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-4 overflow-y-auto sm:overflow-hidden relative selection:bg-[#00873E] selection:text-white">
      {/* Background Campus Image - Crisp, Sharp, 100% Clear & Natural (Zero blur, zero black darkening) */}
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

      {/* Apple iOS Liquid Glass Login Card - Reduced Gentle Blur, Frosted Transparency */}
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
              alt="Rakai Community School of Nursing Crest"
              className="w-24 h-24 sm:w-28 sm:h-28 mx-auto object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-200 filter contrast-105"
            />
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2 drop-shadow-sm">
            Login
          </h1>
        </div>

        {/* Offline Alert */}
        {!browserOnline && (
          <div
            className="mb-3 rounded-xl border border-amber-400/40 bg-amber-500/20 px-3.5 py-2 text-xs text-amber-100 flex items-start gap-2"
            role="status"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{NO_INTERNET_USER_MESSAGE}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
          <div>
            <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
              Phone Number or Email
            </label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="username email tel"
              className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              placeholder="e.g. phone number or email"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex flex-row items-center justify-between gap-2 pt-0.5">
            <label className="inline-flex items-center gap-1.5 text-xs text-white/85 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/30 bg-black/30 text-[#00873E] focus:ring-[#00873E] cursor-pointer"
              />
              <span>Remember me</span>
            </label>
            <Link
              to="/auth/forgot"
              className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors drop-shadow-sm"
            >
              Forgot password?
            </Link>
          </div>

          {/* Turnstile security check */}
          {turnstileKey && (
            <div className="pt-0.5">
              <Turnstile
                siteKey={turnstileKey}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                  setCaptchaReady(true);
                  setCaptchaTimedOut(false);
                }}
                onError={() => {
                  setCaptchaTimedOut(true);
                  setCaptchaReady(true);
                }}
                onExpire={() => {
                  setCaptchaToken(undefined);
                  setCaptchaReady(false);
                }}
                options={{ size: 'invisible', appearance: 'interaction-only', theme: 'dark' }}
              />
              {!captchaReady && !captchaTimedOut && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Verifying security credentials…</span>
                    <span className="tabular-nums">{Math.round(captchaProgress)}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-100"
                      style={{ width: `${captchaProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {captchaReady && captchaToken && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Security verified</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-950/80 border border-red-700/60 text-red-200 px-3.5 py-2.5 rounded-xl text-xs backdrop-blur-md"
            >
              <p>{error}</p>
              {error.includes('confirmation link') && (
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={resendConfirmationEmail}
                    disabled={resendingEmail || emailSent}
                    className="text-xs text-emerald-300 hover:text-emerald-200 underline font-semibold disabled:opacity-50"
                  >
                    {resendingEmail ? 'Sending...' : emailSent ? 'Email sent! Check inbox.' : 'Resend confirmation email'}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {emailSent && !error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 px-3.5 py-2.5 rounded-xl text-xs backdrop-blur-md flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <span>Confirmation email sent! Please check your inbox.</span>
            </motion.div>
          )}

          {/* Submit Button - iOS Liquid Green Pill */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-[#00873E] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm tracking-wide shadow-[0_12px_28px_rgba(0,135,62,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.45)] border border-emerald-300/30 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Login</span>
              </>
            )}
          </button>
        </form>

        {/* Assistance Information Desk */}
        <div className="mt-5 pt-3.5 border-t border-white/15 text-center space-y-1 relative z-10">
          <div className="flex items-center justify-center gap-1.5 text-xs text-white/90">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-medium">Need assistance accessing your account?</span>
          </div>
          <p className="text-[11px] text-white/70 leading-relaxed">
            Contact Academic Registry & ICT Support Desk:<br />
            <span className="font-bold text-white">+256 (0) 772 000 000</span> or{' '}
            <a href="mailto:admissions@rcsn.ac.ug" className="text-emerald-300 hover:underline font-semibold">
              admissions@rcsn.ac.ug
            </a>
          </p>
        </div>
      </motion.div>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-xl flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Signed in successfully</span>
        </motion.div>
      )}
    </div>
  );
}
