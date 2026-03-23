/**
 * Lightweight skeleton placeholders for first-load only (admin speed system).
 */
export function SkeletonKPIStrip({ count }: { count: number }) {
  return (
    <div className="flex flex-wrap gap-3 mb-6" style={{ minHeight: 72 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-1 min-w-[120px] rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse"
        >
          <div className="h-3 w-20 bg-white/10 rounded mb-2" />
          <div className="h-8 w-24 bg-white/15 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
      <div className="p-3 border-b border-white/10 flex gap-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 flex-1 bg-white/10 rounded" />
        ))}
      </div>
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3 flex gap-2 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 flex-1 bg-white/10 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
