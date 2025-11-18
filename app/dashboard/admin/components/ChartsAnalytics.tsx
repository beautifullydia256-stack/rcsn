'use client';

import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

export default function ChartsAnalytics() {
  // Mock chart data - in production, use Recharts or similar
  const performanceData = [85, 82, 88, 90, 87, 92, 89];
  const attendanceData = [92, 88, 90, 94, 91, 93, 95];
  const feeData = [2.5, 2.8, 2.3, 3.1, 2.9, 3.2, 3.0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Student Performance Trends */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#4dabff' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: '#4dabff' }} />
            <h3 className="text-lg font-semibold text-white">Performance Trends</h3>
          </div>
          <div className="h-32 flex items-end gap-2">
            {performanceData.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t transition-all hover:opacity-80"
                style={{
                  background: 'linear-gradient(to top, #4dabff, #00d4ff)',
                  height: `${(value / 100) * 100}%`,
                  minHeight: '20px'
                }}
                title={`Week ${index + 1}: ${value}%`}
              />
            ))}
          </div>
          <div className="text-xs text-white/70 mt-2 text-center">Last 7 weeks</div>
        </div>
      </GlassCard>

      {/* Attendance Patterns */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#10b981' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5" style={{ color: '#10b981' }} />
            <h3 className="text-lg font-semibold text-white">Attendance Patterns</h3>
          </div>
          <div className="h-32 flex items-end gap-2">
            {attendanceData.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t transition-all hover:opacity-80"
                style={{
                  background: 'linear-gradient(to top, #10b981, #00d4ff)',
                  height: `${(value / 100) * 100}%`,
                  minHeight: '20px'
                }}
                title={`Week ${index + 1}: ${value}%`}
              />
            ))}
          </div>
          <div className="text-xs text-white/70 mt-2 text-center">Last 7 weeks</div>
        </div>
      </GlassCard>

      {/* Fee Collections vs Outstanding */}
      <GlassCard className="p-6 relative overflow-hidden" hover>
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
          style={{ background: '#f59e0b' }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5" style={{ color: '#f59e0b' }} />
            <h3 className="text-lg font-semibold text-white">Fee Collections</h3>
          </div>
          <div className="h-32 flex items-end gap-2">
            {feeData.map((value, index) => (
              <div
                key={index}
                className="flex-1 rounded-t transition-all hover:opacity-80"
                style={{
                  background: 'linear-gradient(to top, #f59e0b, #ff6bcb)',
                  height: `${(value / 4) * 100}%`,
                  minHeight: '20px'
                }}
                title={`Week ${index + 1}: ${value}M UGX`}
              />
            ))}
          </div>
          <div className="text-xs text-white/70 mt-2 text-center">Last 7 weeks (M UGX)</div>
        </div>
      </GlassCard>
    </div>
  );
}

