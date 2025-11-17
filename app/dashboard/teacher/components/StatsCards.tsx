'use client';

import { Users, GraduationCap, UserCheck, BookOpen, FileText, ClipboardList, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

interface StatCard {
  icon: any;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
  iconBg: string;
}

interface StatsCardsProps {
  totalClasses?: number;
  totalStudents?: number;
  studentsAttendedToday?: number;
  subjectsAssigned?: number;
  assignmentsDue?: number;
  examsPending?: number;
}

export default function StatsCards({
  totalClasses = 0,
  totalStudents = 0,
  studentsAttendedToday = 0,
  subjectsAssigned = 0,
  assignmentsDue = 0,
  examsPending = 0
}: StatsCardsProps) {
  const stats: StatCard[] = [
    {
      icon: GraduationCap,
      label: 'Total Classes Assigned',
      value: totalClasses,
      color: '#4dabff',
      bgColor: 'rgba(77, 171, 255, 0.15)',
      iconBg: 'rgba(77, 171, 255, 0.2)'
    },
    {
      icon: Users,
      label: 'Students in My Classes',
      value: totalStudents,
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      iconBg: 'rgba(16, 185, 129, 0.2)'
    },
    {
      icon: UserCheck,
      label: 'Students Attended Today',
      value: studentsAttendedToday,
      color: '#ae79ff',
      bgColor: 'rgba(174, 121, 255, 0.15)',
      iconBg: 'rgba(174, 121, 255, 0.2)'
    },
    {
      icon: BookOpen,
      label: 'Subjects Assigned',
      value: subjectsAssigned,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      iconBg: 'rgba(245, 158, 11, 0.2)'
    },
    {
      icon: FileText,
      label: 'Assignments Due',
      value: assignmentsDue,
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.15)',
      iconBg: 'rgba(99, 102, 241, 0.2)'
    },
    {
      icon: ClipboardList,
      label: 'Exams Pending Marking',
      value: examsPending,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      iconBg: 'rgba(239, 68, 68, 0.2)'
    }
  ];

  // Generate mock trend data for each stat
  const getTrendData = (index: number) => {
    const trends = [
      { change: 2.5, isPositive: true },
      { change: 5.8, isPositive: true },
      { change: -1.2, isPositive: false },
      { change: 0, isPositive: true },
      { change: 3.4, isPositive: true },
      { change: -0.8, isPositive: false },
    ];
    return trends[index % trends.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const trend = getTrendData(index);
        const trendColor = trend.isPositive ? '#10b981' : trend.change < 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.55)';
        
        return (
          <GlassCard 
            key={stat.label} 
            className="p-6 relative overflow-hidden" 
            hover
            style={{
              background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}08 100%)`,
            }}
          >
            {/* Decorative gradient blob */}
            <div 
              className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
              style={{ background: stat.color }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl" style={{ background: stat.iconBg }}>
                  <Icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                {trend.change !== 0 && (
                  <div className="flex items-center gap-1">
                    {trend.isPositive ? (
                      <ArrowUpRight className="w-4 h-4" style={{ color: trendColor }} />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" style={{ color: trendColor }} />
                    )}
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: trendColor }}
                    >
                      {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <p className="text-sm mb-2 font-medium" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                  {trend.change !== 0 ? (trend.isPositive ? 'Increased' : 'Decreased') : 'No change'} this week
                </p>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

