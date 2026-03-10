import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolCode: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    schoolType: 'Nursery/Primary',
    schoolLocation: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);

  const turnstileKey = import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'schoolName' && value.trim()) {
      generateSchoolCode(value.trim());
    }
  };

  const generateSchoolCode = async (schoolName: string) => {
    try {
      const { data, error } = await supabase.rpc('generate_unique_school_code', {
        p_school_name: schoolName,
        p_branch_name: null,
      });
      if (!error && data) {
        const code = String(data);
        setFormData((prev) => ({ ...prev, schoolCode: code }));
      }
    } catch {
      // ignore
    }
  };

  const handleGoogleSignUp = () => {
    setGoogleLoading(true);
    setError('');
    setError('Google sign-up is temporarily unavailable. Please use the regular signup form.');
    setGoogleLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (turnstileKey && !captchaToken) {
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          ...(captchaToken && { captchaToken }),
          data: {
            school_name: formData.schoolName,
            admin_name: formData.adminName,
            phone: formData.phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const { data: regData, error: regError } = await supabase.rpc('register_school_admin_final', {
        p_user_id: authData.user.id,
        p_email: formData.email,
        p_name: formData.adminName,
        p_phone: formData.phone,
        p_school_name: formData.schoolName,
        p_school_location: formData.schoolLocation,
        p_school_type: formData.schoolType,
      });

      if (regError) {
        throw new Error(regError.message || 'Registration failed. Please try again.');
      }
      if (regData && (regData as any).success === false) {
        throw new Error((regData as any).message || (regData as any).error || 'School creation failed. Please try again.');
      }
      if (!regData || !(regData as any).school_id) {
        throw new Error('School creation failed. Please try again.');
      }

      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('user_id, school_id, role')
        .eq('user_id', authData.user.id)
        .single();

      if (userCheckError || !userData?.school_id) {
        throw new Error('User record verification failed. Please contact support.');
      }

      if (formData.schoolCode && (regData as any).school_id) {
        await supabase
          .from('schools')
          .update({ school_code: formData.schoolCode })
          .eq('school_id', (regData as any).school_id);
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/10 p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link to="/">
            <img src="/logo.png" alt="PwezaCore" width={36} height={36} className="inline-block rounded" />
          </Link>
          <h1 className="text-3xl font-bold text-blue-600 mt-2">PwezaCore</h1>
          <p className="text-white/80 text-sm mt-1">Register your school</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label className="block mb-1 text-sm font-medium text-white">School Code</label>
            <input
              type="text"
              name="schoolCode"
              value={formData.schoolCode}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
              placeholder="Leave blank to auto-generate (e.g., KHS)"
            />
            <p className="mt-1 text-xs text-white/60">
              💡 Auto-generated from school name. You can leave it empty or edit it; if you choose a custom code, it must be unique.
            </p>
          </div>
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

          {turnstileKey ? (
            <Turnstile
              siteKey={turnstileKey}
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(undefined)}
              options={{ theme: 'dark', size: 'normal' }}
            />
          ) : null}

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
            <Link to="/login" className="text-blue-300 hover:text-blue-200 font-medium">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
