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
import GlassCard from './GlassCard';

interface QuickAction {
  icon: any;
  label: string;
  path: string;
  color: string;
  iconBg: string;
}

export default function QuickActions() {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      icon: ClipboardCheck,
      label: 'Take Attendance',
      path: '/dashboard/teacher/attendance',
      color: '#4dabff',
      iconBg: 'rgba(77, 171, 255, 0.2)'
    },
    {
      icon: BookOpen,
      label: 'Insert Exam Results',
      path: '/dashboard/teacher/exam-results',
      color: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.2)'
    },
    {
      icon: Sparkles,
      label: 'AI Generate Lesson Plan',
      path: '/dashboard/teacher/ai-planner',
      color: '#ae79ff',
      iconBg: 'rgba(174, 121, 255, 0.2)'
    },
    {
      icon: Upload,
      label: 'Upload Assignment',
      path: '/dashboard/teacher/assignments',
      color: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.2)'
    },
    {
      icon: Calendar,
      label: 'View Timetable',
      path: '/dashboard/teacher/timetable',
      color: '#6366f1',
      iconBg: 'rgba(99, 102, 241, 0.2)'
    },
    {
      icon: FileText,
      label: 'AI Create Exam Paper',
      path: '/dashboard/teacher/ai-planner?action=exam',
      color: '#ff6bcb',
      iconBg: 'rgba(255, 107, 203, 0.2)'
    },
    {
      icon: MessageSquare,
      label: 'Send Message to Class',
      path: '/dashboard/teacher/messages',
      color: '#00d4ff',
      iconBg: 'rgba(0, 212, 255, 0.2)'
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <GlassCard key={action.path} className="p-4" hover>
              <button
                onClick={() => router.push(action.path)}
                className="w-full flex flex-col items-center justify-center gap-2 transition-all"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="p-2.5 rounded-lg" style={{ background: action.iconBg }}>
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </div>
                <span className="text-xs font-medium text-center" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  {action.label}
                </span>
              </button>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

