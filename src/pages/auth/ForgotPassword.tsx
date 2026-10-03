import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { registerApiUrl } from '../../lib/registerApiOrigin';

type Mode = 'email' | 'phone';
type PhonePhase = 'enter-phone' | 'enter-code' | 'enter-password';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedPhone = searchParams.get('phone') ?? '';
  const linkedCode = searchParams.get('code') ?? '';
  const arrivedViaPhoneLink = searchParams.get('mode') === 'phone' && !!linkedPhone && !!linkedCode;

  const [mode, setMode] = useState<Mode>(arrivedViaPhoneLink ? 'phone' : 'email');

  // --- Email flow state ---
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

  /** Lets /auth/callback route recovery to set-password after PKCE */
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

  return (
    <div className="h-screen min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-4 overflow-y-auto sm:overflow-hidden relative selection:bg-[#00873E] selection:text-white">
      {/* Background Campus Image - Crisp, Sharp, 100% Clear & Natural */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="/images/rcsn/rcsn-campus-gardens.webp"
          alt="RCSN Campus Grounds"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Floating Back to School Website Button - iOS Liquid Glass Pill */}
      <Link
        to="/"
        className="absolute top-5 left-5 z-20 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 text-white text-xs font-semibold backdrop-blur-md border border-white/25 shadow-lg transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Website</span>
      </Link>

      {/* Apple iOS Liquid Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm sm:max-w-md p-5 sm:p-7 rounded-[28px] 
          bg-slate-950/40 dark:bg-black/45 
          backdrop-blur-md backdrop-saturate-[150%] 
          border border-white/30 border-t-white/60 border-l-white/40 border-b-white/20 
          shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(255,255,255,0.15)] 
          my-auto overflow-hidden"
      >
        {/* Top Liquid Glass Specular Sheen (iOS Liquid Edge) */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
        {/* Subtle diagonal liquid light ray */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* School Crest / Badge Only - Free-standing, no box */}
        <div className="text-center mb-3 relative z-10">
          <Link to="/" className="inline-block group focus:outline-none" title="Return to Home">
            <img
              src="/images/rcsn/logo.png"
              alt="RCSN Crest"
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-200 filter contrast-105"
            />
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight mt-2 drop-shadow-sm">
            Reset Password
          </h1>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
            RCSN Portal Security
          </p>
        </div>

        {/* Mode Selector Tabs (Email vs Phone) */}
        {!emailSent && (
          <div className="flex gap-2 mb-4 p-1 rounded-2xl bg-black/30 border border-white/15 backdrop-blur-md relative z-10" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                mode === 'email'
                  ? 'bg-[#00873E] text-white shadow-[0_2px_10px_rgba(0,135,62,0.4)] border border-emerald-400/40'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setMode('email')}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>By Email</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'phone'}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                mode === 'phone'
                  ? 'bg-[#00873E] text-white shadow-[0_2px_10px_rgba(0,135,62,0.4)] border border-emerald-400/40'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setMode('phone')}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>By Phone (SMS)</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="relative z-10">
          {mode === 'email' ? (
            emailSent ? (
              <div className="space-y-4 text-left">
                <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 backdrop-blur-md">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Reset Link & Code Dispatched</span>
                  </div>
                  <p className="text-white/90 text-xs leading-relaxed">
                    If an account exists for <strong className="text-emerald-300">{email}</strong>, we sent an email with a verification code and direct reset link.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <Link
                    to={`/auth/recovery-code?email=${encodeURIComponent(email.trim())}`}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-[0_4px_14px_rgba(0,135,62,0.4)] border border-emerald-400/40 transition text-center flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Enter Verification Code</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setEmailSent(false)}
                    className="w-full py-2 rounded-xl bg-black/20 hover:bg-black/35 text-white/80 hover:text-white text-xs font-semibold border border-white/20 transition text-center"
                  >
                    Resend to a different email
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-left">
                <p className="text-white/85 text-xs sm:text-sm leading-relaxed drop-shadow-sm">
                  Enter your registered portal email address. We will send a secure reset link with a verification code.
                </p>

                <div>
                  <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
                    placeholder="e.g. nurse@rcsn.ac.ug"
                    autoComplete="email"
                    disabled={emailLoading}
                    required
                  />
                </div>

                {emailError && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-950/80 border border-red-700/60 text-red-200 px-3.5 py-2.5 rounded-xl text-xs backdrop-blur-md flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{emailError}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-[0.99] text-white text-sm font-bold shadow-[0_4px_14px_rgba(0,135,62,0.4)] border border-emerald-400/40 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {emailLoading ? 'Sending Reset Instructions…' : 'Send Reset Email'}
                </button>
              </form>
            )
          ) : phonePhase === 'enter-phone' ? (
            <form onSubmit={handleRequestPhoneCode} className="space-y-3.5 text-left">
              <p className="text-white/85 text-xs sm:text-sm leading-relaxed drop-shadow-sm">
                Enter the phone number registered on your RCSN account. We will text you a 6-digit verification code.
              </p>

              <div>
                <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
                  placeholder="e.g. 0772 123456"
                  autoComplete="tel"
                  disabled={phoneLoading}
                  required
                />
              </div>

              {phoneError && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-950/80 border border-red-700/60 text-red-200 px-3.5 py-2.5 rounded-xl text-xs backdrop-blur-md flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{phoneError}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-[0.99] text-white text-sm font-bold shadow-[0_4px_14px_rgba(0,135,62,0.4)] border border-emerald-400/40 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {phoneLoading ? 'Sending SMS Code…' : 'Send Reset Code'}
              </button>
            </form>
          ) : phonePhase === 'enter-code' ? (
            <form onSubmit={handleCheckPhoneCode} className="space-y-3.5 text-left">
              <p className="text-emerald-300 text-xs sm:text-sm font-medium leading-relaxed drop-shadow-sm">
                {phoneInfo || 'Enter the 6-digit security code received via SMS.'}
              </p>

              <div>
                <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                  SMS Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-base tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  disabled={phoneLoading}
                  autoFocus
                  required
                />
              </div>

              {phoneError && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-950/80 border border-red-700/60 text-red-200 px-3.5 py-2.5 rounded-xl text-xs backdrop-blur-md flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{phoneError}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-[0.99] text-white text-sm font-bold shadow-[0_4px_14px_rgba(0,135,62,0.4)] border border-emerald-400/40 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {phoneLoading ? 'Verifying Code…' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPhonePhase('enter-phone');
                  setPhoneError('');
                }}
                className="w-full text-center text-xs text-emerald-300 hover:text-emerald-200 underline pt-1"
              >
                Use a different phone number
              </button>
            </form>
          ) : (
            <form onSubmit={handleSetNewPassword} className="space-y-3.5 text-left">
              <p className="text-emerald-300 text-xs sm:text-sm font-medium leading-relaxed drop-shadow-sm">
                {phoneInfo || 'Code verified. Create your new password below.'}
              </p>

              <div>
                <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  disabled={phoneLoading}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/25 bg-black/20 hover:border-white/40 focus:border-white/80 focus:bg-black/35 backdrop-blur-md text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  disabled={phoneLoading}
                  required
                />
              </div>

              {phoneError && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-950/80 border border-red-700/60 text-red-200 px-3.5 py-2.5 rounded-xl text-xs backdrop-blur-md flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{phoneError}</span>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={phoneLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-[0.99] text-white text-sm font-bold shadow-[0_4px_14px_rgba(0,135,62,0.4)] border border-emerald-400/40 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {phoneLoading ? 'Saving Password…' : 'Set New Password & Sign In'}
              </button>
            </form>
          )}

          {/* Footer Back link */}
          <div className="pt-4 text-center border-t border-white/10 mt-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-colors drop-shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
