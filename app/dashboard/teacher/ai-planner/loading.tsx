'use client';

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-purple-500/20 rounded" />
        <div>
          <div className="h-7 w-64 bg-white/10 rounded mb-2" />
          <div className="h-4 w-48 bg-white/10 rounded" />
        </div>
      </div>
      <div className="flex gap-4 mb-6">
        <div className="h-12 w-32 bg-purple-600/30 rounded-lg" />
        <div className="h-12 w-32 bg-white/10 rounded-lg" />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="h-6 w-48 bg-white/10 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="h-10 bg-white/10 rounded" />
          <div className="h-10 bg-white/10 rounded" />
        </div>
        <div className="h-10 bg-white/10 rounded mb-4" />
        <div className="h-24 bg-white/10 rounded mb-4" />
        <div className="h-12 bg-purple-600/30 rounded" />
      </div>
    </div>
  );
}

