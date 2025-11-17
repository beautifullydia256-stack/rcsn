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
      { icon: '#4dabff', iconBg: 'rgba(77, 171, 255, 0.2)' },
      { icon: '#10b981', iconBg: 'rgba(16, 185, 129, 0.2)' },
      { icon: '#ae79ff', iconBg: 'rgba(174, 121, 255, 0.2)' },
      { icon: '#f59e0b', iconBg: 'rgba(245, 158, 11, 0.2)' },
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
              enableHover={true}
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
                    <GraduationCap className="w-6 h-6" style={{ color: colors.icon }} />
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
                          color: colors.icon
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


