'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-white/10 rounded" />
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-48 bg-white/10 rounded mb-2" />
              <div className="h-3 w-full bg-white/10 rounded mb-1" />
              <div className="h-3 w-3/4 bg-white/10 rounded" />
            </div>
            <div className="h-3 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

