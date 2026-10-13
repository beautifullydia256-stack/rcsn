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
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-[1.5px] transition-all duration-200 ${
            i < filled
              ? 'bg-white border-white shadow-[0_0_14px_rgba(255,255,255,1),inset_0_1px_2px_rgba(255,255,255,1)]'
              : 'bg-white/10 backdrop-blur-sm border-white/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.4),0_2px_6px_rgba(0,0,0,0.3)]'
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
        navigator.vibrate(14);
      } catch {
        // Ignored if device doesn't allow haptics
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center w-full">
      <PinDots filled={digits.length} shakeKey={shakeKey} />

      {/* Error message slot */}
      <div className="h-6 mb-3 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={error}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-300 text-xs sm:text-sm font-semibold text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* iPhone 3D Liquid Glass Keypad Grid - Big circular buttons with generous spacing */}
      <div className="grid grid-cols-3 gap-x-6 sm:gap-x-8 gap-y-4 sm:gap-y-5 justify-items-center w-full max-w-[19.5rem] sm:max-w-[22rem] mx-auto">
        {KEYS.map((item, idx) => {
          if (item.type === 'blank') {
            return (
              <div
                key={`blank-${idx}`}
                className="w-20 h-20 min-w-20 min-h-20 sm:w-[5.25rem] sm:h-[5.25rem] sm:min-w-[5.25rem] sm:min-h-[5.25rem] aspect-square flex-shrink-0 pointer-events-none"
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
                  relative group flex-shrink-0 aspect-square rounded-full
                  w-20 h-20 min-w-20 min-h-20 sm:w-[5.25rem] sm:h-[5.25rem] sm:min-w-[5.25rem] sm:min-h-[5.25rem]
                  flex items-center justify-center
                  transition-all duration-150 ease-out select-none touch-manipulation
                  ${isBackDisabled ? 'opacity-25 cursor-default' : 'cursor-pointer active:scale-[0.92]'}
                  bg-white/[0.18] hover:bg-white/[0.28] active:bg-white/[0.50]
                  backdrop-blur-2xl backdrop-saturate-[180%]
                  border-[1.5px] border-white/40 border-t-white/80 border-l-white/60 border-b-white/20
                  shadow-[0_10px_25px_rgba(0,0,0,0.32),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_3px_rgba(0,0,0,0.25)]
                  active:shadow-[0_3px_10px_rgba(0,0,0,0.45),inset_0_2.5px_4px_rgba(255,255,255,0.95)]
                `}
              >
                {/* 3D Liquid Glass Specular Top Highlight */}
                <span
                  className="absolute top-1 left-2.5 right-2.5 h-[38%] rounded-t-full bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none"
                  aria-hidden
                />

                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.6)]"
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

          // Digit button: big, perfectly circular, 3D liquid glass
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
                relative group flex-shrink-0 aspect-square rounded-full
                w-20 h-20 min-w-20 min-h-20 sm:w-[5.25rem] sm:h-[5.25rem] sm:min-w-[5.25rem] sm:min-h-[5.25rem]
                flex flex-col items-center justify-center
                transition-all duration-150 ease-out select-none touch-manipulation
                ${isBtnDisabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-[0.92]'}
                bg-white/[0.22] hover:bg-white/[0.32] active:bg-white/[0.55]
                backdrop-blur-2xl backdrop-saturate-[180%]
                border-[1.5px] border-white/45 border-t-white/85 border-l-white/60 border-b-white/25
                shadow-[0_10px_25px_rgba(0,0,0,0.32),inset_0_2px_3px_rgba(255,255,255,0.75),inset_0_-2px_3px_rgba(0,0,0,0.25)]
                active:shadow-[0_3px_10px_rgba(0,0,0,0.45),inset_0_2.5px_4px_rgba(255,255,255,0.95)]
              `}
            >
              {/* 3D Liquid Glass Specular Top Highlight */}
              <span
                className="absolute top-1 left-2.5 right-2.5 h-[38%] rounded-t-full bg-gradient-to-b from-white/45 via-white/10 to-transparent pointer-events-none"
                aria-hidden
              />

              {/* Main Digit */}
              <span
                className={`text-3xl sm:text-4xl font-normal text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.6)] leading-none select-none ${
                  item.sub ? 'mt-0.5' : ''
                }`}
              >
                {item.key}
              </span>

              {/* iOS Sub-letters */}
              {item.sub ? (
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.24em] text-white/90 uppercase mt-1 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] pl-[0.24em] select-none">
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
