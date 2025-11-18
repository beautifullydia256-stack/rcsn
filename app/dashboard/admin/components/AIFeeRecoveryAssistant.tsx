'use client';

import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from './GlassButton';
import { DollarSign, MessageSquare, TrendingDown } from 'lucide-react';

export default function AIFeeRecoveryAssistant() {
  // Mock data - in production, this would come from an API
  const atRiskStudents = [
    { name: 'John Doe', class: 'Primary 5', balance: 450000, probability: 85, daysOverdue: 45 },
    { name: 'Jane Smith', class: 'Primary 3', balance: 320000, probability: 78, daysOverdue: 32 },
    { name: 'Mike Johnson', class: 'Primary 7', balance: 280000, probability: 72, daysOverdue: 28 },
  ];

  const getProbabilityColor = (prob: number) => {
    if (prob >= 80) return '#ef4444';
    if (prob >= 60) return '#f59e0b';
    return '#4dabff';
  };

  return (
    <GlassCard className="p-6 mb-6 relative overflow-hidden" hover>
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
        style={{ background: '#f59e0b' }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
            <DollarSign className="w-6 h-6" style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Fee Recovery Assistant</h2>
            <p className="text-sm text-white/85">Students likely to pay late</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {atRiskStudents.map((student, index) => {
            const probColor = getProbabilityColor(student.probability);
            return (
              <motion.div
                key={student.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl"
                style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="w-4 h-4" style={{ color: probColor }} />
                      <span className="font-medium text-white">{student.name}</span>
                      <span className="text-xs text-white/60">• {student.class}</span>
                    </div>
                    <div className="text-sm text-white/85 mb-2">
                      Balance: <span className="font-semibold text-yellow-400">
                        {new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(student.balance)}
                      </span>
                    </div>
                    <div className="text-xs text-white/70">
                      {student.daysOverdue} days overdue
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/70 mb-1">Probability</div>
                    <div 
                      className="text-lg font-bold"
                      style={{ color: probColor }}
                    >
                      {student.probability}%
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <GlassButton
            variant="primary"
            className="flex-1 flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Generate SMS Templates
          </GlassButton>
          <GlassButton
            variant="primary"
            className="flex-1 flex items-center justify-center gap-2"
          >
            View All At Risk
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
}

