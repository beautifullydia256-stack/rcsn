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
      className="flex gap-4 sm:gap-5 justify-center my-3 sm:my-4"
      animate={shakeKey ? { x: [0, -12, 12, -10, 10, -6, 6, 0] } : {}}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={i < filled ? { scale: [0.85, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.18 }}
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/50 transition-all duration-200 ${
            i < filled
              ? 'bg-white border-white shadow-[0_0_12px_rgba(255,255,255,1),inset_0_1px_2px_rgba(255,255,255,1)]'
              : 'bg-black/50 backdrop-blur-sm shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.3)]'
          }`}
        />
      ))}
    </motion.div>
  );
}

const BUTTON_DIMENSION_STYLE: React.CSSProperties = {
  width: '74px',
  height: '74px',
  minWidth: '74px',
  minHeight: '74px',
  maxWidth: '74px',
  maxHeight: '74px',
  borderRadius: '9999px',
};

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
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center w-full"
    >
      <PinDots filled={digits.length} shakeKey={shakeKey} />

      {/* Error message slot with fixed height */}
      <div className="h-6 mb-2 flex items-center justify-center">
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

      {/* Keypad Grid: Pure neutral dark liquid glass - ZERO greenish hue */}
      <div
        className="mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 74px)',
          columnGap: '22px',
          rowGap: '16px',
          justifyContent: 'center',
          justifyItems: 'center',
          alignItems: 'center',
        }}
      >
        {KEYS.map((item, idx) => {
          if (item.type === 'blank') {
            return (
              <div
                key={`blank-${idx}`}
                style={BUTTON_DIMENSION_STYLE}
                className="pointer-events-none"
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
                style={BUTTON_DIMENSION_STYLE}
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
                  relative overflow-hidden flex-shrink-0 rounded-full
                  flex items-center justify-center
                  transition-all duration-150 ease-out select-none touch-manipulation
                  ${isBackDisabled ? 'opacity-20 cursor-default' : 'cursor-pointer active:scale-95 active:bg-black/85'}
                  bg-slate-950/65 dark:bg-black/75
                  backdrop-blur-md
                  border border-white/25 border-t-white/55 border-l-white/35 border-b-white/15
                  shadow-[0_15px_35px_rgba(0,0,0,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(255,255,255,0.1)]
                  text-white
                `}
              >
                {/* Top Specular Sheen (iOS Liquid Edge) */}
                <span
                  className="absolute top-0 left-2 right-2 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"
                  aria-hidden
                />

                <svg
                  className="w-6 h-6 text-white/90 drop-shadow-sm"
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

          // Digit button: Pure neutral dark glass with white numbers only
          const isNumDisabled = digits.length >= 4;
          const isBtnDisabled = disabled || isNumDisabled;

          return (
            <button
              key={item.key}
              type="button"
              style={BUTTON_DIMENSION_STYLE}
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
                relative overflow-hidden flex-shrink-0 rounded-full
                flex flex-col items-center justify-center
                transition-all duration-150 ease-out select-none touch-manipulation
                ${isBtnDisabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95 active:bg-black/85'}
                bg-slate-950/65 dark:bg-black/75
                backdrop-blur-md
                border border-white/25 border-t-white/55 border-l-white/35 border-b-white/15
                shadow-[0_15px_35px_rgba(0,0,0,0.4),inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(255,255,255,0.1)]
                text-white
              `}
            >
              {/* Top Specular Sheen (iOS Liquid Edge) */}
              <span
                className="absolute top-0 left-2 right-2 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"
                aria-hidden
              />

              {/* Main Digit */}
              <span
                className={`text-2xl font-bold text-white tracking-tight leading-none drop-shadow-sm select-none ${
                  item.sub ? 'mt-0.5' : ''
                }`}
              >
                {item.key}
              </span>

              {/* Sub-letters */}
              {item.sub ? (
                <span className="text-[9px] font-bold tracking-[0.2em] text-white/70 uppercase mt-0.5 leading-none pl-[0.2em] select-none">
                  {item.sub}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
