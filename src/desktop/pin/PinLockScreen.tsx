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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <GlassBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center"
      >
        {/* User avatar */}
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
          <span className="text-white text-2xl font-bold select-none">
            {lastName.charAt(0).toUpperCase()}
          </span>
        </div>

        <h2 className="text-white text-lg font-bold mb-0.5">
          Welcome back, {lastName}
        </h2>
        <p className="text-white/50 text-xs mb-5">Enter your PIN to continue</p>

        <AnimatePresence mode="wait">
          {lockedOut ? (
            <motion.div
              key="locked-out"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 py-4"
            >
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
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
                <p className="text-amber-300/80 text-xs mb-1">
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
            className="mt-5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
          >
            {signingOut ? 'Signing out…' : 'Sign in with a different account'}
          </button>
        )}
      </motion.div>
    </div>
  );
}
