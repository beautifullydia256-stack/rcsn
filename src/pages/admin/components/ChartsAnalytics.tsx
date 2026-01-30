import GlassCard from '@/components/ui/GlassCard';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

export default function ChartsAnalytics() {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" style={{ color: '#4dabff' }} />
        Charts & Analytics
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="p-6 relative overflow-hidden" hover>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: '#4dabff' }} />
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(77, 171, 255, 0.2)' }}>
              <Users className="w-5 h-5" style={{ color: '#4dabff' }} />
            </div>
            <h3 className="text-sm font-medium text-white/90">Term Enrollment</h3>
          </div>
          <div className="h-32 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-white/60">Charts load from dashboard data</p>
          </div>
        </GlassCard>
        <GlassCard className="p-6 relative overflow-hidden" hover>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: '#10b981' }} />
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#10b981' }} />
            </div>
            <h3 className="text-sm font-medium text-white/90">Attendance Trend</h3>
          </div>
          <div className="h-32 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-white/60">Last 7 days</p>
          </div>
        </GlassCard>
        <GlassCard className="p-6 relative overflow-hidden" hover>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: '#ae79ff' }} />
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(174, 121, 255, 0.2)' }}>
              <DollarSign className="w-5 h-5" style={{ color: '#ae79ff' }} />
            </div>
            <h3 className="text-sm font-medium text-white/90">Fee Collection</h3>
          </div>
          <div className="h-32 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-white/60">By week</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
