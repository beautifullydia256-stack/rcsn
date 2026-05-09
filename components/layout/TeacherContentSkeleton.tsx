/**
 * Skeleton for teacher content area while lazy page loads.
 */
export default function TeacherContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-24 rounded-lg bg-muted" />
      </div>
      <div className="h-48 rounded-lg bg-muted" />
    </div>
  );
}
