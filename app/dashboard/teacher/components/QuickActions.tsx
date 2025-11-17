'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import LiquidGlass from 'liquid-glass-react';
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
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20 hover:bg-blue-900/30'
    },
    {
      icon: BookOpen,
      label: 'Insert Exam Results',
      path: '/dashboard/teacher/exam-results',
      color: 'text-green-400',
      bgColor: 'bg-green-900/20 hover:bg-green-900/30'
    },
    {
      icon: Sparkles,
      label: 'AI Generate Lesson Plan',
      path: '/dashboard/teacher/ai-planner',
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20 hover:bg-purple-900/30'
    },
    {
      icon: Upload,
      label: 'Upload Assignment',
      path: '/dashboard/teacher/assignments',
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20 hover:bg-orange-900/30'
    },
    {
      icon: Calendar,
      label: 'View Timetable',
      path: '/dashboard/teacher/timetable',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-900/20 hover:bg-indigo-900/30'
    },
    {
      icon: FileText,
      label: 'AI Create Exam Paper',
      path: '/dashboard/teacher/ai-planner?action=exam',
      color: 'text-pink-400',
      bgColor: 'bg-pink-900/20 hover:bg-pink-900/30'
    },
    {
      icon: MessageSquare,
      label: 'Send Message to Class',
      path: '/dashboard/teacher/messages',
      color: 'text-teal-400',
      bgColor: 'bg-teal-900/20 hover:bg-teal-900/30'
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4 drop-shadow-lg">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative w-full">
                <LiquidGlass
                  displacementScale={64}
                  blurAmount={0.1}
                  saturation={130}
                  aberrationIntensity={2}
                  elasticity={0.35}
                  cornerRadius={16}
                  padding="16px"
                  onClick={() => router.push(action.path)}
                  style={{ minHeight: '100px', width: '100%', cursor: 'pointer' }}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="relative z-10 p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 transition-all duration-300">
                      <Icon className={`w-5 h-5 ${action.color} drop-shadow-lg`} />
                    </div>
                    <span className={`relative z-10 text-xs font-medium text-center ${action.color} transition-all drop-shadow-lg`}>
                      {action.label}
                    </span>
                  </div>
                </LiquidGlass>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

