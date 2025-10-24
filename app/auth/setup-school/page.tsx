'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function SetupSchool() {
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolCode: '',
    location: '',
    type: 'Nursery/Primary' as 'Nursery/Primary' | 'Secondary',
    phone: '',
    motto: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/login');
          return;
        }

        // Check if user already has a school
        const { data: existingUser } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();

        if (existingUser?.school_id) {
          // User already has a school, redirect to dashboard
          router.push('/dashboard/admin');
          return;
        }

        setUser(user);
      } catch (err) {
        console.error('Error getting user:', err);
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
    };

    getUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Auto-generate school code when school name changes
    if (name === 'schoolName' && value.trim()) {
      generateSchoolCode(value.trim());
    }
  };

  const generateSchoolCode = async (schoolName: string) => {
    try {
      const { data: generatedCode, error } = await supabase.rpc('generate_unique_school_code', {
        p_school_name: schoolName,
        p_branch_name: null
      });
      
      if (!error && generatedCode) {
        setFormData(prev => ({ ...prev, schoolCode: generatedCode }));
      }
    } catch (err) {
      console.warn('Could not generate school code:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!user) {
      setError('User not found');
      setLoading(false);
      return;
    }

    try {
      // Create user record if it doesn't exist
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          user_id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin',
          role: 'admin'
        });

      if (userError) {
        throw userError;
      }

      // Use the registration function to create school
      const { data: registrationResult, error: registrationError } = await supabase
        .rpc('register_google_admin', {
          p_user_id: user.id,
          p_email: user.email,
          p_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Admin',
          p_school_name: formData.schoolName,
          p_school_location: formData.location,
          p_school_type: formData.type
        });

      if (registrationError || !registrationResult?.success) {
        throw new Error(registrationError?.message || 'Failed to create school');
      }

      // Update school with additional details including school code
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          motto: formData.motto,
          address: formData.address,
          phone: formData.phone,
          school_code: formData.schoolCode
        })
        .eq('school_id', registrationResult.school_id);

      if (updateError) {
        console.error('Error updating school details:', updateError);
        // Don't throw here, school was created successfully
      }

      // Success - redirect to admin dashboard
      router.push('/dashboard/admin');

    } catch (err: any) {
      console.error('Setup error:', err);
      setError(err.message || 'Failed to set up school');
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
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
    );
  }

  if (!user) {
    return null; // Will redirect to login
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

      {/* Glassmorphism setup card */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white/10 dark:bg-white/10 backdrop-blur-md shadow-2xl border border-white/10">
        {/* Header */}
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="px-6 sm:px-8 pt-6 sm:pt-8 text-center"
        >
          <div className="inline-flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-600 tracking-tight">PwezaCore</h1>
          </div>
          <p className="mt-2 text-sm text-white/80">Complete your school setup</p>
          <div className="mt-4 p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
            <p className="text-green-200 text-sm">
              <strong>Signed in as:</strong> {user.email}
            </p>
          </div>
        </motion.div>

        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <label className="block mb-1 text-sm font-medium text-white">School Name *</label>
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

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.21 }}>
              <label className="block mb-1 text-sm font-medium text-white">School Code *</label>
              <div className="relative">
                <input
                  type="text"
                  name="schoolCode"
                  value={formData.schoolCode}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Auto-generated (e.g., KHS)"
                  required
                />
                {formData.schoolCode && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                      ✓ Unique
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-white/60">
                💡 School code is auto-generated from your school name. You can edit it if needed.
              </p>
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.22 }}>
              <label className="block mb-1 text-sm font-medium text-white">School Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                required
              >
                <option value="Nursery/Primary" className="bg-slate-800">Nursery/Primary</option>
                <option value="Secondary" className="bg-slate-800">Secondary</option>
              </select>
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.24 }}>
              <label className="block mb-1 text-sm font-medium text-white">Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="City, Country (e.g., Kampala, Uganda)"
                required
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.26 }}>
              <label className="block mb-1 text-sm font-medium text-white">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                placeholder="Full school address"
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.28 }}>
              <label className="block mb-1 text-sm font-medium text-white">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="+256 700 000 000"
              />
            </motion.div>

            <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <label className="block mb-1 text-sm font-medium text-white">School Motto</label>
              <input
                type="text"
                name="motto"
                value={formData.motto}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Your school's motto or vision"
              />
            </motion.div>

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
              {loading ? 'Setting up your school...' : 'Complete Setup'}
            </motion.button>
          </form>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-center mt-6">
            <p className="text-white/60 text-sm">
              Need help? Contact our support team
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

