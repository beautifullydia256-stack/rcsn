import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface WorkAreaProps {
  children: ReactNode;
  className?: string;
}

export default function WorkArea({ children, className }: WorkAreaProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto p-6',
        'bg-gradient-to-br from-gray-50/50 via-white/50 to-gray-100/50',
        'dark:from-gray-900/50 dark:via-gray-800/50 dark:to-gray-900/50',
        className
      )}
    >
      {children}
    </div>
  );
}




