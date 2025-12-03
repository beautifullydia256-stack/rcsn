'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-white/10 rounded" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-16 bg-white/10 rounded" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-6 gap-2">
          <div className="h-8 bg-white/10 rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-white/10 rounded" />
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-2">
              <div className="h-16 bg-white/10 rounded" />
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-16 bg-white/5 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


