'use client';

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
          <div
            key={stat.label}
            className="relative"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 font-medium">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`${stat.iconBg} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

