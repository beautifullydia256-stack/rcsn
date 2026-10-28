import React from 'react';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';

/**
 * Standard loader for faculty/teacher content area while lazy page loads.
 * Displays the signature rolling box instead of pulsing skeleton boxes.
 */
export default function TeacherContentSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] py-16 w-full">
      <GovRollingBox size="lg" tone="dark" />
    </div>
  );
}
