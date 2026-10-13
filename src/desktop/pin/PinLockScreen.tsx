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
    <div className="fixed inset-0 z-50 flex flex-col justify-between items-center py-6 sm:py-10 px-4 sm:px-6 overflow-y-auto selection:bg-[#00873E] selection:text-white">
      {/* 100% Crisp, natural, unblurred background */}
      <GlassBackground />

      {/* Top Header: Avatar, Welcome, Passcode subtitle - NO CARD BOX */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center w-full max-w-sm pt-2"
      >
        {/* Avatar Circle: Pure neutral dark liquid glass */}
        <div
          style={{ width: '74px', height: '74px', minWidth: '74px', minHeight: '74px', maxWidth: '74px', maxHeight: '74px', borderRadius: '9999px' }}
          className="relative overflow-hidden rounded-full bg-slate-950/65 dark:bg-black/75 backdrop-blur-md border border-white/25 border-t-white/55 border-l-white/35 border-b-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center mb-3"
        >
          <span className="absolute top-0 left-2 right-2 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
          <span className="text-white text-2xl sm:text-3xl font-black select-none drop-shadow-sm">
            {lastName.charAt(0).toUpperCase()}
          </span>
        </div>

        <h2 className="text-white text-xl sm:text-2xl font-bold mb-0.5 tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] text-center">
          Welcome back, {lastName}
        </h2>
        <p className="text-white/85 text-xs sm:text-sm font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] text-center">
          Enter your PIN to continue
        </p>

        {attemptsLeft < PIN_MAX_FAILS && attemptsLeft > 0 && !error && !lockedOut && (
          <p className="text-amber-300 text-xs font-semibold mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
          </p>
        )}
      </motion.div>

      {/* Middle: NativeModal Liquid Glass Keypad directly on background - NO CARD BOX */}
      <div className="relative z-10 w-full flex flex-col items-center my-auto py-2">
        <AnimatePresence mode="wait">
          {lockedOut ? (
            <motion.div
              key="locked-out"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 py-6"
            >
              <div className="w-14 h-14 bg-red-500/30 border border-red-400/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="text-red-200 text-sm text-center font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
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

      {/* Bottom Action Pill */}
      {!lockedOut && (
        <div className="relative z-10 pb-2">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs sm:text-sm font-semibold text-white/80 hover:text-white transition-all py-2 px-5 rounded-full bg-slate-950/45 hover:bg-slate-950/65 active:scale-95 backdrop-blur-md border border-white/25 shadow-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] select-none"
          >
            {signingOut ? 'Signing out…' : 'Sign in with a different account'}
          </button>
        </div>
      )}
    </div>
  );
}
