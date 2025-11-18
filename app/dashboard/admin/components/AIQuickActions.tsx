'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from './GlassButton';
import { Sparkles, FileText, BarChart3, Mail, AlertTriangle } from 'lucide-react';

export default function AIQuickActions() {
  const [processing, setProcessing] = useState<string | null>(null);

  const actions = [
    { icon: FileText, label: 'Generate Term Report Summary', color: '#4dabff', action: 'term-report' },
    { icon: BarChart3, label: 'Auto-Analyze Attendance', color: '#10b981', action: 'analyze-attendance' },
    { icon: Mail, label: 'Generate School Newsletter', color: '#ae79ff', action: 'newsletter' },
    { icon: AlertTriangle, label: 'Detect Students At Risk', color: '#ef4444', action: 'at-risk' },
  ];

  const handleAction = async (action: string) => {
    setProcessing(action);
    // Simulate API call
    setTimeout(() => {
      setProcessing(null);
      alert(`AI ${action} completed!`);
    }, 2000);
  };

  return (
    <GlassCard className="p-6 mb-6 relative overflow-hidden" hover>
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
        style={{ background: '#ff6bcb' }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255, 107, 203, 0.2)' }}>
            <Sparkles className="w-6 h-6" style={{ color: '#ff6bcb' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Quick Actions</h2>
            <p className="text-sm text-white/85">Automated tasks powered by AI</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.action}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAction(action.action)}
                disabled={processing === action.action}
                className="flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                style={{
                  background: `${action.color}20`,
                  border: `1px solid ${action.color}40`,
                  opacity: processing === action.action ? 0.6 : 1
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: action.color }} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{action.label}</div>
                  {processing === action.action && (
                    <div className="text-xs text-white/70 mt-1">Processing...</div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

