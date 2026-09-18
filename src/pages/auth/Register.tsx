import { useEffect, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { publicAssetUrl } from '../../lib/publicAssetUrl';
import { registerApiUrl } from '../../lib/registerApiOrigin';

const REFERRAL_STORAGE = 'pwezacore_referral_jwt';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [referralVerified, setReferralVerified] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralToken, setReferralToken] = useState<string | null>(null);
  const [registeringUnder, setRegisteringUnder] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

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
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaProgress, setCaptchaProgress] = useState(0);
  const [captchaTimedOut, setCaptchaTimedOut] = useState(false);

  const turnstileKey = import.meta.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

  // 15-second fallback: if invisible Turnstile hasn't fired onSuccess yet, unblock the form.
  useEffect(() => {
    if (!turnstileKey || captchaToken) return;
    const t = setTimeout(() => { setCaptchaTimedOut(true); setCaptchaReady(true); }, 15_000);
    return () => clearTimeout(t);
  }, [turnstileKey, captchaToken]);

  // Animate progress bar toward 85% while waiting, jump to 100% on success/timeout
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
    try {
      const t = sessionStorage.getItem(REFERRAL_STORAGE);
      if (t) setReferralToken(t);
    } catch {
      /* ignore */
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'schoolName' && value.trim()) {
      generateSchoolCode(value.trim());
    }
  };

  const generateSchoolCode = async (schoolName: string) => {
    try {
      const { data, error: rpcErr } = await supabase.rpc('generate_unique_school_code', {
        p_school_name: schoolName,
        p_branch_name: null,
      });
      if (!rpcErr && data != null) {
        const code = typeof data === 'string' ? data : String(data);
        setFormData((prev) => ({ ...prev, schoolCode: code }));
      }
    } catch {
      // ignore
    }
  };

  const handleVerifyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyLoading(true);
    setError('');
    try {
      const res = await fetch(registerApiUrl('/api/referrals/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: referralCodeInput }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof json.error === 'string'
            ? json.error
            : 'Invalid or inactive referral code. Please contact support.'
        );
        return;
      }
      const token = typeof json.token === 'string' ? json.token : '';
      if (!token) {
        setError('Invalid or inactive referral code. Please contact support.');
        return;
      }
      setReferralToken(token);
      try {
        sessionStorage.setItem(REFERRAL_STORAGE, token);
      } catch {
        /* ignore */
      }
      setRegisteringUnder(typeof json.registeringUnder === 'string' ? json.registeringUnder : null);
      setReferralVerified(true);
    } catch {
      setError('Invalid or inactive referral code. Please contact support.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token =
      referralToken || (typeof window !== 'undefined' ? sessionStorage.getItem(REFERRAL_STORAGE) : null);
    if (!token) {
      setError('Invalid or inactive referral code. Please contact support.');
      setLoading(false);
      return;
    }

    if (turnstileKey && !captchaToken && !captchaTimedOut) {
      setError('Security check in progress — please wait a moment and try again.');
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
    if (!['Nursery/Primary', 'Secondary', 'Tertiary / Nursing & Midwifery', 'Tertiary', 'Health Training / Nursing'].includes(formData.schoolType)) {
      setError('Invalid school type');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(registerApiUrl('/api/register/school'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralToken: token,
          email: formData.email,
          password: formData.password,
          adminName: formData.adminName,
          phone: formData.phone,
          schoolName: formData.schoolName,
          schoolLocation: formData.schoolLocation,
          schoolType: formData.schoolType,
          schoolCode: formData.schoolCode,
          captchaToken: captchaToken || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Registration failed');
      }

      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (signErr) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        sessionStorage.removeItem(REFERRAL_STORAGE);
      } catch {
        /* ignore */
      }
      navigate('/dashboard/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <p className="text-white/80 mb-4">Redirecting to login...</p>
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
            <img
              src={publicAssetUrl('logo.png')}
              alt="PwezaCore"
              width={36}
              height={36}
              className="inline-block rounded"
            />
          </Link>
          <h1 className="text-3xl font-bold text-blue-600 mt-2">PwezaCore</h1>
          <p className="text-white/80 text-sm mt-1">Register your school</p>
        </div>

        {!referralVerified ? (
          <form onSubmit={handleVerifyReferral} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-white">Enter Referral Code</label>
              <input
                type="text"
                value={referralCodeInput}
                onChange={(e) => setReferralCodeInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/60"
                placeholder="Your referral code"
                autoComplete="off"
                required
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={verifyLoading}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:from-blue-500 hover:to-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {verifyLoading ? 'Verifying...' : 'Verify Code'}
            </button>
            <div className="text-center mt-4">
              <Link to="/login" className="text-blue-300 hover:text-blue-200 font-medium text-sm">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {registeringUnder && (
              <p className="text-sm text-emerald-200/90 text-center bg-emerald-500/10 border border-emerald-400/20 rounded-lg py-2 px-3">
                You are registering under: {registeringUnder}
              </p>
            )}
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
                Auto-generated from school name. You can leave it empty or edit it; custom codes must be unique.
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
                <option value="Tertiary / Nursing & Midwifery">Tertiary / Nursing & Midwifery</option>
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

            {/* Invisible Turnstile — no visible widget, runs silently in background.
                Token arrives in 1-3 s on normal connections; 15-s fallback unblocks slow networks. */}
            {turnstileKey && (
              <>
                <Turnstile
                  siteKey={turnstileKey}
                  onSuccess={(token) => { setCaptchaToken(token); setCaptchaReady(true); setCaptchaTimedOut(false); }}
                  onError={() => { setCaptchaTimedOut(true); setCaptchaReady(true); }}
                  onExpire={() => { setCaptchaToken(undefined); setCaptchaReady(false); }}
                  options={{ size: 'invisible', appearance: 'interaction-only', theme: 'dark' }}
                />
                {!captchaReady && !captchaTimedOut && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>Checking security, please wait…</span>
                      <span className="tabular-nums">{Math.round(captchaProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-100"
                        style={{ width: `${captchaProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {captchaReady && captchaToken && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Security verified
                  </div>
                )}
              </>
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
              <Link to="/login" className="text-blue-300 hover:text-blue-200 font-medium">
                Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
