'use client';

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-white/10 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="h-10 w-full bg-white/10 rounded mb-4" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-white/10 rounded mb-1" />
                  <div className="h-3 w-32 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="h-full flex items-center justify-center">
            <div className="h-20 w-48 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

