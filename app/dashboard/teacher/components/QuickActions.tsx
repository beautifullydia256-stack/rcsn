'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
      bgColor: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
    },
    {
      icon: BookOpen,
      label: 'Insert Exam Results',
      path: '/dashboard/teacher/exam-results',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
    },
    {
      icon: Sparkles,
      label: 'AI Generate Lesson Plan',
      path: '/dashboard/teacher/ai-planner',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30'
    },
    {
      icon: Upload,
      label: 'Upload Assignment',
      path: '/dashboard/teacher/assignments',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30'
    },
    {
      icon: Calendar,
      label: 'View Timetable',
      path: '/dashboard/teacher/timetable',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
    },
    {
      icon: FileText,
      label: 'AI Create Exam Paper',
      path: '/dashboard/teacher/ai-planner?action=exam',
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/30'
    },
    {
      icon: MessageSquare,
      label: 'Send Message to Class',
      path: '/dashboard/teacher/messages',
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30'
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 drop-shadow-sm">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(action.path)}
              className="relative group overflow-hidden"
            >
              {/* Liquid Glass Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-lg"></div>
              <div className="relative flex flex-col items-center justify-center gap-2 p-4 bg-white/20 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 hover:border-white/50 dark:hover:border-white/20 transition-all duration-300">
                {/* Shimmer on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                <div className="relative z-10 p-2.5 rounded-xl bg-white/30 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/5 group-hover:scale-110 group-hover:bg-white/40 dark:group-hover:bg-white/15 transition-all duration-300">
                  <Icon className={`w-5 h-5 ${action.color} drop-shadow-sm`} />
                </div>
                <span className={`relative z-10 text-xs font-medium text-center ${action.color} group-hover:font-semibold transition-all drop-shadow-sm`}>
                  {action.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

