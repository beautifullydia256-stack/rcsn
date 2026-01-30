/**
 * Skeleton for admin content area while lazy page loads.
 * Matches dashboard layout (header, KPI row, quick actions, content blocks).
 */
function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-white/10 ${className}`}
      style={{ border: '1px solid rgba(255, 255, 255, 0.12)' }}
    />
  );
}

export default function AdminContentSkeleton() {
  return (
    <>
      <div className="mb-6">
        <SkeletonBlock className="mb-2 h-8 w-64" />
        <SkeletonBlock className="h-4 w-80" />
      </div>

      {/* KPI row: 3 + 2 layout */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-24" />
        ))}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <SkeletonBlock key={i} className="h-24" />
        ))}
      </div>

      {/* Quick actions grid */}
      <div className="mb-6">
        <SkeletonBlock className="mb-4 h-5 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-14" />
          ))}
        </div>
      </div>

      {/* Content blocks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <SkeletonBlock className="h-48" />
        <SkeletonBlock className="h-48" />
      </div>
      <div className="mb-6">
        <SkeletonBlock className="h-40 w-full" />
      </div>
    </>
  );
}
