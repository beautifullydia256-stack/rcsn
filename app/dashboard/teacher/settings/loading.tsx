'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-white/10 rounded" />
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <div className="h-4 w-24 bg-white/10 rounded mb-2" />
              <div className="h-10 w-full bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

