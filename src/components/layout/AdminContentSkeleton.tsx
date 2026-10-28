import React from 'react';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';

/**
 * Standard loader for lazy pages and content areas.
 * Displays the signature rolling box instead of pulsing skeleton bars.
 */
export default function AdminContentSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] py-16 w-full">
      <GovRollingBox size="lg" tone="dark" />
    </div>
  );
}
