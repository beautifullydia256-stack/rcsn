'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, BookOpen, Eye, FileText, GraduationCap } from 'lucide-react';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';

interface ClassAssignment {
  class_name: string;
  subjects: string[];
  student_count: number;
}

interface ClassCardsProps {
  assignments?: ClassAssignment[];
}

export default function ClassCards({ assignments = [] }: ClassCardsProps) {
  const router = useRouter();

  // Mock data if not provided
  const mockAssignments: ClassAssignment[] = assignments.length > 0 ? assignments : [
    { class_name: 'S.1 West', subjects: ['Mathematics', 'Physics'], student_count: 32 },
    { class_name: 'S.2 East', subjects: ['Chemistry', 'Biology'], student_count: 28 },
    { class_name: 'S.3 North', subjects: ['Mathematics', 'Physics'], student_count: 35 }
  ];

  const getColorClass = (index: number) => {
    const colors = [
      { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
      { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/40' },
      { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', icon: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/40' },
      { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', icon: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">My Classes</h2>
        <button
          onClick={() => router.push('/dashboard/teacher/classes')}
          className="text-sm hover:underline"
          style={{ color: '#4dabff' }}
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockAssignments.map((assignment, index) => {
          const colors = getColorClass(index);
          return (
            <GlassCard
              key={assignment.class_name}
              className="p-6 cursor-pointer"
              hover
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => router.push(`/dashboard/teacher/classes/${assignment.class_name}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl" style={{ background: colors.iconBg }}>
                    <GraduationCap className="w-6 h-6" style={{ color: colors.icon.replace('text-', '#').replace('-600', '').replace('-400', '') }} />
                  </div>
                  <div className="flex items-center gap-1 text-sm" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    <Users className="w-4 h-4" />
                    <span>{assignment.student_count}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{assignment.class_name}</h3>

                <div className="mb-4">
                  <div className="text-xs mb-2" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Subjects:</div>
                  <div className="flex flex-wrap gap-2">
                    {assignment.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: colors.iconBg,
                          color: colors.icon.replace('text-', '#').replace('-600', '').replace('-400', '')
                        }}
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <GlassButton
                    variant="primary"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      router.push(`/dashboard/teacher/classes/${assignment.class_name}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Class
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      router.push(`/dashboard/teacher/exam-results/${assignment.class_name}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Enter Marks
                  </GlassButton>
                </div>
              </motion.div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}


