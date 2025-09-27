'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

function MagicLinkAuthContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        // Get the session from the URL hash/fragment
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        if (!data.session) {
          // Try to get user instead
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError || !userData.user) {
            throw new Error('No session or user found');
          }

          // User exists but no session - redirect to login
          router.push('/login?message=session_expired');
          return;
        }

        const user = data.session.user;
        
        // Check if this is a Google OAuth user
        const isGoogleUser = user.app_metadata?.provider === 'google';
        
        if (isGoogleUser) {
          // Check if this is a signup flow (user doesn't exist in users table)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, school_id')
            .eq('user_id', user.id)
            .single();

          if (userError || !userData) {
            // New Google user - redirect to school setup
            router.push('/auth/setup-school');
            return;
          }

          // Existing Google user - redirect to appropriate dashboard
          if (userData.role === 'admin') {
            router.push('/dashboard/admin');
            return;
          } else if (userData.role === 'teacher') {
            router.push('/dashboard/teacher');
            return;
          } else if (userData.role === 'parent') {
            router.push('/dashboard/parent');
            return;
          } else if (userData.role === 'student') {
            router.push('/dashboard/student');
            return;
          }
        }

        // Regular email/password login - check user role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData) {
          // Check if this might be a student login
          const studentId = user.user_metadata?.student_id;
          if (studentId) {
            router.push('/dashboard/student');
            return;
          }
          throw new Error('User profile not found');
        }

        // Redirect based on role
        const role = userData.role;
        if (role === 'owner') {
          router.push('/dashboard/owner');
        } else if (role === 'admin') {
          router.push('/dashboard/admin');
        } else if (role === 'teacher') {
          router.push('/dashboard/teacher');
        } else if (role === 'parent') {
          router.push('/dashboard/parent');
        } else if (role === 'student') {
          router.push('/dashboard/student');
        } else {
          throw new Error('Invalid user role');
        }
        
      } catch (err: any) {
        console.error('Magic link error:', err);
        setError(err.message || 'Authentication failed');
        setLoading(false);
      }
    };

    handleMagicLink();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Completing sign-in...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Sign-in Failed</h2>
            <p className="text-white/80 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-500 hover:to-indigo-500 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}

export default function MagicLinkAuth() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading...</p>
        </motion.div>
      </div>
    }>
      <MagicLinkAuthContent />
    </Suspense>
  );
}

