'use client';

import { Clock } from 'lucide-react';

type ActivityItem = {
  id: string;
  avatar: string;
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  gradient: string;
};

export default function ActivityFeedCard() {
  // UI-only placeholder feed. Hook it up to real backend data later.
  const items: ActivityItem[] = [
    {
      id: 'a1',
      avatar: 'LJ',
      title: 'Lutaya Jofrey',
      subtitle: 'paid USh 175,000 in school fees.',
      time: 'Today at 10:12 AM · Cash',
      icon: '💰',
      gradient: 'linear-gradient(135deg,#10d9a8,#3d8ef8)',
    },
    {
      id: 'a2',
      avatar: 'NS',
      title: 'You',
      subtitle: 'approved the lab repair expense (USh 320,000).',
      time: 'Today at 9:44 AM',
      icon: '✅',
      gradient: 'linear-gradient(135deg,#9d7bf8,#ec4899)',
    },
    {
      id: 'a3',
      avatar: 'SY',
      title: 'System',
      subtitle: 'auto-processed 3 mobile money payments.',
      time: 'Today at 8:30 AM · Automated',
      icon: '🤖',
      gradient: 'linear-gradient(135deg,#f5a623,#ef4444)',
    },
    {
      id: 'a4',
      avatar: 'MK',
      title: 'Mustafa Kafeero',
      subtitle: 'submitted attendance for S.1 English.',
      time: 'Yesterday at 4:05 PM',
      icon: '📋',
      gradient: 'linear-gradient(135deg,#22d3ee,#9d7bf8)',
    },
  ];

  return (
    <div className="bg-[#101828] rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <Clock className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <div className="text-xs text-white/50">Placeholder feed · connect later</div>
          </div>
        </div>
        <div className="text-xs text-white/50">Last 4 items</div>
      </div>

      <div className="space-y-3">
        {items.map((it) => (
          <div
            key={it.id}
            className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: it.gradient }}
            >
              {it.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/80 leading-snug">
                <span className="text-white font-semibold">{it.title}</span> {it.subtitle}
              </div>
              <div className="text-xs text-white/50 mt-1">{it.time}</div>
            </div>
            <div className="text-lg leading-none flex-shrink-0">{it.icon}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

