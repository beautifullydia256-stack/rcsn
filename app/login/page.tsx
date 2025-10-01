'use client';

import { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
// Use the shared Supabase client configured for per-tab sessions
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Supabase client is initialized in src/lib/supabase with per-tab sessionStorage

export default function Login() {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const router = useRouter();

  // Auto-hide success toast shortly after it appears
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 1500);
    return () => clearTimeout(t);
  }, [showSuccess]);

  // Note: Do not auto-redirect on mount to avoid refresh loops.
  // Attempt to restore a remembered session from localStorage on mount
  useEffect(() => {
    const attemptRestore = async () => {
      try {
        const { data: current } = await supabase.auth.getSession();
        if (current?.session) return; // already signed in

        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('pwezacore_remember') : null;
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved?.access_token || !saved?.refresh_token) return;

        const { data, error } = await supabase.auth.setSession({
          access_token: saved.access_token,
          refresh_token: saved.refresh_token,
        });
        if (error || !data.session) {
          // stored tokens invalid; cleanup
          window.localStorage.removeItem('pwezacore_remember');
          return;
        }

        setShowSuccess(true);
        await completePostLogin(data.session, data.session.user);
      } catch (e) {
        // ignore restore errors
      }
    };
    attemptRestore();
  }, []);

  // Shared post-login flow: sync cookies for SSR, resolve role, honor returnUrl, redirect
  const completePostLogin = async (session: any, user: any) => {
    // Sync session to HTTP-only cookies so middleware/SSR see the auth state
    try {
      const access_token = session?.access_token as string | undefined;
      const refresh_token = session?.refresh_token as string | undefined;
      if (access_token && refresh_token) {
        await fetch('/api/auth/session-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token })
        });
        // Small delay to ensure cookies are committed before navigating
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (e) {
      // Non-fatal: proceed with client redirect even if cookie sync fails
      console.warn('Session cookie sync failed (non-fatal):', e);
    }
    const userMetadata = user?.raw_user_meta_data || {};
    const roleLower = (userMetadata?.role || '').toLowerCase();
    const roleToPath: Record<string, string> = {
      owner: '/dashboard/owner',
      admin: '/dashboard/admin',
      teacher: '/dashboard/teacher',
      parent: '/dashboard/parent',
      student: '/dashboard/student',
    };

    // Resolve role robustly: metadata → users table → student_id heuristic
    let resolvedRole = roleLower as string | undefined;
    if (!resolvedRole && user?.id) {
      try {
        const { data: userRows } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', user.id)
          .limit(1);
        const dbRole = userRows && userRows.length > 0 ? (userRows[0].role as string | undefined) : undefined;
        resolvedRole = (dbRole || '').toLowerCase();
      } catch {}
    }
    if (!resolvedRole) {
      const studentId = (user?.raw_user_meta_data as any)?.student_id as string | undefined;
      if (studentId) resolvedRole = 'student';
    }

    // Honor returnUrl if present (but never send back to /login)
    let targetUrl: string | null = null;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl');
      if (returnUrl) {
        const decoded = decodeURIComponent(returnUrl);
        if (!decoded.startsWith('/login')) {
          targetUrl = decoded;
        }
      }
    } catch {}

    const preferred = roleToPath[resolvedRole || ''] || '/';
    const destination = targetUrl || preferred;
    if (typeof window !== 'undefined') window.location.replace(destination);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resendConfirmationEmail = async () => {
    if (!formData.email) {
      setError('Please enter your email address first');
      return;
    }

    setResendingEmail(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      
      setEmailSent(true);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      // Google OAuth temporarily disabled - will be implemented later
      setError('Google sign-in is temporarily unavailable. Please use the regular login form.');
      setGoogleLoading(false);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Only require CAPTCHA if Turnstile is configured
    const hasTurnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== '';
    if (hasTurnstileKey && !captchaToken) {
      setError('Please complete the CAPTCHA');
      setLoading(false);
      return;
    }

    try {
      let email = (formData.email || '').trim();
      let password = formData.password;
      let data: any = null;
      let authError: any = null;

      // Try login with the provided credentials directly
      const loginResult = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
        options: { captchaToken },
      });
      
      data = loginResult.data;
      authError = loginResult.error;

      // If login failed and it looks like an admission number, try the old format as fallback
      if (authError && !email.includes('@') && /^[A-Z0-9-]+$/i.test(email)) {
        const fallbackEmail = `${email}@school.local`;
        const fallbackResult = await supabase.auth.signInWithPassword({
          email: fallbackEmail,
          password: password,
          options: { captchaToken },
        });
        
        if (!fallbackResult.error) {
          data = fallbackResult.data;
          authError = null;
        }
      }

      if (authError) {
        // Check if it's an email confirmation error
        if (authError.message.includes('email not confirmed') || authError.message.includes('Email not confirmed')) {
          // Check if this is a school admin (needs email verification) or staff account (auto-confirmed)
          const userMetadata = data?.user?.raw_user_meta_data;
          const role = userMetadata?.role;
          
          if (role === 'admin') {
            // School admins need email verification
            throw new Error('Please check your email and click the confirmation link before logging in.');
          } else {
            // Staff accounts (teachers, students, parents) are auto-confirmed, so this shouldn't happen
            console.warn('Email not confirmed but allowing login for admin-created staff account');
          }
        } else {
          throw new Error(authError.message || 'Invalid login credentials');
        }
      }

      if (!data.user) {
        throw new Error('Login failed - no user data received');
      }

      // Immediate redirect based on role from metadata to avoid middleware race
      const userMetadata = data.user.raw_user_meta_data;
      const metadataRole = userMetadata?.role;
      const roleLower = (metadataRole || '').toLowerCase();
      const roleToPath: Record<string, string> = {
        owner: '/dashboard/owner',
        admin: '/dashboard/admin',
        teacher: '/dashboard/teacher',
        parent: '/dashboard/parent',
        student: '/dashboard/student',
      };

      if (data.session) {
        setShowSuccess(true);

        // Persist tokens if Remember me checked
        try {
          if (rememberMe && typeof window !== 'undefined') {
            const access_token = data.session.access_token as string | undefined;
            const refresh_token = data.session.refresh_token as string | undefined;
            if (access_token && refresh_token) {
              window.localStorage.setItem('pwezacore_remember', JSON.stringify({ access_token, refresh_token }));
            }
          }
        } catch {}

        await completePostLogin(data.session, data.user);
        return;
      }

      // Handle student login
      if (metadataRole === 'student') {
        setShowSuccess(true);
        setTimeout(() => router.replace('/dashboard/student'), 250);
        return;
      }

      // For admin users, check if they're newly registered and might not have a users table record yet
      if (metadataRole === 'admin') {
        // Try to get user record from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, school_id')
          .eq('user_id', data.user.id);

        if (userError || !userData || userData.length === 0) {
          // If no user record found, create one automatically
          console.log('Creating missing user record for admin');
          
          const { error: createUserError } = await supabase
            .from('users')
            .insert({
              user_id: data.user.id,
              email: data.user.email,
              name: userMetadata?.admin_name || userMetadata?.name || 'Admin User',
              role: 'admin'
            });

          if (createUserError) {
            console.error('Error creating user record:', createUserError);
            // Still allow login as admin based on metadata
            console.log('Admin login based on metadata - redirecting to admin dashboard');
            setShowSuccess(true);
            setTimeout(() => router.replace('/dashboard/admin'), 250);
            return;
          }

          // Also create a school if the user doesn't have one
          const { data: schoolData } = await supabase
            .from('schools')
            .select('school_id')
            .eq('admin_id', data.user.id);

          if (!schoolData || schoolData.length === 0) {
            console.log('Creating default school for admin');
            const { error: schoolError } = await supabase
              .from('schools')
              .insert({
                name: userMetadata?.school_name || 'My School',
                location: userMetadata?.school_location || 'Location TBD',
                type: userMetadata?.school_type || 'Nursery/Primary',
                admin_email: data.user.email,
                admin_name: userMetadata?.admin_name || userMetadata?.name || 'Admin User',
                admin_id: data.user.id,
                created_by: data.user.id
              });

            if (!schoolError) {
              // Update user with school_id
              const { data: newSchoolData } = await supabase
                .from('schools')
                .select('school_id')
                .eq('admin_id', data.user.id)
                .single();

              if (newSchoolData) {
                await supabase
                  .from('users')
                  .update({ school_id: newSchoolData.school_id })
                  .eq('user_id', data.user.id);
              }
            }
          }

          console.log('Admin login with created user record and school - redirecting to admin dashboard');
          setShowSuccess(true);
          setTimeout(() => router.replace('/dashboard/admin'), 250);
          return;
        }

        const role = userData[0].role;
        if (role === 'admin' || role === 'owner') {
          setShowSuccess(true);
          setTimeout(() => router.replace('/dashboard/admin'), 250);
          return;
        }
      }

      // For other users (non-admin), check the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('user_id', data.user.id);

      if (userError) {
        // If no user record found, check if it's a student that wasn't properly set up
        if (userError.message.includes('No rows found') || userError.message.includes('not found')) {
          const studentId = data.user.raw_user_meta_data?.student_id;
          if (studentId) {
            router.replace('/dashboard/student');
            return;
          }
          throw new Error('User profile not found. Please contact administrator.');
        }
        throw userError;
      }

      // Handle case where no user record exists or multiple records exist
      if (!userData || userData.length === 0) {
        const studentId = data.user.raw_user_meta_data?.student_id;
        if (studentId) {
          router.replace('/dashboard/student');
          return;
        }
        throw new Error('User profile not found. Please contact administrator.');
      }

      if (userData.length > 1) {
        console.warn('Multiple user records found, using the first one');
      }

      const role = userData[0].role;
      if (role === 'owner') {
        setShowSuccess(true);
        setTimeout(() => router.replace('/dashboard/owner'), 250);
      } else if (role === 'teacher') {
        setShowSuccess(true);
        setTimeout(() => router.replace('/dashboard/teacher'), 250);
      } else if (role === 'parent') {
        setShowSuccess(true);
        setTimeout(() => router.replace('/dashboard/parent'), 250);
      } else if (role === 'student') {
        setShowSuccess(true);
        setTimeout(() => router.replace('/dashboard/student'), 250);
      } else if (role === 'admin') {
        setShowSuccess(true);
        setTimeout(() => router.replace('/dashboard/admin'), 250);
      } else throw new Error('Invalid role');
    } catch (err: any) {
      setError(err.message || 'Login failed');
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
      {/* Full-screen dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />

      {/* Subtle animated background accents */}
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

      {/* Glassmorphism login card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white/10 dark:bg-white/10 backdrop-blur-md shadow-2xl border border-white/10">
        {/* Branding */}
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="px-6 sm:px-8 pt-6 sm:pt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 justify-center">
            <Image src="/logo.png" alt="PwezaCore" width={36} height={36} className="rounded" />
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-600 tracking-tight">PwezaCore</h1>
          </div>
          <p className="mt-2 text-sm text-white/80">Sign in to your account</p>
        </motion.div>

        <div className="p-6 sm:p-8">
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
              <label className="inline-flex items-center gap-2 text-sm text-white/90">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500"
                />
                Remember me
              </label>
              <Link href="/auth/forgot" className="text-sm text-blue-300 hover:text-blue-200 transition-colors">Forgot password?</Link>
            </motion.div>

            {/* Role selection removed: system detects role automatically after login */}

            {/* Cloudflare Turnstile CAPTCHA - only show if configured */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== '' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  options={{ theme: 'auto' }}
                />
              </motion.div>
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
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Divider */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.3 }} 
              className="relative my-6"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-white/60">Or continue with</span>
              </div>
            </motion.div>

            {/* Google Sign In Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white font-medium shadow-lg hover:bg-white/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
            </motion.button>
          </form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-center mt-6">
            <p className="text-white/80">
              Don't have an account?{' '}
              <Link href="/register" className="text-blue-300 hover:text-blue-200 font-medium">
                Register your school
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Success toast */}
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