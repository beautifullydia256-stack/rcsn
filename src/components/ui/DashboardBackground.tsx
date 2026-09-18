'use client';

import { publicAssetUrl } from '@/lib/publicAssetUrl';

export default function DashboardBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      {/* Base dark gradient matching owner dashboard */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black" />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${publicAssetUrl('/noise.png')})` }} />

      {/* Additional gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
    </div>
  );
}

