'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/10 rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-white/10 rounded" />
          <div className="h-10 w-28 bg-white/10 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="h-4 w-24 bg-white/10 rounded mb-2" />
            <div className="h-7 w-32 bg-white/10 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="h-64 bg-white/5 rounded" />
      </div>
    </div>
  );
}


