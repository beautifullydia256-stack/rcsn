import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * Shown after password recovery (link or OTP). Session must already exist (PASSWORD_RECOVERY).
 */
export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setHasSession(!!session);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white/10 backdrop-blur-md p-8 border border-white/10 text-center">
          <h1 className="text-xl font-bold text-white mb-3">Session expired</h1>
          <p className="text-white/80 text-sm mb-6 text-left">
            There is no active password reset session. Request a new email and use the link or verification code from that
            message.
          </p>
          <Link to="/auth/forgot" className="text-blue-300 hover:text-blue-200 font-medium">
            Request a new reset link
          </Link>
          <p className="mt-4">
            <Link to="/login" className="text-white/60 hover:text-white/80 text-sm">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white/10 backdrop-blur-md p-8 border border-white/10">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Set a new password</h1>
        <p className="text-white/75 mb-6 text-sm text-center">Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/80 mb-1">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm text-white/80 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40"
              placeholder="Repeat password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          {error && <p className="text-red-300 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
        <p className="mt-6 text-center">
          <Link to="/login" className="text-blue-300 hover:text-blue-200 text-sm">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
