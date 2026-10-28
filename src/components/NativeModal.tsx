'use client';

import { useEffect, isValidElement, ReactNode, ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { X, UserPlus, GraduationCap, Users, type LucideIcon } from 'lucide-react';

interface NativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: ReactNode;
  icon?: LucideIcon | ComponentType<{ className?: string }> | ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  variant?: 'glass' | 'government';
}

/** Max height fits mobile (dynamic viewport) and desktop; inner body scrolls. */
const MODAL_MAX_H = 'max-h-[min(88dvh,720px)]';

export default function NativeModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  variant,
}: NativeModalProps) {
  let locationPathname = '';
  try {
    const loc = useLocation();
    locationPathname = loc.pathname;
  } catch {
    // outside router context fallback
  }

  const isGovernmentMode =
    variant === 'government' ||
    locationPathname.startsWith('/dashboard/admin') ||
    locationPathname.startsWith('/dashboard/students');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: `max-w-md ${MODAL_MAX_H}`,
    md: `max-w-lg ${MODAL_MAX_H}`,
    lg: `max-w-2xl ${MODAL_MAX_H}`,
    xl: `max-w-3xl ${MODAL_MAX_H}`,
    '2xl': 'max-w-5xl max-h-[min(92dvh,880px)]',
    full: 'max-w-[calc(100vw-1.5rem)] sm:max-w-6xl sm:mx-auto max-h-[min(92dvh,880px)]',
  };

  const renderHeaderIcon = () => {
    if (icon) {
      if (isValidElement(icon)) {
        return icon;
      }
      if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
        const IconComponent = (icon as unknown) as ComponentType<{ className?: string }>;
        return <IconComponent className="w-4 h-4" />;
      }
      return null;
    }
    const t = (title || '').toLowerCase();
    if (t.includes('teacher') || t.includes('tutor') || t.includes('instructor')) {
      return <GraduationCap className="w-4 h-4" />;
    }
    if (t.includes('parent') || t.includes('guardian')) {
      return <Users className="w-4 h-4" />;
    }
    return <UserPlus className="w-4 h-4" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            className={`fixed inset-0 z-[240] pointer-events-auto ${
              isGovernmentMode
                ? 'bg-slate-900/10 backdrop-blur-none'
                : 'bg-black/60 backdrop-blur-sm'
            }`}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[240] flex items-center justify-center p-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:p-6 pointer-events-none overflow-y-auto overflow-x-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`relative w-full shrink-0 ${sizeClasses[size]} pointer-events-auto my-auto flex flex-col min-h-0 overflow-hidden ${
                isGovernmentMode
                  ? 'rounded-2xl bg-white text-slate-900 border border-slate-200/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.06)]'
                  : 'rounded-[28px] bg-slate-950/75 dark:bg-black/80 backdrop-blur-xl backdrop-saturate-[180%] border border-white/30 text-white shadow-2xl'
              }`}
            >
              {/* Modal Header */}
              {(title || showCloseButton) && (
                <div
                  className={`flex shrink-0 items-center justify-between gap-3 px-6 py-4 relative z-10 ${
                    isGovernmentMode
                      ? 'border-b border-slate-200 bg-slate-50/70 text-slate-900'
                      : 'border-b border-white/15 text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isGovernmentMode ? (
                      <div className="text-slate-700 shrink-0">
                        {renderHeaderIcon()}
                      </div>
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-2xl bg-white/10 border border-white/25 text-emerald-300">
                        {renderHeaderIcon()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {title && (
                        <h2
                          className={`break-words text-sm font-bold uppercase tracking-wide leading-snug ${
                            isGovernmentMode ? 'text-slate-900 font-sans' : 'text-white'
                          }`}
                        >
                          {title}
                        </h2>
                      )}
                      {subtitle && (
                        <p
                          className={`text-xs truncate sm:text-clip mt-0.5 ${
                            isGovernmentMode ? 'text-slate-500 font-sans' : 'text-white/70'
                          }`}
                        >
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                        isGovernmentMode
                          ? 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg shadow-sm hover:border-slate-300'
                          : 'rounded-xl bg-white/20 hover:bg-rose-600 text-white border border-white/30'
                      }`}
                      aria-label="Close"
                      title="Close window (ESC)"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </button>
                  )}
                </div>
              )}

              {/* Inner body */}
              <div
                className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5 relative z-10 ${
                  isGovernmentMode
                    ? 'bg-white text-slate-900'
                    : '[scrollbar-width:thin] text-white'
                }`}
              >
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export { NativeModal };
