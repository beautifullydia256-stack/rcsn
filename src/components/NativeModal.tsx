'use client';

import { useEffect, isValidElement, ReactNode, ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
}

/** Max height fits mobile (dynamic viewport) and desktop; inner body scrolls. */
const MODAL_MAX_H = 'max-h-[min(88dvh,720px)]';

/**
 * Desktop: centered panel — width is capped by `size` (do not use max-w-full here;
 * it overrides max-w-lg/xl and makes the dialog span the whole screen).
 * Mobile: w-full uses horizontal padding from the overlay wrapper.
 */
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
}: NativeModalProps) {
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

  const sizeClasses = {
    sm: `max-w-md ${MODAL_MAX_H}`,
    md: `max-w-lg ${MODAL_MAX_H}`,
    lg: `max-w-2xl ${MODAL_MAX_H}`,
    xl: `max-w-3xl ${MODAL_MAX_H}`,
    '2xl': `max-w-5xl ${MODAL_MAX_H}`,
    /** Nearly full width on small screens; on sm+ cap ~1152px so desktop is not edge-to-edge */
    full: `max-w-[calc(100vw-1.5rem)] sm:max-w-6xl sm:mx-auto ${MODAL_MAX_H}`,
  };

  const renderHeaderIcon = () => {
    if (icon) {
      if (isValidElement(icon)) {
        return icon;
      }
      if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
        const IconComponent = (icon as unknown) as ComponentType<{ className?: string }>;
        return <IconComponent className="w-5 h-5" />;
      }
      return null;
    }
    const t = (title || '').toLowerCase();
    if (t.includes('teacher') || t.includes('tutor') || t.includes('instructor')) {
      return <GraduationCap className="w-5 h-5" />;
    }
    if (t.includes('parent') || t.includes('guardian')) {
      return <Users className="w-5 h-5" />;
    }
    return <UserPlus className="w-5 h-5" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - 100% Transparent so background page remains completely visible & unblurred */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            className="fixed inset-0 bg-transparent z-[240]"
          />

          {/* Modal Container: centered; inner body scrolls (scrollbar visually hidden). */}
          <div className="fixed inset-0 z-[240] flex items-center justify-center p-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:p-6 pointer-events-none overflow-y-auto overflow-x-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 14 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-full shrink-0 ${sizeClasses[size]} pointer-events-auto my-auto flex flex-col min-h-0 rounded-[28px] 
                bg-slate-950/75 dark:bg-black/60 
                backdrop-blur-xl backdrop-saturate-[160%] 
                ring-1 ring-slate-950/30 dark:ring-white/15
                border border-white/40 border-t-white/75 border-l-white/55 border-b-white/30 
                shadow-[0_28px_65px_-8px_rgba(0,0,0,0.32),0_8px_24px_rgba(0,0,0,0.14),inset_0_1.5px_2px_rgba(255,255,255,0.75),inset_0_-1px_1px_rgba(255,255,255,0.2)] 
                text-white overflow-hidden`}
            >
              {/* Top Specular Sheen (iOS Liquid Edge) */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/85 to-transparent pointer-events-none" />
              {/* Subtle diagonal liquid light rays */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

              {/* Modal Header */}
              {(title || showCloseButton) && (
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/15 px-5 py-4 sm:px-7 sm:py-5 relative z-10">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-emerald-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] shrink-0">
                      {renderHeaderIcon()}
                    </div>
                    <div className="min-w-0 flex-1">
                      {title && (
                        <h2 className="break-words text-base sm:text-lg font-black text-white tracking-tight drop-shadow-sm leading-snug">
                          {title}
                        </h2>
                      )}
                      {subtitle && (
                        <p className="text-xs text-white/60 truncate sm:text-clip mt-0.5">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white transition active:scale-95 shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Inner body - no scrollbar, smooth scroll */}
              <div
                className={
                  "min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y px-5 py-5 sm:px-7 sm:py-6 relative z-10 no-scrollbar " +
                  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
                }
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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

