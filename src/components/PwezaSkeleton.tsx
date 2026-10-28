import React from 'react';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';

/**
 * Standard KPI and Table loaders using the rolling box instead of skeletons.
 */
export function SkeletonKPIStrip({ count }: { count?: number }) {
  return (
    <div className="flex items-center justify-center py-6 w-full">
      <GovRollingBox size="md" tone="dark" />
    </div>
  );
}

export function SkeletonTable({ rows, cols }: { rows?: number; cols?: number }) {
  return (
    <div className="flex items-center justify-center py-16 w-full">
      <GovRollingBox size="lg" tone="dark" />
    </div>
  );
}
