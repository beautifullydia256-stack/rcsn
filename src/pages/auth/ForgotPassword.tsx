import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { registerApiUrl } from '../../lib/registerApiOrigin';

type Mode = 'email' | 'phone';
type PhonePhase = 'enter-phone' | 'enter-code' | 'enter-password';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  // Arriving from the SMS reset link (?mode=phone&phone=...&code=...) skips straight to the
  // "enter new password" screen with the code pre-filled — same convenience as the email
  // flow's "Reset password" button, just carried via our own URL instead of a Supabase link.
  const [searchParams] = useSearchParams();
  const linkedPhone = searchParams.get('phone') ?? '';
  const linkedCode = searchParams.get('code') ?? '';
  const arrivedViaPhoneLink = searchParams.get('mode') === 'phone' && !!linkedPhone && !!linkedCode;

  const [mode, setMode] = useState<Mode>(arrivedViaPhoneLink ? 'phone' : 'email');

  // --- Email flow state (unchanged behavior) ---
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // --- Phone flow state ---
  const [phonePhase, setPhonePhase] = useState<PhonePhase>(arrivedViaPhoneLink ? 'enter-code' : 'enter-phone');
  const [phone, setPhone] = useState(linkedPhone);
  const [code, setCode] = useState(linkedCode);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneInfo, setPhoneInfo] = useState(
    arrivedViaPhoneLink ? 'Checking your code…' : ''
  );

  /** Lets /auth/callback route recovery to set-password after PKCE (not only dashboard). */
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback?flow=recovery`
      : undefined;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!email.trim()) {
      setEmailError('Enter your email address.');
      return;
    }
    setEmailLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (err) throw err;
      setEmailSent(true);
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRequestPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    if (!phone.trim()) {
      setPhoneError('Enter your phone number.');
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch(registerApiUrl('/api/misc?action=auth-request-phone-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setPhoneInfo(data.message || 'If that phone number is registered, a reset code has been sent.');
      setPhonePhase('enter-code');
    } catch (err: unknown) {
      setPhoneError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPhoneLoading(false);
    }
  };

  /** Checks the code alone, WITHOUT setting a password yet — the password fields only appear
   *  once this succeeds, instead of collecting an unverified code and a password together. */
  const checkCode = async () => {
    setPhoneError('');
    if (!code.trim()) {
      setPhoneError('Enter the code you received by SMS.');
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch(registerApiUrl('/api/misc?action=auth-check-phone-reset-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.valid) throw new Error(data.error || 'Incorrect code.');
      setPhoneInfo('Code verified. Choose your new password.');
      setPhonePhase('enter-password');
    } catch (err: unknown) {
      setPhoneError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleCheckPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    void checkCode();
  };

  // Arriving via the SMS reset link carries a code already — verify it immediately instead of
  // requiring an extra manual click, but still gate the password fields behind that check.
  useEffect(() => {
    if (arrivedViaPhoneLink) void checkCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    if (newPassword.length < 8) {
      setPhoneError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPhoneError('Passwords do not match.');
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch(registerApiUrl('/api/misc?action=auth-verify-phone-reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim(), new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      setPhoneError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPhoneLoading(false);
    }
  };

  const tabButtonClass = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white/10 backdrop-blur-md p-8 border border-white/10 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Reset password</h1>

        {!emailSent && (
          <div className="flex gap-2 mb-6 mt-4" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              className={tabButtonClass(mode === 'email')}
              onClick={() => setMode('email')}
            >
              By email
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'phone'}
              className={tabButtonClass(mode === 'phone')}
              onClick={() => setMode('phone')}
            >
              By phone (SMS)
            </button>
          </div>
        )}

        {mode === 'email' ? (
          emailSent ? (
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
              <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm text-white/80 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40"
                    placeholder="you@school.com"
                    autoComplete="email"
                    disabled={emailLoading}
                  />
                </div>
                {emailError && <p className="text-red-300 text-sm">{emailError}</p>}
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 disabled:opacity-50"
                >
                  {emailLoading ? 'Sending…' : 'Send reset email'}
                </button>
              </form>
            </>
          )
        ) : phonePhase === 'enter-phone' ? (
          <>
            <p className="text-white/75 mb-6 text-left text-sm">
              Enter the phone number registered on your PwezaCore account. We will text you a 6-digit code to reset your
              password.
            </p>
            <form onSubmit={handleRequestPhoneCode} className="space-y-4 text-left">
              <div>
                <label className="block text-sm text-white/80 mb-1">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40"
                  placeholder="07XX XXX XXX"
                  autoComplete="tel"
                  disabled={phoneLoading}
                />
              </div>
              {phoneError && <p className="text-red-300 text-sm">{phoneError}</p>}
              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 disabled:opacity-50"
              >
                {phoneLoading ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          </>
        ) : phonePhase === 'enter-code' ? (
          <>
            <p className="text-white/85 mb-6 text-left text-sm leading-relaxed">{phoneInfo}</p>
            <form onSubmit={handleCheckPhoneCode} className="space-y-4 text-left">
              <div>
                <label className="block text-sm text-white/80 mb-1">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40 tracking-widest"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  disabled={phoneLoading}
                  autoFocus
                />
              </div>
              {phoneError && <p className="text-red-300 text-sm">{phoneError}</p>}
              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 disabled:opacity-50"
              >
                {phoneLoading ? 'Verifying…' : 'Verify code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhonePhase('enter-phone');
                  setPhoneError('');
                }}
                className="w-full text-blue-300 hover:text-blue-200 text-sm"
              >
                Use a different phone number
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-white/85 mb-6 text-left text-sm leading-relaxed">{phoneInfo}</p>
            <form onSubmit={handleSetNewPassword} className="space-y-4 text-left">
              <div>
                <label className="block text-sm text-white/80 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  disabled={phoneLoading}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/40"
                  autoComplete="new-password"
                  disabled={phoneLoading}
                />
              </div>
              {phoneError && <p className="text-red-300 text-sm">{phoneError}</p>}
              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 disabled:opacity-50"
              >
                {phoneLoading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          </>
        )}

        {!(mode === 'email' && emailSent) && (
          <p className="mt-6">
            <Link to="/login" className="text-blue-300 hover:text-blue-200 text-sm">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
