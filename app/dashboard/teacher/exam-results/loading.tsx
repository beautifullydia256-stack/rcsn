'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-white/10 rounded mb-2" />
          <div className="h-4 w-56 bg-white/10 rounded" />
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="h-10 w-40 bg-white/10 rounded" />
        <div className="h-10 w-40 bg-white/10 rounded" />
        <div className="h-10 w-40 bg-white/10 rounded" />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 w-20 bg-white/10 rounded" />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="p-4 border-b border-white/5 flex gap-4">
            {[...Array(6)].map((_, j) => (
              <div key={j} className="h-4 w-20 bg-white/5 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}


