'use client';

import { Clock, Coins, CheckCircle2, Bot, ClipboardList } from 'lucide-react';

type ActivityItem = {
  id: string;
  avatar: string;
  title: string;
  subtitle: string;
  time: string;
  icon: React.ReactNode;
  gradient: string;
};

export default function ActivityFeedCard() {
  // UI-only placeholder feed (no backend activity endpoint wired yet).
  const items: ActivityItem[] = [
    {
      id: 'af1',
      avatar: '•',
      title: 'Fee payment',
      subtitle: 'recorded for a linked student account.',
      time: 'Today at 10:12 AM · Cash',
      icon: <Coins className="w-4 h-4 text-amber-400" />,
      gradient: 'linear-gradient(135deg,#10d9a8,#3d8ef8)',
    },
    {
      id: 'af2',
      avatar: 'NS',
      title: 'You',
      subtitle: 'approved the lab repair expense (USh 320,000).',
      time: 'Today at 9:44 AM',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      gradient: 'linear-gradient(135deg,#9d7bf8,#ec4899)',
    },
    {
      id: 'af3',
      avatar: 'SY',
      title: 'System',
      subtitle: 'auto-processed 3 mobile money payments.',
      time: 'Today at 8:30 AM · Automated',
      icon: <Bot className="w-4 h-4 text-cyan-400" />,
      gradient: 'linear-gradient(135deg,#f5a623,#ef4444)',
    },
    {
      id: 'af4',
      avatar: '•',
      title: 'Attendance',
      subtitle: 'marked for a class (example item).',
      time: 'Yesterday at 4:05 PM',
      icon: <ClipboardList className="w-4 h-4 text-blue-400" />,
      gradient: 'linear-gradient(135deg,#22d3ee,#9d7bf8)',
    },
  ];

  return (
    <div className="ac-glass-card p-6 mb-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">
            <Clock className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h3 className="text-lg font-semibold ac-text-primary">Recent Activity</h3>
            <div className="text-xs ac-text-muted">Placeholder feed · connect later</div>
          </div>
        </div>
        <div className="text-xs ac-text-muted">Last 4 items</div>
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
              <div className="text-sm ac-text-primary leading-snug">
                <span className="font-semibold text-white">{it.title}</span> {it.subtitle}
              </div>
              <div className="text-xs ac-text-muted mt-1">{it.time}</div>
            </div>
            <div className="text-lg leading-none flex-shrink-0">{it.icon}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

