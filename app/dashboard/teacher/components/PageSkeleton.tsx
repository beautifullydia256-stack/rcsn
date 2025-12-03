'use client';

import { motion } from 'framer-motion';

// Shimmer animation for skeleton loading
const shimmer = `relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent`;

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 ${shimmer} ${className}`}>
      <div className="h-4 w-24 bg-white/10 rounded mb-4" />
      <div className="h-8 w-32 bg-white/10 rounded mb-2" />
      <div className="h-3 w-20 bg-white/10 rounded" />
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {[...Array(6)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="mb-6">
      <div className={`h-5 w-32 bg-white/10 rounded mb-4 ${shimmer}`} />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`rounded-xl border border-white/10 bg-white/5 p-4 ${shimmer}`}>
            <div className="w-10 h-10 bg-white/10 rounded-lg mx-auto mb-2" />
            <div className="h-3 w-16 bg-white/10 rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden ${shimmer}`}>
      <div className="p-4 border-b border-white/10">
        <div className="h-5 w-40 bg-white/10 rounded" />
      </div>
      <div className="divide-y divide-white/5">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-white/10 rounded" />
              <div className="h-3 w-24 bg-white/10 rounded" />
            </div>
            <div className="h-6 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 ${shimmer}`}>
      <div className="h-5 w-32 bg-white/10 rounded mb-6" />
      <div className="h-48 flex items-end justify-between gap-2">
        {[...Array(7)].map((_, i) => (
          <div 
            key={i} 
            className="flex-1 bg-white/10 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 ${shimmer}`}>
      <div className="space-y-4">
        <div className="h-5 w-3/4 bg-white/10 rounded" />
        <div className="h-4 w-full bg-white/10 rounded" />
        <div className="h-4 w-5/6 bg-white/10 rounded" />
        <div className="h-4 w-4/5 bg-white/10 rounded" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <QuickActionsSkeleton />
      <StatsGridSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <ContentSkeleton />
          <ChartSkeleton />
        </div>
        <div className="space-y-6">
          <CardSkeleton className="h-48" />
          <CardSkeleton className="h-32" />
        </div>
      </div>
    </motion.div>
  );
}

export function FormSkeleton() {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 ${shimmer}`}>
      <div className="h-6 w-48 bg-white/10 rounded mb-6" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-white/10 rounded mb-2" />
            <div className="h-10 w-full bg-white/10 rounded" />
          </div>
        ))}
        <div className="h-12 w-full bg-white/10 rounded mt-6" />
      </div>
    </div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ 
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1]
      }}
    >
      {children}
    </motion.div>
  );
}

// Full page loading skeleton that matches dashboard structure
export default function PageSkeleton() {
  return <DashboardSkeleton />;
}


