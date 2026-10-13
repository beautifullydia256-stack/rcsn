import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PinPadProps {
  digits: string;
  onDigit: (d: string) => void;
  onBackspace: () => void;
  error?: string;
  shakeKey?: number;
  disabled?: boolean;
}

interface KeyDef {
  type: 'digit' | 'blank' | 'backspace';
  key: string;
  sub?: string;
}

const KEYS: KeyDef[] = [
  { type: 'digit', key: '1', sub: '' },
  { type: 'digit', key: '2', sub: 'ABC' },
  { type: 'digit', key: '3', sub: 'DEF' },
  { type: 'digit', key: '4', sub: 'GHI' },
  { type: 'digit', key: '5', sub: 'JKL' },
  { type: 'digit', key: '6', sub: 'MNO' },
  { type: 'digit', key: '7', sub: 'PQRS' },
  { type: 'digit', key: '8', sub: 'TUV' },
  { type: 'digit', key: '9', sub: 'WXYZ' },
  { type: 'blank', key: 'blank' },
  { type: 'digit', key: '0', sub: '' },
  { type: 'backspace', key: 'backspace' },
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
      className="flex gap-4 sm:gap-5 justify-center my-4 sm:my-5"
      animate={shakeKey ? { x: [0, -12, 12, -10, 10, -6, 6, 0] } : {}}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={i < filled ? { scale: [0.85, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.18 }}
          className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-[1.5px] transition-all duration-200 ${
            i < filled
              ? 'bg-white border-white shadow-[0_0_14px_rgba(255,255,255,0.9),inset_0_1px_2px_rgba(255,255,255,1)]'
              : 'bg-white/10 backdrop-blur-md border-white/50 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3)]'
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

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignored if device doesn't allow haptics
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <PinDots filled={digits.length} shakeKey={shakeKey} />

      {/* Error message slot with stable height */}
      <div className="h-6 mb-2 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={error}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-300 text-xs sm:text-sm font-semibold text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* iPhone Liquid Glass Keypad Grid */}
      <div className="grid grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-3.5 sm:gap-y-4 justify-items-center">
        {KEYS.map((item, idx) => {
          if (item.type === 'blank') {
            return (
              <div
                key={`blank-${idx}`}
                className="w-[4.65rem] h-[4.65rem] sm:w-[5.25rem] sm:h-[5.25rem] pointer-events-none"
                aria-hidden
              />
            );
          }

          if (item.type === 'backspace') {
            const isBackDisabled = disabled || digits.length === 0;
            return (
              <button
                key="backspace"
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isBackDisabled) {
                    triggerHaptic();
                    onBackspace();
                  }
                }}
                disabled={isBackDisabled}
                aria-label="Delete last digit"
                className={`
                  relative group
                  w-[4.65rem] h-[4.65rem] sm:w-[5.25rem] sm:h-[5.25rem]
                  rounded-full flex items-center justify-center
                  transition-all duration-150 ease-out select-none touch-manipulation
                  ${isBackDisabled ? 'opacity-25 cursor-default' : 'cursor-pointer active:scale-95'}
                  bg-white/[0.12] hover:bg-white/[0.22] active:bg-white/[0.38]
                  backdrop-blur-2xl backdrop-saturate-[180%]
                  border border-white/30 border-t-white/55 border-l-white/40 border-b-white/15
                  shadow-[0_6px_16px_rgba(0,0,0,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-1px_1.5px_rgba(0,0,0,0.2)]
                  active:shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.7)]
                `}
              >
                {/* Liquid Glass Top Curved Specular Rim Highlight */}
                <span
                  className="absolute top-1 left-2.5 right-2.5 h-[36%] rounded-t-full bg-gradient-to-b from-white/25 via-white/5 to-transparent pointer-events-none"
                  aria-hidden
                />

                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
                  />
                </svg>
              </button>
            );
          }

          // Digit button
          const isNumDisabled = digits.length >= 4;
          const isBtnDisabled = disabled || isNumDisabled;

          return (
            <button
              key={item.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                if (!isBtnDisabled) {
                  triggerHaptic();
                  onDigit(item.key);
                }
              }}
              disabled={isBtnDisabled}
              aria-label={`Digit ${item.key}`}
              className={`
                relative group
                w-[4.65rem] h-[4.65rem] sm:w-[5.25rem] sm:h-[5.25rem]
                rounded-full flex flex-col items-center justify-center
                transition-all duration-150 ease-out select-none touch-manipulation
                ${isBtnDisabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                bg-white/[0.16] hover:bg-white/[0.26] active:bg-white/[0.44]
                backdrop-blur-2xl backdrop-saturate-[180%]
                border border-white/35 border-t-white/65 border-l-white/45 border-b-white/20
                shadow-[0_8px_20px_rgba(0,0,0,0.25),inset_0_1.5px_2px_rgba(255,255,255,0.6),inset_0_-1.5px_2px_rgba(0,0,0,0.2)]
                active:shadow-[0_2px_8px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.9)]
              `}
            >
              {/* Liquid Glass Top Curved Specular Rim Highlight */}
              <span
                className="absolute top-1 left-2.5 right-2.5 h-[36%] rounded-t-full bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none"
                aria-hidden
              />

              {/* Main Digit */}
              <span
                className={`text-3xl sm:text-4xl font-light text-white tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] leading-none ${
                  item.sub ? 'mt-0.5' : ''
                }`}
              >
                {item.key}
              </span>

              {/* iOS Sub-letters */}
              {item.sub ? (
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.24em] text-white/80 uppercase mt-1 leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] pl-[0.24em]">
                  {item.sub}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
