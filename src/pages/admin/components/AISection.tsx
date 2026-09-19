import GlassCard from '@/components/ui/GlassCard';
import { Sparkles, TrendingUp, Zap, Users, DollarSign, Bot } from 'lucide-react';

export default function AISection() {
  const cards = [
    { title: 'AI Insights', desc: 'Smart analytics and recommendations', icon: Sparkles, color: '#8b5cf6' },
    { title: 'AI Forecasting', desc: 'Predict trends and enrollment', icon: TrendingUp, color: '#06b6d4' },
    { title: 'AI Quick Actions', desc: 'One-click automation', icon: Zap, color: '#f59e0b' },
    { title: 'AI Teacher Analytics', desc: 'Performance and engagement', icon: Users, color: '#ec4899' },
    { title: 'AI Fee Recovery Assistant', desc: 'Outstanding balance insights', icon: DollarSign, color: '#10b981' },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Bot className="w-6 h-6 text-purple-400 shrink-0" />
        AI-Powered Features
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {cards.slice(0, 2).map((c) => {
          const Icon = c.icon;
          return (
            <GlassCard key={c.title} className="p-6 relative overflow-hidden" hover>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: c.color }} />
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl" style={{ background: `${c.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                <h3 className="text-lg font-semibold text-white">{c.title}</h3>
              </div>
              <p className="text-sm text-white/70">{c.desc}</p>
            </GlassCard>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {cards.slice(2, 4).map((c) => {
          const Icon = c.icon;
          return (
            <GlassCard key={c.title} className="p-6 relative overflow-hidden" hover>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: c.color }} />
              <div className="relative z-10 flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl" style={{ background: `${c.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                <h3 className="text-lg font-semibold text-white">{c.title}</h3>
              </div>
              <p className="text-sm text-white/70">{c.desc}</p>
            </GlassCard>
          );
        })}
      </div>
      <GlassCard className="p-6 relative overflow-hidden mb-6" hover>
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: cards[4].color }} />
        <div className="relative z-10 flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl" style={{ background: `${cards[4].color}20` }}>
            <DollarSign className="w-5 h-5" style={{ color: cards[4].color }} />
          </div>
          <h3 className="text-lg font-semibold text-white">{cards[4].title}</h3>
        </div>
        <p className="text-sm text-white/70">{cards[4].desc}</p>
      </GlassCard>
    </div>
  );
}
