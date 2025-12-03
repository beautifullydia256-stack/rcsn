import { DashboardSkeleton } from './components/PageSkeleton';

// This shows INSTANTLY while the page loads - no server rendering delay
export default function Loading() {
  return <DashboardSkeleton />;
}


