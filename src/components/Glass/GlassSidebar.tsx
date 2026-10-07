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
        'fixed left-0 top-0 h-full w-64 z-40 bg-white/75 dark:bg-[#070B09] backdrop-blur-2xl backdrop-saturate-[180%] rounded-r-2xl p-4',
        'border-r border-white/40 dark:border-white/10 shadow-[10px_0_35px_-5px_rgba(0,0,0,0.38),inset_-1px_0_1.5px_rgba(255,255,255,0.2)]',
        className
      )}
    >
      {children}
    </motion.aside>
  );
}




