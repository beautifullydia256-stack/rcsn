import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GlassButton({
  children,
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: GlassButtonProps) {
  const base = 'rounded-lg border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';
  const variants = {
    primary: 'border-primary bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'border-border bg-card/50 text-foreground hover:bg-muted/50',
    ghost: 'border-transparent bg-transparent text-foreground hover:bg-muted/30',
    destructive: 'border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20',
  };
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };
  return (
    <button
      type="button"
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
