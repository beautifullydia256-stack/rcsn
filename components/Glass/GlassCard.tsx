import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className,
  title,
  subtitle,
  hover = true,
  onClick,
}: GlassCardProps) {
  return (
    <GlassPanel
      variant="normal"
      rounded="lg"
      hover={hover}
      onClick={onClick}
      className={cn('p-6', className)}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </GlassPanel>
  );
}




