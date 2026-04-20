import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { applyReturnUrlOverride, resolvePostLoginPath, userMustChangePassword } from '../../lib/postAuthRedirect';
import { publicAssetUrl } from '../../lib/publicAssetUrl';

/**
 * After first login with a one-time password: user must set a new password before accessing the dashboard.
 */
export default function CompleteFirstPasswordPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setRole = useAuthStore((s) => s.setRole);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          navigate('/login', { replace: true });
          return;
        }
        if (!userMustChangePassword(session.user)) {
          const preferred = await resolvePostLoginPath(session.user);
          navigate(applyReturnUrlOverride(preferred), { replace: true });
          return;
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

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
      const { error: err } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (err) throw err;
      await supabase.auth.refreshSession();
      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();
      if (nextSession?.user) {
        setUser(nextSession.user);
        let resolvedRole = String(nextSession.user.user_metadata?.role ?? '').toLowerCase();
        if (!resolvedRole && nextSession.user.id) {
          const { data: row } = await supabase.from('users').select('role').eq('user_id', nextSession.user.id).maybeSingle();
          resolvedRole = String(row?.role ?? '').toLowerCase();
        }
        setRole(resolvedRole || null);
      }
      const preferred = nextSession?.user ? await resolvePostLoginPath(nextSession.user) : '/dashboard';
      navigate(applyReturnUrlOverride(preferred), { replace: true });
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative min-h-screen flex items-center justify-center p-6 sm:p-8 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />
      <div className="relative w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/10 p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <img src={publicAssetUrl('logo.png')} alt="PwezaCore" width={36} height={36} className="rounded" />
            <span className="text-2xl font-bold text-blue-400 tracking-tight">PwezaCore</span>
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-white">Create your password</h1>
          <p className="mt-2 text-sm text-white/75">
            You signed in with a one-time password. Choose a new password you will use from now on, then confirm it.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-white">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-white">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repeat password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
