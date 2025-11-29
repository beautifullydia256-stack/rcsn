'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/10 rounded" />
        <div className="h-10 w-32 bg-white/10 rounded" />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex gap-4 mb-4">
          <div className="h-10 flex-1 bg-white/10 rounded" />
          <div className="h-10 w-32 bg-white/10 rounded" />
        </div>
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-white/10 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-white/10 rounded mb-1" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
              <div className="h-6 w-16 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

