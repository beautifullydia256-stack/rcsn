'use client';

import React from 'react';
import { TrendingUp, Users, BookOpen, Award } from 'lucide-react';
import TrendCard from './TrendCard';
import GlassCard from '@/components/ui/GlassCard';

interface PerformanceMetricsProps {
  performanceData?: Array<{ name: string; average: number; attendance: number }>;
  attendanceData?: Array<{ week: string; attendance: number }>;
}

export default function PerformanceMetrics({ 
  performanceData = [],
  attendanceData = []
}: PerformanceMetricsProps) {
  // Calculate metrics from data
  const currentAverage = performanceData.length > 0 
    ? performanceData[performanceData.length - 1]?.average || 0 
    : 82;
  const previousAverage = performanceData.length > 1 
    ? performanceData[performanceData.length - 2]?.average || 0 
    : 80;
  const avgChange = previousAverage > 0 ? ((currentAverage - previousAverage) / previousAverage) * 100 : 0;

  const currentAttendance = attendanceData.length > 0
    ? attendanceData[attendanceData.length - 1]?.attendance || 0
    : 93;
  const previousAttendance = attendanceData.length > 1
    ? attendanceData[attendanceData.length - 2]?.attendance || 0
    : 90;
  const attendanceChange = previousAttendance > 0 ? ((currentAttendance - previousAttendance) / previousAttendance) * 100 : 0;

  // Generate sparkline data from performance history
  const performanceSparkline = performanceData.length > 0
    ? performanceData.map(d => d.average)
    : [72, 75, 78, 80, 82];

  const attendanceSparkline = attendanceData.length > 0
    ? attendanceData.map(d => d.attendance)
    : [85, 88, 90, 92, 93];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <TrendCard
        title="Class Average Score"
        value={`${currentAverage.toFixed(1)}%`}
        change={avgChange}
        changeLabel="vs Last Week"
        trend={avgChange >= 0 ? 'up' : 'down'}
        icon={<Award className="w-5 h-5" />}
        gradient="linear-gradient(135deg, #4dabff 0%, #6366f1 100%)"
        sparkline={performanceSparkline}
      />
      
      <TrendCard
        title="Attendance Rate"
        value={`${currentAttendance.toFixed(1)}%`}
        change={attendanceChange}
        changeLabel="vs Last Week"
        trend={attendanceChange >= 0 ? 'up' : 'down'}
        icon={<Users className="w-5 h-5" />}
        gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
        sparkline={attendanceSparkline}
      />

      <TrendCard
        title="Active Students"
        value="32"
        change={5.2}
        changeLabel="This Week"
        trend="up"
        icon={<Users className="w-5 h-5" />}
        gradient="linear-gradient(135deg, #ae79ff 0%, #9333ea 100%)"
        sparkline={[28, 29, 30, 31, 32]}
      />

      <TrendCard
        title="Subjects Taught"
        value="4"
        change={0}
        changeLabel="This Term"
        trend="neutral"
        icon={<BookOpen className="w-5 h-5" />}
        gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      />
    </div>
  );
}

