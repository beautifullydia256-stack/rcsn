import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassBackground from '@/components/layout/GlassBackground';
import PinPad from './PinPad';
import { getGreetingLastName } from '@/lib/roleTerminology';

interface Props {
  userName: string;
  onComplete: (pin: string) => Promise<void>;
  onSkipForNow: () => void;
}

type Step = 'enter' | 'confirm';

export default function PinSetupScreen({ userName, onComplete, onSkipForNow }: Props) {
  const [step, setStep] = useState<Step>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(
    async (pin: string) => {
      if (step === 'enter') {
        setFirstPin(pin);
        setDigits('');
        setStep('confirm');
      } else {
        if (pin !== firstPin) {
          setShakeKey((k) => k + 1);
          setError("PINs don't match — try again.");
          setDigits('');
          setStep('enter');
          setFirstPin('');
          return;
        }
        setSaving(true);
        await onComplete(pin);
      }
    },
    [step, firstPin, onComplete],
  );

  // Auto-submit when 4th digit is entered
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

  const lastName = getGreetingLastName(userName, 'User');

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between items-center py-8 sm:py-12 px-4 sm:px-6 overflow-y-auto selection:bg-[#00873E] selection:text-white">
      {/* Full-screen natural wallpaper background */}
      <GlassBackground />

      {/* Top Header: Lock Icon Badge, Title, Step indicators - NO CARD BOX */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center w-full max-w-sm pt-2 sm:pt-4"
      >
        {/* 3D Liquid Glass Lock Badge */}
        <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-white/20 backdrop-blur-2xl border-[1.5px] border-white/50 border-t-white/85 border-l-white/60 shadow-[0_10px_28px_rgba(0,0,0,0.35),inset_0_2px_3px_rgba(255,255,255,0.75),inset_0_-2px_3px_rgba(0,0,0,0.25)] flex items-center justify-center mb-3 relative overflow-hidden">
          <span className="absolute top-1 left-2 right-2 h-[38%] rounded-t-full bg-gradient-to-b from-white/45 via-white/10 to-transparent pointer-events-none" />
          <svg className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h2 className="text-white text-2xl sm:text-3xl font-bold mb-1 tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] text-center">
          Secure your account
        </h2>
        <p className="text-white/85 text-xs sm:text-sm font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] text-center mb-0.5">
          Hi {lastName} — create a 4-digit PIN
        </p>
        <p className="text-white/70 text-[11px] sm:text-xs text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] mb-3">
          You'll use this to unlock the app quickly
        </p>

        {/* Step indicator pills */}
        <div className="flex gap-2 mb-2">
          <div
            className={`h-1.5 w-12 rounded-full transition-all duration-300 ${
              step === 'enter'
                ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)]'
                : 'bg-white/30'
            }`}
          />
          <div
            className={`h-1.5 w-12 rounded-full transition-all duration-300 ${
              step === 'confirm'
                ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)]'
                : 'bg-white/30'
            }`}
          />
        </div>

        <p className="text-white/90 text-xs font-semibold uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {step === 'enter' ? 'Enter New PIN' : 'Confirm PIN'}
        </p>
        {step === 'confirm' && (
          <p className="text-white/70 text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] mt-0.5">Enter the same 4 digits again</p>
        )}
      </motion.div>

      {/* Middle: 3D Liquid Glass Keypad directly on wallpaper - NO CARD BOX */}
      <div className="relative z-10 w-full flex flex-col items-center my-auto py-2">
        <PinPad
          digits={digits}
          onDigit={onDigit}
          onBackspace={onBackspace}
          error={error}
          shakeKey={shakeKey}
          disabled={saving}
        />
      </div>

      {/* Bottom: Skip button */}
      <div className="relative z-10 pb-2">
        <button
          onClick={onSkipForNow}
          className="text-xs sm:text-sm font-medium text-white/80 hover:text-white transition-all py-2.5 px-6 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-xl border border-white/25 shadow-md drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] select-none"
        >
          Set up later (online login only)
        </button>
      </div>
    </div>
  );
}
