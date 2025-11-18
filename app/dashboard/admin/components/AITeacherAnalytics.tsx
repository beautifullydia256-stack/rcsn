'use client';

import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import { GraduationCap, TrendingUp, Award } from 'lucide-react';

export default function AITeacherAnalytics() {
  // Mock data - in production, this would come from an API
  const topTeachers = [
    { name: 'Ms. Sarah Johnson', performance: 95, attendance: 98, subject: 'Mathematics' },
    { name: 'Mr. David Kim', performance: 92, attendance: 96, subject: 'Science' },
    { name: 'Ms. Emily Chen', performance: 90, attendance: 94, subject: 'English' },
    { name: 'Mr. Michael Brown', performance: 88, attendance: 97, subject: 'History' },
    { name: 'Ms. Lisa Anderson', performance: 87, attendance: 95, subject: 'Arts' },
  ];

  return (
    <GlassCard className="p-6 mb-6 relative overflow-hidden" hover>
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
        style={{ background: '#10b981' }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
            <GraduationCap className="w-6 h-6" style={{ color: '#10b981' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Teacher Analytics</h2>
            <p className="text-sm text-white/85">Top performing teachers</p>
          </div>
        </div>

        <div className="space-y-3">
          {topTeachers.map((teacher, index) => (
            <motion.div
              key={teacher.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-xl flex items-center justify-between"
              style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-semibold">
                  {teacher.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{teacher.name}</div>
                  <div className="text-xs text-white/70">{teacher.subject}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-white/70 mb-1">Performance</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" style={{ color: '#10b981' }} />
                    {teacher.performance}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/70 mb-1">Attendance</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1">
                    <Award className="w-3 h-3" style={{ color: '#4dabff' }} />
                    {teacher.attendance}%
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

