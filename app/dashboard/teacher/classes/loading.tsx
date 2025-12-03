'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/10 rounded" />
        <div className="h-10 w-32 bg-white/10 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="h-6 w-32 bg-white/10 rounded mb-3" />
            <div className="h-4 w-24 bg-white/10 rounded mb-2" />
            <div className="h-4 w-20 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}


