'use client';

import { motion } from 'framer-motion';
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
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40'
    },
    {
      icon: Users,
      label: 'Students in My Classes',
      value: totalStudents,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-100 dark:bg-green-900/40'
    },
    {
      icon: UserCheck,
      label: 'Students Attended Today',
      value: studentsAttendedToday,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40'
    },
    {
      icon: BookOpen,
      label: 'Subjects Assigned',
      value: subjectsAssigned,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40'
    },
    {
      icon: FileText,
      label: 'Assignments Due',
      value: assignmentsDue,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40'
    },
    {
      icon: ClipboardList,
      label: 'Exams Pending Marking',
      value: examsPending,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40'
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
            {/* Liquid Glass Card */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl"></div>
            <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color} drop-shadow-sm`}>{stat.value}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 dark:bg-white/10 rounded-xl blur-md"></div>
                  <div className={`relative ${stat.iconBg} backdrop-blur-sm p-3 rounded-xl border border-white/30 dark:border-white/10`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

