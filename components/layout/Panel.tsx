import { ReactNode } from 'react';
import { GlassPanel } from '../Glass/GlassPanel';
import { cn } from '../../utils/cn';

interface PanelProps {
  children: ReactNode;
  title?: string;
  className?: string;
  resizable?: boolean;
}

export default function Panel({
  children,
  title,
  className,
  resizable = false,
}: PanelProps) {
  return (
    <GlassPanel
      variant="normal"
      rounded="lg"
      className={cn('p-6', resizable && 'resize', className)}
    >
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-foreground">{title}</h3>
      )}
      {children}
    </GlassPanel>
  );
}




