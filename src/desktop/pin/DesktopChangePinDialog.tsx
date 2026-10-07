import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PinPad from './PinPad';
import { X } from 'lucide-react';

interface Props {
  onChangePin: (currentPin: string, newPin: string) => Promise<'correct' | 'wrong' | 'no-user'>;
  onClose: () => void;
}

type Step = 'current' | 'new' | 'confirm';

export default function DesktopChangePinDialog({ onChangePin, onClose }: Props) {
  const [step, setStep] = useState<Step>('current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [digits, setDigits] = useState('');
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(
    async (pin: string) => {
      if (step === 'current') {
        setCurrentPin(pin);
        setDigits('');
        setStep('new');
      } else if (step === 'new') {
        setNewPin(pin);
        setDigits('');
        setStep('confirm');
      } else {
        // confirm
        if (pin !== newPin) {
          setShakeKey((k) => k + 1);
          setError("PINs don't match — try again.");
          setDigits('');
          setStep('new');
          setNewPin('');
          return;
        }
        setSaving(true);
        const result = await onChangePin(currentPin, pin);
        setSaving(false);
        if (result === 'wrong') {
          setShakeKey((k) => k + 1);
          setError('Current PIN was incorrect. Please start again.');
          setDigits('');
          setCurrentPin('');
          setNewPin('');
          setStep('current');
          return;
        }
        setDone(true);
        setTimeout(onClose, 1500);
      }
    },
    [step, currentPin, newPin, onChangePin, onClose],
  );

  useEffect(() => {
    if (digits.length === 4 && !saving) {
      const t = setTimeout(() => handleSubmit(digits), 100);
      return () => clearTimeout(t);
    }
  }, [digits, handleSubmit, saving]);

  const onDigit = useCallback((d: string) => {
    setDigits((p) => (p.length >= 4 ? p : p + d));
    setError('');
  }, []);

  const onBackspace = useCallback(() => {
    setDigits((p) => p.slice(0, -1));
    setError('');
  }, []);

  const stepLabel: Record<Step, string> = {
    current: 'Enter current PIN',
    new: 'Enter new PIN',
    confirm: 'Confirm new PIN',
  };

  const stepIndex = step === 'current' ? 0 : step === 'new' ? 1 : 2;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-slate-950/45 dark:bg-black/55 backdrop-blur-md backdrop-saturate-[150%] border border-white/30 rounded-[28px] shadow-2xl p-8 w-88 flex flex-col items-center overflow-hidden"
      >
        {/* Specular highlights & ambient glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-400/30 rounded-2xl flex items-center justify-center mb-4 text-emerald-300 shadow-inner">
          <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </div>

        <h2 className="text-white text-base font-bold mb-1">Change PIN</h2>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-400/30 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-300 text-sm font-medium">PIN updated successfully</p>
          </div>
        ) : (
          <>
            {/* Step dots */}
            <div className="flex gap-1.5 mb-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-10 rounded-full transition-all duration-300 ${i === stepIndex ? 'bg-emerald-400' : i < stepIndex ? 'bg-emerald-400/50' : 'bg-white/20'}`}
                />
              ))}
            </div>

            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-4">
              {stepLabel[step]}
            </p>

            <PinPad
              digits={digits}
              onDigit={onDigit}
              onBackspace={onBackspace}
              error={error}
              shakeKey={shakeKey}
              disabled={saving}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
