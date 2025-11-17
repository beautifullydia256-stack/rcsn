'use client';

import { useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface NativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

export default function NativeModal({
  isOpen,
  onClose,
  title,
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
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    full: 'max-w-full mx-4',
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
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`relative w-full ${sizeClasses[size]} pointer-events-auto`}
            >
              <div className="relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
                <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 shadow-lg">
                  {/* Header */}
                  {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-white/10">
                      {title && (
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {title}
                        </h2>
                      )}
                      {showCloseButton && (
                        <button
                          onClick={onClose}
                          className="p-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-gray-600 dark:text-gray-400"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">{children}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

