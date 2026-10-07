import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export type GlassSelectOption<T extends string | number = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export function LiquidGlassSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder,
  direction = 'down',
  className = '',
  disabled = false,
}: {
  value: T;
  onChange: (val: T) => void;
  options: GlassSelectOption<T>[];
  placeholder?: string;
  direction?: 'down' | 'up';
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={containerRef} className={`relative w-full ${open ? 'z-[60]' : 'z-10'} ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 ${
          open
            ? direction === 'up'
              ? 'rounded-b-xl rounded-t-none border-white/35 bg-black/35'
              : 'rounded-t-xl rounded-b-none border-white/35 bg-black/35'
            : 'rounded-xl border-white/20 bg-black/20 hover:border-white/35'
        } border focus:border-white/70 focus:bg-black/35 backdrop-blur-sm text-white text-xs flex items-center justify-between transition text-left select-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] relative z-20 disabled:opacity-50`}
      >
        <span className={selectedOption ? 'text-white font-medium truncate' : 'text-white/50 truncate'}>
          {selectedOption ? selectedOption.label : placeholder || 'Select an option'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/60 transition-transform duration-200 shrink-0 ml-2 ${
            open ? 'rotate-180 text-emerald-300' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: direction === 'up' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction === 'up' ? 4 : -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            className={`absolute left-0 right-0 ${
              direction === 'up'
                ? 'bottom-full -mb-px rounded-t-2xl rounded-b-none border-b-white/10'
                : 'top-full -mt-px rounded-b-2xl rounded-t-none border-t-white/10'
            } z-[70] 
              bg-slate-950/95 dark:bg-black/95 
              backdrop-blur-xl backdrop-saturate-[160%] 
              border border-white/25 
              shadow-[0_20px_45px_rgba(0,0,0,0.7),inset_0_1px_1.5px_rgba(255,255,255,0.2)] 
              overflow-hidden p-1.5 max-h-56 overflow-y-auto space-y-0.5 text-white no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          >
            {/* Ambient emerald liquid light glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/15 rounded-full blur-xl pointer-events-none" />

            {options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all text-left select-none relative z-10 ${
                    option.disabled
                      ? 'opacity-40 cursor-not-allowed text-white/40'
                      : isSelected
                      ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-400/35 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15 border border-transparent'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LiquidGlassSelect;
