'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, BookOpen, Eye, FileText, GraduationCap } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
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

  // Ensure assignments is an array and has valid structure
  const validAssignments: ClassAssignment[] = Array.isArray(assignments) 
    ? assignments.filter((a: any) => a && a.class_name && Array.isArray(a.subjects))
    : [];

  // Mock data if not provided
  const mockAssignments: ClassAssignment[] = validAssignments.length > 0 ? validAssignments : [
    { class_name: 'S.1 West', subjects: ['Mathematics', 'Physics'], student_count: 32 },
    { class_name: 'S.2 East', subjects: ['Chemistry', 'Biology'], student_count: 28 },
    { class_name: 'S.3 North', subjects: ['Mathematics', 'Physics'], student_count: 35 }
  ];

  const getColorClass = (index: number) => {
    const colors = [
      { icon: '#4dabff', iconBg: 'rgba(77, 171, 255, 0.2)', gradientStart: 'rgba(77, 171, 255, 0.25)', gradientEnd: 'rgba(77, 171, 255, 0.15)' },
      { icon: '#10b981', iconBg: 'rgba(16, 185, 129, 0.2)', gradientStart: 'rgba(16, 185, 129, 0.25)', gradientEnd: 'rgba(16, 185, 129, 0.15)' },
      { icon: '#ae79ff', iconBg: 'rgba(174, 121, 255, 0.2)', gradientStart: 'rgba(174, 121, 255, 0.25)', gradientEnd: 'rgba(174, 121, 255, 0.15)' },
      { icon: '#f59e0b', iconBg: 'rgba(245, 158, 11, 0.2)', gradientStart: 'rgba(245, 158, 11, 0.25)', gradientEnd: 'rgba(245, 158, 11, 0.15)' },
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
              className="p-6 cursor-pointer relative overflow-hidden"
              hover
              style={{
                background: `linear-gradient(135deg, ${colors.gradientStart} 0%, ${colors.gradientEnd} 100%)`,
              }}
            >
              {/* Decorative gradient blob */}
              <div 
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl"
                style={{ background: colors.icon }}
              />
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => router.push(`/dashboard/teacher/classes/${assignment.class_name}`)}
                className="relative z-10"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="p-4 rounded-xl" style={{ background: colors.iconBg }}>
                    <GraduationCap className="w-7 h-7" style={{ color: colors.icon }} />
                  </div>
                  <div 
                    className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    <Users className="w-4 h-4" />
                    <span>{assignment.student_count}</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">{assignment.class_name}</h3>

                <div className="mb-5">
                  <div className="text-xs mb-3 font-medium" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>Subjects:</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(assignment.subjects) && assignment.subjects.length > 0 ? (
                      assignment.subjects.map((subject: string) => (
                        <span
                          key={subject}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{
                            background: colors.iconBg,
                            color: colors.icon,
                            border: `1px solid ${colors.icon}66`
                          }}
                        >
                          {subject}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>No subjects assigned</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <GlassButton
                    variant="primary"
                    onClick={(e: any) => {
                      e.stopPropagation();
                      router.push(`/dashboard/teacher/classes/${assignment.class_name}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium"
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
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium"
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


