'use client';

import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  BookOpen,
  Sparkles,
  Upload,
  Calendar,
  FileText,
  MessageSquare
} from 'lucide-react';

interface QuickAction {
  icon: any;
  label: string;
  path: string;
  color: string;
  bgColor: string;
}

export default function QuickActions() {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      icon: ClipboardCheck,
      label: 'Take Attendance',
      path: '/dashboard/teacher/attendance',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      icon: BookOpen,
      label: 'Insert Exam Results',
      path: '/dashboard/teacher/exam-results',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      icon: Sparkles,
      label: 'AI Generate Lesson Plan',
      path: '/dashboard/teacher/ai-planner',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      icon: Upload,
      label: 'Upload Assignment',
      path: '/dashboard/teacher/assignments',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      icon: Calendar,
      label: 'View Timetable',
      path: '/dashboard/teacher/timetable',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    {
      icon: FileText,
      label: 'AI Create Exam Paper',
      path: '/dashboard/teacher/ai-planner?action=exam',
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20'
    },
    {
      icon: MessageSquare,
      label: 'Send Message to Class',
      path: '/dashboard/teacher/messages',
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20'
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div
              key={action.path}
            >
              <button
                onClick={() => router.push(action.path)}
                className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className={`${action.bgColor} p-2.5 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className={`text-xs font-medium text-center ${action.color}`}>
                  {action.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

