import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassBackground from '@/components/layout/GlassBackground';
import PinPad from './PinPad';
import { PIN_MAX_FAILS } from './pinStorage';
import { getGreetingLastName } from '@/lib/roleTerminology';

interface Props {
  userName: string;
  failCount: number;
  lockedOut: boolean;
  onAttempt: (pin: string) => Promise<'correct' | 'wrong' | 'locked-out'>;
  onSignOut: () => Promise<void>;
}

export default function PinLockScreen({ userName, failCount, lockedOut, onAttempt, onSignOut }: Props) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [checking, setChecking] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const lastName = getGreetingLastName(userName, 'User');
  const attemptsLeft = PIN_MAX_FAILS - failCount;

  const handleSubmit = useCallback(
    async (pin: string) => {
      setChecking(true);
      const result = await onAttempt(pin);
      setChecking(false);

      if (result === 'wrong') {
        setShakeKey((k) => k + 1);
        const left = PIN_MAX_FAILS - (failCount + 1);
        if (left <= 0) {
          setError('Too many attempts. Signing you out…');
        } else if (left === 1) {
          setError('Wrong PIN — last attempt!');
        } else {
          setError(`Wrong PIN — ${left} attempt${left !== 1 ? 's' : ''} left`);
        }
        setDigits('');
      } else if (result === 'locked-out') {
        setError('Too many attempts. Signing you out…');
        setDigits('');
      }
      // 'correct' → component unmounts
    },
    [onAttempt, failCount],
  );

  useEffect(() => {
    if (digits.length === 4) {
      const t = setTimeout(() => handleSubmit(digits), 100);
      return () => clearTimeout(t);
    }
  }, [digits, handleSubmit]);

  const onDigit = useCallback((d: string) => {
    setDigits((p) => {
      if (p.length >= 4) return p;
      return p + d;
    });
    setError('');
  }, []);

  const onBackspace = useCallback(() => {
    setDigits((p) => p.slice(0, -1));
    setError('');
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await onSignOut();
  }, [onSignOut]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto selection:bg-[#00873E] selection:text-white">
      <GlassBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[23rem] sm:max-w-[26rem] px-5 py-6 sm:px-8 sm:py-8 rounded-[32px] sm:rounded-[38px]
          bg-slate-950/45 sm:bg-slate-950/50
          backdrop-blur-2xl backdrop-saturate-[160%]
          border border-white/30 border-t-white/60 border-l-white/40 border-b-white/20
          shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1.5px_2px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(255,255,255,0.15)]
          flex flex-col items-center my-auto overflow-hidden"
      >
        {/* Top Liquid Glass Specular Sheen (iOS Liquid Edge) */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
        {/* Diagonal ambient light glow */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* User avatar / profile badge in Liquid Glass */}
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/15 backdrop-blur-xl border border-white/35 border-t-white/60 shadow-[0_8px_20px_rgba(0,0,0,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.5)] flex items-center justify-center mb-3">
          <span className="text-white text-2xl sm:text-3xl font-bold select-none drop-shadow-sm">
            {lastName.charAt(0).toUpperCase()}
          </span>
        </div>

        <h2 className="text-white text-xl sm:text-2xl font-bold mb-0.5 tracking-tight drop-shadow-sm text-center">
          Welcome back, {lastName}
        </h2>
        <p className="text-white/60 text-xs sm:text-sm mb-1 text-center">Enter your PIN to continue</p>

        <AnimatePresence mode="wait">
          {lockedOut ? (
            <motion.div
              key="locked-out"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className="w-14 h-14 bg-red-500/20 border border-red-400/40 rounded-full flex items-center justify-center shadow-inner">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="text-red-300 text-sm text-center font-medium">
                Too many failed attempts.<br />Signing you out…
              </p>
            </motion.div>
          ) : (
            <motion.div key="pin-entry" className="flex flex-col items-center w-full">
              {attemptsLeft < PIN_MAX_FAILS && attemptsLeft > 0 && !error && (
                <p className="text-amber-300/90 text-xs font-semibold mb-1 drop-shadow-sm">
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                </p>
              )}
              <PinPad
                digits={digits}
                onDigit={onDigit}
                onBackspace={onBackspace}
                error={error}
                shakeKey={shakeKey}
                disabled={checking || lockedOut}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!lockedOut && (
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="mt-6 text-xs sm:text-sm font-medium text-white/60 hover:text-white transition-all duration-200 disabled:opacity-40 py-2 px-4 rounded-full hover:bg-white/10 active:bg-white/20 select-none"
          >
            {signingOut ? 'Signing out…' : 'Sign in with a different account'}
          </button>
        )}
      </motion.div>
    </div>
  );
}
