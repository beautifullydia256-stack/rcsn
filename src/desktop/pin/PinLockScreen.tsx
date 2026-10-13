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
    <div className="fixed inset-0 z-50 flex flex-col justify-between items-center py-8 sm:py-12 px-4 sm:px-6 overflow-y-auto selection:bg-[#00873E] selection:text-white">
      {/* Full-screen natural wallpaper background */}
      <GlassBackground />

      {/* Top Header: Avatar, Welcome Title, Passcode subtitle - NO CARD BOX */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center w-full max-w-sm pt-2 sm:pt-4"
      >
        {/* 3D Liquid Glass Avatar circle */}
        <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-white/20 backdrop-blur-2xl border-[1.5px] border-white/50 border-t-white/85 border-l-white/60 shadow-[0_10px_28px_rgba(0,0,0,0.35),inset_0_2px_3px_rgba(255,255,255,0.75),inset_0_-2px_3px_rgba(0,0,0,0.25)] flex items-center justify-center mb-3.5 relative overflow-hidden">
          {/* Specular sheen curve */}
          <span className="absolute top-1 left-2 right-2 h-[38%] rounded-t-full bg-gradient-to-b from-white/45 via-white/10 to-transparent pointer-events-none" />
          <span className="text-white text-3xl sm:text-4xl font-bold select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {lastName.charAt(0).toUpperCase()}
          </span>
        </div>

        <h2 className="text-white text-2xl sm:text-3xl font-bold mb-1 tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] text-center">
          Welcome back, {lastName}
        </h2>
        <p className="text-white/85 text-xs sm:text-sm font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] text-center">
          Enter your PIN to continue
        </p>

        {attemptsLeft < PIN_MAX_FAILS && attemptsLeft > 0 && !error && !lockedOut && (
          <p className="text-amber-300 text-xs font-semibold mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
          </p>
        )}
      </motion.div>

      {/* Middle: 3D Liquid Glass Keypad floating directly on the wallpaper - NO CARD BOX */}
      <div className="relative z-10 w-full flex flex-col items-center my-auto py-2">
        <AnimatePresence mode="wait">
          {lockedOut ? (
            <motion.div
              key="locked-out"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <div className="w-16 h-16 bg-red-500/25 border-[1.5px] border-red-400/50 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="text-red-200 text-sm text-center font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Too many failed attempts.<br />Signing you out…
              </p>
            </motion.div>
          ) : (
            <motion.div key="pin-entry" className="w-full flex flex-col items-center">
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
      </div>

      {/* Bottom: Sign out / switch account button */}
      {!lockedOut && (
        <div className="relative z-10 pb-2">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs sm:text-sm font-medium text-white/85 hover:text-white transition-all py-2.5 px-6 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-xl border border-white/25 shadow-md drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] select-none"
          >
            {signingOut ? 'Signing out…' : 'Sign in with a different account'}
          </button>
        </div>
      )}
    </div>
  );
}
