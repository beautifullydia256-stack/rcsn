'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Wait a moment for the OAuth callback to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to get the user from the OAuth callback
        let { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Auth error:', error);
          throw error;
        }

        if (!user) {
          // Try to get session as fallback
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            throw new Error('No user or session found after OAuth callback');
          }
          
          user = session.user;
        }

        if (!user) {
          throw new Error('No user found');
        }
        
        // Check if this is a Google OAuth user
        const isGoogleUser = user.app_metadata?.provider === 'google';
        
        if (!isGoogleUser) {
          // Regular email/password login - redirect to normal flow
          router.push('/login');
          return;
        }

        // Check if this is a signup flow
        const urlParams = new URLSearchParams(window.location.search);
        const isSignup = urlParams.get('mode') === 'signup';

        if (isSignup) {
          // Handle Google signup flow
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, school_id')
            .eq('user_id', user.id)
            .single();

          if (userError || !userData) {
            // User not found - this is a new signup
            // Redirect to school setup page to collect school details
            router.push('/auth/setup-school');
            return;
          }

          // User exists - redirect to admin dashboard
          router.push('/dashboard/admin');
          return;
        }

        // Handle Google login flow
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, school_id')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData) {
          // User not found in users table - this means they're not a school admin
          await supabase.auth.signOut();
          setError('Google sign-in is only available for school administrators. Please contact your school administrator to set up your account.');
          setLoading(false);
          return;
        }

        // Check if user is an admin
        if (userData.role !== 'admin') {
          await supabase.auth.signOut();
          setError('Google sign-in is only available for school administrators.');
          setLoading(false);
          return;
        }

        // Success - redirect to admin dashboard
        router.push('/dashboard/admin');
        
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        setLoading(false);
      }
    };

    handleAuthCallback();
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
