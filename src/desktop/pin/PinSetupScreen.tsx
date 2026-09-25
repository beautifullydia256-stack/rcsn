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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <GlassBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center"
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h2 className="text-white text-lg font-bold mb-1">Secure your account</h2>
        <p className="text-white/60 text-sm text-center mb-1">
          Hi {lastName} — create a 4-digit PIN
        </p>
        <p className="text-white/40 text-xs text-center mb-4">
          You'll use this to unlock the app offline
        </p>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-5">
          <div
            className={`h-1 w-12 rounded-full transition-all duration-300 ${
              step === 'enter' ? 'bg-white' : 'bg-white/30'
            }`}
          />
          <div
            className={`h-1 w-12 rounded-full transition-all duration-300 ${
              step === 'confirm' ? 'bg-white' : 'bg-white/30'
            }`}
          />
        </div>

        <p className="text-white/80 text-sm font-medium uppercase tracking-widest mb-1">
          {step === 'enter' ? 'Enter PIN' : 'Confirm PIN'}
        </p>
        {step === 'confirm' && (
          <p className="text-white/40 text-xs mb-1">Enter the same PIN again</p>
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
          className="mt-5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Set up later (online login only)
        </button>
      </motion.div>
    </div>
  );
}
