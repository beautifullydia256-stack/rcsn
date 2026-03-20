import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * Enter email + verification code from the reset email (when Supabase includes an OTP in the template).
 */
export default function RecoveryCodePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const e = searchParams.get('email');
    if (e) setEmail(e);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (!token.trim()) {
      setError('Enter the verification code from your email.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim().replace(/\s/g, ''),
        type: 'recovery',
      });
      if (err) throw err;
      navigate('/auth/update-password', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code or email. Try again or use the link in the email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white/10 backdrop-blur-md p-8 border border-white/10">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Enter verification code</h1>
        <p className="text-white/75 mb-6 text-sm text-left">
          Use the code from your reset email. If your email only had a button and no code, open that button instead — it will
          take you straight to setting a new password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm text-white/80 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40"
              placeholder="you@school.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 tracking-widest font-mono"
              placeholder="e.g. 123456"
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-300 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Continue'}
          </button>
        </form>
        <p className="mt-6 text-center">
          <Link to="/auth/forgot" className="text-blue-300 hover:text-blue-200 text-sm">
            Send a new reset email
          </Link>
          <span className="text-white/40 mx-2">·</span>
          <Link to="/login" className="text-white/60 hover:text-white/80 text-sm">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
