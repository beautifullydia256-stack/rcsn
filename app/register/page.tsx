'use client';

import React, { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Register() {
  const [formData, setFormData] = useState({
    schoolName: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    schoolType: 'Nursery/Primary',
    schoolLocation: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      // Google OAuth temporarily disabled - will be implemented later
      setError('Google sign-up is temporarily unavailable. Please use the regular signup form.');
      setGoogleLoading(false);
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!formData.schoolLocation.trim()) {
      setError('School location is required');
      setLoading(false);
      return;
    }

    if (!formData.schoolType.trim()) {
      setError('School type is required');
      setLoading(false);
      return;
    }

    // Validate school type is only Nursery/Primary or Secondary
    if (!['Nursery/Primary', 'Secondary'].includes(formData.schoolType)) {
      setError('School type must be either "Nursery/Primary" or "Secondary"');
      setLoading(false);
      return;
    }

    if (!formData.schoolName.trim()) {
      setError('School name is required');
      setLoading(false);
      return;
    }

    if (!formData.adminName.trim()) {
      setError('Admin name is required');
      setLoading(false);
      return;
    }

    try {
      // Create auth user first
      // Note: Don't pass Turnstile token to Supabase - it expects hCaptcha tokens
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            school_name: formData.schoolName,
            admin_name: formData.adminName,
            phone: formData.phone,
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // If user arrived with UTM, record conversion (server calculates earnings later)
      try {
        const url = new URL(window.location.href);
        const utm_campaign = url.searchParams.get('utm_campaign');
        if (utm_campaign) {
          await fetch('/api/affiliate/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ utm_campaign, referred_user_id: authData.user.id, plan: 'Pro', amount_cents: 0 })
          });
        }
      } catch (_) {}

      // Create user record in public.users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          name: formData.adminName,
          role: 'admin',
          phone: formData.phone
        });

      if (userError) {
        console.error('Error creating user record:', userError);
        // Continue anyway as auth user was created
      }

      // Try enhanced function first, fallback to original function
      let registrationResult, registrationError;
      
      try {
        // Use the definitive registration function that works exactly like x256ug@gmail.com
        const finalResult = await supabase
          .rpc('register_school_admin_final', {
            p_user_id: authData.user.id,
            p_email: formData.email,
            p_name: formData.adminName,
            p_phone: formData.phone,
            p_school_name: formData.schoolName,
            p_school_location: formData.schoolLocation.trim(),
            p_school_type: formData.schoolType
          });
        
        registrationResult = finalResult.data;
        registrationError = finalResult.error;
      } catch (err) {
        // Fallback to any of the other function names (they all point to the same function now)
        console.log('Final function not found, trying fallback functions...');
        try {
          const fallbackResult = await supabase
            .rpc('register_school_admin', {
              p_user_id: authData.user.id,
              p_email: formData.email,
              p_name: formData.adminName,
              p_phone: formData.phone,
              p_school_name: formData.schoolName,
              p_school_location: formData.schoolLocation.trim(),
              p_school_type: formData.schoolType
            });
          
          registrationResult = fallbackResult.data;
          registrationError = fallbackResult.error;
        } catch (err2) {
          throw new Error('Registration system not available. Please contact support.');
        }
      }

      if (registrationError) {
        console.error('Registration function error:', registrationError);
        throw new Error(`Registration failed: ${registrationError.message}`);
      }

      if (registrationResult && !registrationResult.success) {
        console.error('RPC returned failure:', registrationResult);
        throw new Error(`Registration failed: ${registrationResult.error || 'Unknown error'}`);
      }

      console.log('Registration process completed successfully:', registrationResult);

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Registration Successful!</h2>
          <p className="text-white/80 mb-4">
            Your school account has been created. Please check your email for a confirmation link.
          </p>
          <p className="text-white/60 text-sm">
            Redirecting to login page...
          </p>
        </motion.div>
      </div>
    );
  }

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

      {/* Glassmorphism registration card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white/10 dark:bg-white/10 backdrop-blur-md shadow-2xl border border-white/10">
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
          <p className="mt-2 text-sm text-white/80">Register your school</p>
        </motion.div>

        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <label className="block mb-1 text-sm font-medium text-white">School Name</label>
              <input
                type="text"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Your School Name"
                required
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.22 }}>
              <label className="block mb-1 text-sm font-medium text-white">Admin Name</label>
              <input
                type="text"
                name="adminName"
                value={formData.adminName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Your Full Name"
                required
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.23 }}>
              <label className="block mb-1 text-sm font-medium text-white">School Type</label>
              <select
                name="schoolType"
                value={formData.schoolType}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              >
                <option value="Nursery/Primary" className="bg-slate-800 text-white">Nursery/Primary</option>
                <option value="Secondary" className="bg-slate-800 text-white">Secondary</option>
              </select>
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.24 }}>
              <label className="block mb-1 text-sm font-medium text-white">School Location</label>
              <input
                type="text"
                name="schoolLocation"
                value={formData.schoolLocation}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="e.g., Kampala, Uganda"
                required
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
              <label className="block mb-1 text-sm font-medium text-white">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="admin@yourschool.com"
                required
              />
              <p className="text-white/60 text-xs mt-1">
                This email will be used for your admin account and school notifications
              </p>
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.27 }}>
              <label className="block mb-1 text-sm font-medium text-white">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="+256 700 000 000"
                required
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.29 }}>
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

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.31 }}>
              <label className="block mb-1 text-sm font-medium text-white">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </motion.div>

            {/* Cloudflare Turnstile CAPTCHA - only show if configured */}
            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY !== '' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 }}>
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
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </motion.button>

            {/* Divider */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.33 }} 
              className="relative my-6"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-white/60">Or register with</span>
              </div>
            </motion.div>

            {/* Google Sign Up Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleGoogleSignUp}
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
              {googleLoading ? 'Signing up with Google...' : 'Continue with Google'}
            </motion.button>
          </form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }} className="text-center mt-6">
            <p className="text-white/80">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-300 hover:text-blue-200 font-medium">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}