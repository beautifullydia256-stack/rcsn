import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PinPadProps {
  digits: string;
  onDigit: (d: string) => void;
  onBackspace: () => void;
  error?: string;
  shakeKey?: number;
  disabled?: boolean;
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['⌫', '0', ''],
];

export function PinDots({
  filled,
  total = 4,
  shakeKey,
}: {
  filled: number;
  total?: number;
  shakeKey?: number;
}) {
  return (
    <motion.div
      key={shakeKey}
      className="flex gap-5 justify-center my-5"
      animate={shakeKey ? { x: [0, -10, 10, -10, 10, -6, 6, 0] } : {}}
      transition={{ duration: 0.38, ease: 'easeInOut' }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={i < filled ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.15 }}
          className={`w-4 h-4 rounded-full border-2 transition-colors duration-150 ${
            i < filled
              ? 'bg-white border-white'
              : 'bg-transparent border-white/40'
          }`}
        />
      ))}
    </motion.div>
  );
}

export default function PinPad({
  digits,
  onDigit,
  onBackspace,
  error,
  shakeKey,
  disabled = false,
}: PinPadProps) {
  // Physical keyboard support
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key >= '0' && e.key <= '9') onDigit(e.key);
      else if (e.key === 'Backspace') onBackspace();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDigit, onBackspace, disabled]);

  return (
    <div className="flex flex-col items-center w-full">
      <PinDots filled={digits.length} shakeKey={shakeKey} />

      <div className="h-5 mb-3">
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={error}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-300 text-sm font-medium text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {ROWS.flat().map((key, idx) => {
          if (key === '') return <div key={idx} />;
          const isBack = key === '⌫';
          const isNumDisabled = !isBack && digits.length >= 4;

          return (
            <button
              key={key}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent focus stealing on desktop
                if (isBack) onBackspace();
                else if (!isNumDisabled && !disabled) onDigit(key);
              }}
              disabled={disabled || isNumDisabled}
              className={`
                w-[4.5rem] h-[4.5rem] rounded-full flex items-center justify-center
                text-2xl font-semibold transition-all duration-100 select-none
                ${disabled || isNumDisabled
                  ? 'opacity-30 cursor-default'
                  : 'cursor-pointer active:scale-90'}
                ${isBack
                  ? 'bg-transparent text-white/70 hover:text-white text-3xl'
                  : 'bg-white/15 text-white hover:bg-white/25 active:bg-white/35 shadow-sm'}
              `}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
