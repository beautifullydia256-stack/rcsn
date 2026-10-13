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

        {/* Lock Icon in Liquid Glass Circle */}
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/15 backdrop-blur-xl border border-white/35 border-t-white/60 shadow-[0_8px_20px_rgba(0,0,0,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.5)] flex items-center justify-center mb-3">
          <svg className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-white text-xl sm:text-2xl font-bold mb-0.5 tracking-tight drop-shadow-sm text-center">
          Secure your account
        </h2>
        <p className="text-white/70 text-xs sm:text-sm text-center mb-0.5">
          Hi {lastName} — create a 4-digit PIN
        </p>
        <p className="text-white/50 text-[11px] sm:text-xs text-center mb-3">
          You'll use this to unlock the app quickly
        </p>

        {/* Step indicator pills */}
        <div className="flex gap-2 mb-3">
          <div
            className={`h-1.5 w-12 rounded-full transition-all duration-300 ${
              step === 'enter'
                ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.85)]'
                : 'bg-white/25'
            }`}
          />
          <div
            className={`h-1.5 w-12 rounded-full transition-all duration-300 ${
              step === 'confirm'
                ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.85)]'
                : 'bg-white/25'
            }`}
          />
        </div>

        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
          {step === 'enter' ? 'Enter New PIN' : 'Confirm PIN'}
        </p>
        {step === 'confirm' && (
          <p className="text-white/50 text-xs mb-1">Enter the same 4 digits again</p>
        )}

        <PinPad
          digits={digits}
          onDigit={onDigit}
          onBackspace={onBackspace}
          error={error}
          shakeKey={shakeKey}
          disabled={saving}
        />

        <button
          onClick={onSkipForNow}
          className="mt-6 text-xs sm:text-sm font-medium text-white/50 hover:text-white transition-all duration-200 py-2 px-4 rounded-full hover:bg-white/10 active:bg-white/20 select-none"
        >
          Set up later (online login only)
        </button>
      </motion.div>
    </div>
  );
}
