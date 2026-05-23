import { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion } from 'framer-motion';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { applyReturnUrlOverride, resolvePostLoginPath, userMustChangePassword } from '../../lib/postAuthRedirect';
import { isDesktopApp } from '../../lib/isDesktopApp';
import { publicAssetUrl } from '../../lib/publicAssetUrl';
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  // If the Turnstile script is slow (common on firewalled/slow networks), allow login after 15 s
  // rather than blocking forever. The token is still sent if it arrives.
  const [captchaTimedOut, setCaptchaTimedOut] = useState(false);
  const [browserOnline, setBrowserOnline] = useState(
    () => typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true
  );

  const turnstileKey = isDesktopApp ? '' : (import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '');

  // 15-second fallback: if invisible Turnstile hasn't fired onSuccess yet, unblock the form.
  // This handles slow CDN loads (firewalled schools, slow networks) without locking users out.
  useEffect(() => {
    if (!turnstileKey || captchaToken) return;
    const t = setTimeout(() => setCaptchaTimedOut(true), 15_000);
    return () => clearTimeout(t);
  }, [turnstileKey, captchaToken]);

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
    if (emailQ) {
      setFormData((fd) => ({ ...fd, email: decodeURIComponent(emailQ).trim() }));
    }
  }, [searchParams]);

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      if (userMustChangePassword(session.user)) {
        navigate('/login/complete-password', { replace: true });
        return;
      }
      // Already authenticated — send to dashboard; WebPinGate will lock if needed
      const path = await resolvePostLoginPath(session.user);
      navigate(applyReturnUrlOverride(path), { replace: true });
    })();
  }, [navigate]);

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 1500);
    return () => clearTimeout(t);
  }, [showSuccess]);

  useEffect(() => {
    const attemptRestore = async () => {
      try {
        const { data: current } = await supabase.auth.getSession();
        if (current?.session) {
          if (userMustChangePassword(current.session.user)) {
            navigate('/login/complete-password', { replace: true });
            return;
          }
          // Session is valid — go to dashboard; PIN gate handles locking
          const path = await resolvePostLoginPath(current.session.user);
          navigate(applyReturnUrlOverride(path), { replace: true });
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
        if (err || !data.session) {
          window.localStorage.removeItem('pwezacore_remember');
          return;
        }
        setShowSuccess(true);
        await completePostLogin(data.session, data.session.user);
      } catch {
        // ignore
      }
    };
    attemptRestore();
  }, []);

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

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setError('');
    setError('Google sign-in is temporarily unavailable. Please use the regular login form.');
    setGoogleLoading(false);
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
      setError('Security check in progress — please wait a moment and try again.');
      setLoading(false);
      return;
    }
    try {
      let email = (formData.email || '').trim();
      let password = formData.password;
      let data: any = null;
      let authError: any = null;

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
      if (!data?.user) throw new Error('Login failed - no user data received');

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen flex items-center justify-center p-6 sm:p-8 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.25, scale: 1 }}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600 blur-3xl"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.2, scale: 1 }}
        transition={{ duration: 1.4, delay: 0.1 }}
        className="pointer-events-none absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-600 blur-3xl"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white/10 dark:bg-white/10 backdrop-blur-md shadow-2xl border border-white/10">
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="px-6 sm:px-8 pt-6 sm:pt-8 text-center"
        >
          <Link to={isDesktopApp ? '/login' : '/'} className="inline-flex items-center gap-2 justify-center">
            <img src={publicAssetUrl('logo.png')} alt="PwezaCore" width={36} height={36} className="rounded" />
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-600 tracking-tight">PwezaCore</h1>
          </Link>
          <p className="mt-2 text-sm text-white/80">Sign in to your account</p>
        </motion.div>

        <div className="p-6 sm:px-8">
          {!browserOnline && (
            <div
              className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100"
              role="status"
            >
              {NO_INTERNET_USER_MESSAGE}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <label className="block mb-1 text-sm font-medium text-white">Email / Username</label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="you@example.com"
                required
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
              <label className="block mb-1 text-sm font-medium text-white">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.28 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-white/90 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500 cursor-pointer"
                />
                Remember me
              </label>
              <Link to="/auth/forgot" className="text-sm text-blue-300 hover:text-blue-200 transition-colors">Forgot password?</Link>
            </motion.div>

            {/* Invisible Turnstile — no visible widget, runs silently in background.
                Token arrives in 1-3 s on normal connections; 15-s fallback unblocks slow networks. */}
            {turnstileKey && (
              <Turnstile
                siteKey={turnstileKey}
                onSuccess={(token) => { setCaptchaToken(token); setCaptchaTimedOut(false); }}
                onError={() => setCaptchaTimedOut(true)}
                onExpire={() => setCaptchaToken(undefined)}
                options={{ size: 'invisible', appearance: 'interaction-only', theme: 'dark' }}
              />
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg">
                {error}
                {error.includes('confirmation link') && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={resendConfirmationEmail}
                      disabled={resendingEmail || emailSent}
                      className="text-sm text-blue-300 hover:text-blue-200 underline disabled:opacity-50"
                    >
                      {resendingEmail ? 'Sending...' : emailSent ? 'Email sent! Check your inbox.' : 'Resend confirmation email'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {emailSent && !error && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-green-500/10 border border-green-400/30 text-green-200 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Confirmation email sent! Please check your inbox and click the link to confirm your email.</span>
                </div>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </motion.button>

            {!isDesktopApp && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-white/60">Or continue with</span>
                  </div>
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-medium shadow-lg hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {googleLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
                </motion.button>
              </>
            )}
          </form>

          {!isDesktopApp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-center mt-6">
              <p className="text-white/80">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-300 hover:text-blue-200 font-medium">
                  Register your school
                </Link>
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-green-500/90 text-white shadow-lg"
        >
          Signed in successfully
        </motion.div>
      )}
    </motion.div>
  );
}
