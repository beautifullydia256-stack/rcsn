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
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100'
    },
    {
      icon: Users,
      label: 'Students in My Classes',
      value: totalStudents,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100'
    },
    {
      icon: UserCheck,
      label: 'Students Attended Today',
      value: studentsAttendedToday,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100'
    },
    {
      icon: BookOpen,
      label: 'Subjects Assigned',
      value: subjectsAssigned,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      iconBg: 'bg-orange-100'
    },
    {
      icon: FileText,
      label: 'Assignments Due',
      value: assignmentsDue,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      iconBg: 'bg-indigo-100'
    },
    {
      icon: ClipboardList,
      label: 'Exams Pending Marking',
      value: examsPending,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100'
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
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2 font-medium">{stat.label}</p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`${stat.iconBg} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

