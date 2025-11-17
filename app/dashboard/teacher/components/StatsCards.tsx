'use client';

import { Users, GraduationCap, UserCheck, BookOpen, FileText, ClipboardList } from 'lucide-react';
import GlassCard from './GlassCard';

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <GlassCard key={stat.label} className="p-6" enableHover>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm mb-2 font-medium" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{stat.label}</p>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: stat.iconBg }}>
                <Icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

