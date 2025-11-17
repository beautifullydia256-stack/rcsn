'use client';

import { motion } from 'framer-motion';
import LiquidGlass from 'liquid-glass-react';
import { Users, GraduationCap, UserCheck, BookOpen, FileText, ClipboardList } from 'lucide-react';

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
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      iconBg: 'bg-blue-900/40'
    },
    {
      icon: Users,
      label: 'Students in My Classes',
      value: totalStudents,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      iconBg: 'bg-green-900/40'
    },
    {
      icon: UserCheck,
      label: 'Students Attended Today',
      value: studentsAttendedToday,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      iconBg: 'bg-purple-900/40'
    },
    {
      icon: BookOpen,
      label: 'Subjects Assigned',
      value: subjectsAssigned,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
      iconBg: 'bg-orange-900/40'
    },
    {
      icon: FileText,
      label: 'Assignments Due',
      value: assignmentsDue,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-900/20',
      iconBg: 'bg-indigo-900/40'
    },
    {
      icon: ClipboardList,
      label: 'Exams Pending Marking',
      value: examsPending,
      color: 'text-red-400',
      bgColor: 'bg-red-900/20',
      iconBg: 'bg-red-900/40'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="relative group"
          >
            <div className="relative w-full">
              <LiquidGlass
                displacementScale={64}
                blurAmount={0.1}
                saturation={130}
                aberrationIntensity={2}
                elasticity={0.35}
                cornerRadius={16}
                padding="24px"
                style={{ minHeight: '120px', width: '100%' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-white/80 mb-2 font-medium">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color} drop-shadow-lg`}>{stat.value}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-xl blur-md"></div>
                    <div className={`relative ${stat.iconBg} backdrop-blur-sm p-3 rounded-xl border border-white/20`}>
                      <Icon className={`w-6 h-6 ${stat.color} drop-shadow-lg`} />
                    </div>
                  </div>
                </div>
              </LiquidGlass>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

