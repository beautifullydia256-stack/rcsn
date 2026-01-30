import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const GlassInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex w-full rounded-lg border border-border bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
GlassInput.displayName = 'GlassInput';
