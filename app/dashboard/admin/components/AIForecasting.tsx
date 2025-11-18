'use client';

import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { TrendingUp, Users, DollarSign, Award } from 'lucide-react';

export default function AIForecasting() {
  const forecasts = [
    { label: 'Predicted Enrollment', value: '+15 students', icon: Users, color: '#4dabff', trend: 'up' },
    { label: 'Predicted Expenses', value: 'UGX 2.5M', icon: DollarSign, color: '#f59e0b', trend: 'up' },
    { label: 'Predicted Performance', value: '85% average', icon: Award, color: '#10b981', trend: 'stable' },
  ];

  return (
    <GlassCard className="p-6 mb-6 relative overflow-hidden" hover>
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
        style={{ background: '#00d4ff' }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(0, 212, 255, 0.2)' }}>
            <TrendingUp className="w-6 h-6" style={{ color: '#00d4ff' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Forecasting</h2>
            <p className="text-sm text-white/85">Predictions for next term</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forecasts.map((forecast, index) => {
            const Icon = forecast.icon;
            return (
              <motion.div
                key={forecast.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl"
                style={{ background: `${forecast.color}20`, border: `1px solid ${forecast.color}40` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: forecast.color }} />
                  <span className="text-xs text-white/85">{forecast.label}</span>
                </div>
                <div className="text-xl font-bold text-white">{forecast.value}</div>
                <div className="text-xs text-white/70 mt-1">
                  {forecast.trend === 'up' && '↑ Increasing'}
                  {forecast.trend === 'down' && '↓ Decreasing'}
                  {forecast.trend === 'stable' && '→ Stable'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

