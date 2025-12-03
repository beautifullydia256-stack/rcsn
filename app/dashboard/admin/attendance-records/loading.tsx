'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-white/10 rounded" />
      <div className="flex gap-4">
        <div className="h-10 w-40 bg-white/10 rounded" />
        <div className="h-10 w-40 bg-white/10 rounded" />
        <div className="h-10 w-32 bg-purple-600/30 rounded" />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-8 gap-4 p-4 border-b border-white/10">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-4 bg-white/10 rounded" />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-4 p-4 border-b border-white/5">
            {[...Array(8)].map((_, j) => (
              <div key={j} className="h-4 bg-white/5 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}


