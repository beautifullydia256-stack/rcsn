import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface GlassSidebarProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  className?: string;
}

export function GlassSidebar({
  children,
  isOpen,
  className,
}: GlassSidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{
        x: isOpen ? 0 : -280,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className={cn(
        'fixed left-0 top-0 h-full w-64 z-40 glass-strong glass-rounded-r-xl p-4',
        'border-r border-white/20',
        className
      )}
    >
      {children}
    </motion.aside>
  );
}




