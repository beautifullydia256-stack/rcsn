import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { cn } from '../../utils/cn';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full',
};

export function GlassModal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  className,
}: GlassModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 glass-strong"
            style={{ backdropFilter: 'blur(40px)' }}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn('w-full', sizeClasses[size], className)}
              onClick={(e) => e.stopPropagation()}
            >
              <GlassPanel variant="strong" rounded="xl" className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  {title ? (
                    <h2 className="text-2xl font-semibold text-foreground">
                      {title}
                    </h2>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="glass-subtle glass-rounded p-2 hover:glass-hover transition-all"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Content */}
                {children}
              </GlassPanel>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}




