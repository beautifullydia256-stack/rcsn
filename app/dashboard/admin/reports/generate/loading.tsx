'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-64 bg-white/10 rounded mb-2" />
          <div className="h-4 w-48 bg-white/10 rounded" />
        </div>
        <div className="h-10 w-32 bg-white/10 rounded" />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="h-4 w-20 bg-white/10 rounded mb-2" />
              <div className="h-10 w-full bg-white/10 rounded" />
            </div>
          ))}
        </div>
        <div className="h-12 w-full bg-purple-600/30 rounded-lg" />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="h-5 w-32 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-white/10 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-white/10 rounded mb-1" />
                <div className="h-3 w-24 bg-white/10 rounded" />
              </div>
              <div className="h-8 w-20 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

