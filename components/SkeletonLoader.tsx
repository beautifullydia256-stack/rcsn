'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  lines 
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700 rounded animate-pulse';

  if (variant === 'text' && lines) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
            }}
            className={`${baseClasses} mb-2 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
            style={{ height: height || '1rem' }}
          />
        ))}
      </div>
    );
  }

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className={`${baseClasses} ${variant === 'circular' ? 'rounded-full' : ''} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton components
export function CardSkeleton() {
  return (
    <div className="relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg">
        <Skeleton variant="text" lines={3} height="1rem" />
        <div className="mt-4 flex gap-2">
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton variant="text" width="60%" height="0.875rem" className="mb-2" />
            <Skeleton variant="text" width="40%" height="2rem" />
          </div>
          <Skeleton variant="circular" width={48} height={48} />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1">
                <Skeleton variant="text" width="40%" height="1rem" className="mb-2" />
                <Skeleton variant="text" width="60%" height="0.75rem" />
              </div>
              <Skeleton variant="rectangular" width={80} height={32} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

