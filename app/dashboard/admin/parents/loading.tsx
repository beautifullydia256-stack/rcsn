'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-white/10 rounded mb-2" />
          <div className="h-4 w-64 bg-white/10 rounded" />
        </div>
        <div className="h-10 w-32 bg-purple-600/30 rounded" />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg" />
          <div>
            <div className="h-4 w-24 bg-white/10 rounded mb-1" />
            <div className="h-6 w-12 bg-white/10 rounded" />
          </div>
        </div>
      </div>
      <div className="h-10 w-full bg-white/10 rounded" />
      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-full" />
            <div className="flex-1">
              <div className="h-4 w-40 bg-white/10 rounded mb-2" />
              <div className="h-3 w-56 bg-white/10 rounded mb-2" />
              <div className="h-3 w-32 bg-white/10 rounded" />
            </div>
            <div className="w-8 h-8 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}


