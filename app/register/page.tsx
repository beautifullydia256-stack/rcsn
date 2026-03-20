'use client';

import React, { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Register() {
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolCode: '',
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

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'schoolName' && value.trim()) {
      generateSchoolCode(value.trim());
    }
  };

  // Generate school code via RPC
  const generateSchoolCode = async (schoolName: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_unique_school_code', {
        school_name: schoolName
      });

      if (error) {
        console.warn('Error generating school code:', error);
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          schoolCode: data[0]?.generate_unique_school_code || ''
        }));
      }
    } catch (err) {
      console.warn('Could not generate school code:', err);
    }
  };

  // Google signup placeholder
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      setError('Google sign-up is temporarily unavailable. Please use the regular signup form.');
      setGoogleLoading(false);
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
      setGoogleLoading(false);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const hasTurnstileKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (hasTurnstileKey && !captchaToken) {
      setError('Please complete CAPTCHA verification.');
      setLoading(false);
      return;
    }

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

    if (!formData.schoolName.trim() || !formData.adminName.trim() || !formData.schoolLocation.trim()) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (!['Nursery/Primary', 'Secondary'].includes(formData.schoolType)) {
      setError('Invalid school type');
      setLoading(false);
      return;
    }

    try {
      const emailRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

      // Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          ...(captchaToken && { captchaToken }),
          ...(emailRedirectTo && { emailRedirectTo }),
          data: {
            school_name: formData.schoolName,
            admin_name: formData.adminName,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Call registration RPC (creates school & links admin)
      const { data: regData, error: regError } = await supabase.rpc('register_school_admin_final', {
        p_user_id: authData.user.id,
        p_email: formData.email,
        p_name: formData.adminName,
        p_phone: formData.phone,
        p_school_name: formData.schoolName,
        p_school_location: formData.schoolLocation,
        p_school_type: formData.schoolType
      });

      if (regError) {
        console.error('Registration RPC error:', regError);
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(regError.message || 'Registration failed. Please try again.');
      }

      // Check if function returned success: false (new function format)
      if (regData && regData.success === false) {
        console.error('Registration function returned error:', regData);
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(regData.message || regData.error || 'School creation failed. Please try again.');
      }

      // Verify school was created and linked properly
      if (!regData || !regData.school_id) {
        console.error('Registration returned invalid data:', regData);
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('School creation failed. Please try again.');
      }

      // Verify user has school_id linked
      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('user_id, school_id, role')
        .eq('user_id', authData.user.id)
        .single();

      if (userCheckError || !userData) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('User record verification failed. Please contact support.');
      }

      if (!userData.school_id) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('School linking failed. Please contact support.');
      }

      // Verify school exists and is linked to this admin
      const { data: schoolData, error: schoolCheckError } = await supabase
        .from('schools')
        .select('school_id, admin_id, name')
        .eq('school_id', userData.school_id)
        .single();

      if (schoolCheckError || !schoolData) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error('School verification failed. Please contact support.');
      }

      if (schoolData.admin_id !== authData.user.id) {
        console.warn('School admin_id mismatch, attempting to fix...');
        // Try to fix the admin_id
        const { error: fixError } = await supabase
          .from('schools')
          .update({ admin_id: authData.user.id })
          .eq('school_id', schoolData.school_id);
        
        if (fixError) {
          console.error('Failed to fix admin_id:', fixError);
        }
      }

      // Update school code after registration
      if (formData.schoolCode && regData?.school_id) {
        await supabase.from('schools')
          .update({ school_code: formData.schoolCode })
          .eq('school_id', regData.school_id);
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
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
            Your school account has been created. Redirecting to login...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="min-h-screen flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="relative w-full max-w-lg rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/10 p-6 sm:p-8">
        <div className="text-center mb-6">
          <Image src="/logo.png" alt="PwezaCore" width={36} height={36} className="inline-block" />
          <h1 className="text-3xl font-bold text-blue-600 mt-2">PwezaCore</h1>
          <p className="text-white/80 text-sm mt-1">Register your school</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* School Name */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">School Name</label>
            <input
              type="text"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="Your School Name"
              required
            />
          </div>
          {/* School Code */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">School Code</label>
            <input
              type="text"
              name="schoolCode"
              value={formData.schoolCode}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="Auto-generated (e.g., KHS)"
              required
            />
            <p className="mt-1 text-xs text-white/60">💡 Auto-generated from school name. You can edit it.</p>
          </div>
          {/* Admin Name */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">Admin Name</label>
            <input
              type="text"
              name="adminName"
              value={formData.adminName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="Full Name"
              required
            />
          </div>
          {/* School Type */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">School Type</label>
            <select
              name="schoolType"
              value={formData.schoolType}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white"
            >
              <option value="Nursery/Primary">Nursery/Primary</option>
              <option value="Secondary">Secondary</option>
            </select>
          </div>
          {/* School Location */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">School Location</label>
            <input
              type="text"
              name="schoolLocation"
              value={formData.schoolLocation}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="City, Country"
              required
            />
          </div>
          {/* Email */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="admin@yourschool.com"
              required
            />
          </div>
          {/* Phone */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="+256 700 000 000"
              required
            />
          </div>
          {/* Password */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="••••••••"
              required
            />
          </div>
          {/* Confirm Password */}
          <div>
            <label className="block mb-1 text-sm font-medium text-white">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Turnstile CAPTCHA */}
          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(undefined)}
              options={{ theme: 'dark', size: 'normal' }}
            />
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="text-center mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-300 hover:text-blue-200 font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
