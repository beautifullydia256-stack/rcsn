import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'subtle' | 'normal' | 'strong';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  onClick?: () => void;
}

export function GlassPanel({
  children,
  className,
  variant = 'normal',
  rounded = 'lg',
  hover = false,
  onClick,
}: GlassPanelProps) {
  const variantClasses = {
    subtle: 'glass-subtle',
    normal: 'glass',
    strong: 'glass-strong',
  };

  const roundedClasses: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', string> = {
    none: '',
    sm: 'glass-rounded',
    md: 'glass-rounded',
    lg: 'glass-rounded-lg',
    xl: 'glass-rounded-xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'relative',
        variantClasses[variant],
        roundedClasses[rounded],
        hover && 'glass-hover cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}




