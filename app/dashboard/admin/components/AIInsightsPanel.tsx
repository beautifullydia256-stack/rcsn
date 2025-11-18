'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from './GlassButton';
import { Sparkles, TrendingDown, AlertCircle, DollarSign, Users } from 'lucide-react';

export default function AIInsightsPanel() {
  const [loading, setLoading] = useState(false);

  // Mock AI insights - in production, these would come from an API
  const insights = [
    { type: 'performance', message: 'Performance drop detected in Primary 3 Mathematics', severity: 'high', icon: TrendingDown },
    { type: 'attendance', message: 'Attendance risk: 5 students with <70% attendance', severity: 'medium', icon: AlertCircle },
    { type: 'finance', message: 'Fee recovery suggestion: Contact 12 parents with outstanding balances', severity: 'medium', icon: DollarSign },
    { type: 'capacity', message: 'Class congestion alert: Primary 2 has 48 students (recommended: 35)', severity: 'low', icon: Users },
  ];

  const handleGenerateInsights = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <GlassCard className="p-6 mb-6 relative overflow-hidden" hover>
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
        style={{ background: '#ae79ff' }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(174, 121, 255, 0.2)' }}>
              <Sparkles className="w-6 h-6" style={{ color: '#ae79ff' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Detected Trends</h2>
              <p className="text-sm text-white/85">Real-time insights and alerts</p>
            </div>
          </div>
          <GlassButton
            variant="primary"
            onClick={handleGenerateInsights}
            disabled={loading}
            className="text-sm"
          >
            {loading ? 'Analyzing...' : 'Refresh'}
          </GlassButton>
        </div>

        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            const severityColors = {
              high: { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444' },
              medium: { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', text: '#f59e0b' },
              low: { bg: 'rgba(77, 171, 255, 0.2)', border: 'rgba(77, 171, 255, 0.4)', text: '#4dabff' },
            };
            const colors = severityColors[insight.severity as keyof typeof severityColors];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl flex items-start gap-3"
                style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
              >
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.text }} />
                <div className="flex-1">
                  <p className="text-sm text-white/90">{insight.message}</p>
                  <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.text }}>
                    {insight.severity.toUpperCase()}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

