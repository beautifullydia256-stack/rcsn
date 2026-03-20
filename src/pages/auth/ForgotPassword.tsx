import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  /** Lets /auth/callback route recovery to set-password after PKCE (not only dashboard). */
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback?flow=recovery`
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (err) throw err;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white/10 backdrop-blur-md p-8 border border-white/10 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Reset password</h1>
        {sent ? (
          <>
            <p className="text-white/85 mb-4 text-left text-sm leading-relaxed">
              If an account exists for <strong className="text-white">{email}</strong>, we sent an email that includes:
            </p>
            <ul className="text-white/85 mb-6 text-left text-sm list-disc pl-5 space-y-2">
              <li>
                A <strong className="text-white">verification code</strong> you can enter here on the site, and
              </li>
              <li>
                A <strong className="text-white">Reset password</strong> button — click it to go straight to choosing a new
                password.
              </li>
            </ul>
            <p className="text-white/60 text-xs mb-6 text-left">
              If the email only shows the button and no code, that is normal for some mail settings; use the button or request
              another email.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to={`/auth/recovery-code?email=${encodeURIComponent(email.trim())}`}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4"
              >
                Enter verification code
              </Link>
              <Link to="/login" className="text-blue-300 hover:text-blue-200 font-medium text-sm text-center">
                Back to sign in
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-white/75 mb-6 text-left text-sm">
              Enter the email you use for PwezaCore. We will send a reset message with a verification code and a button to set
              a new password.
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
              {error && <p className="text-red-300 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset email'}
              </button>
            </form>
            <p className="mt-6">
              <Link to="/login" className="text-blue-300 hover:text-blue-200 text-sm">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
