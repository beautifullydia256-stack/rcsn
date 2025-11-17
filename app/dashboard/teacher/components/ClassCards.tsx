'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, BookOpen, Eye, FileText, GraduationCap } from 'lucide-react';

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Classes</h2>
        <button
          onClick={() => router.push('/dashboard/teacher/classes')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockAssignments.map((assignment, index) => {
          const colors = getColorClass(index);
          return (
            <motion.div
              key={assignment.class_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="relative group overflow-hidden cursor-pointer"
            >
              {/* Liquid Glass Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
              <div 
                className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg hover:shadow-2xl transition-all duration-300"
                onClick={() => router.push(`/dashboard/teacher/classes/${assignment.class_name}`)}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/30 dark:bg-white/10 rounded-xl blur-md"></div>
                    <div className={`relative ${colors.iconBg} backdrop-blur-sm p-3 rounded-xl border border-white/30 dark:border-white/10`}>
                      <GraduationCap className={`w-6 h-6 ${colors.icon} drop-shadow-sm`} />
                    </div>
                  </div>
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{assignment.student_count}</span>
                </div>
              </div>

                  <h3 className="relative z-10 text-xl font-bold text-gray-900 dark:text-white mb-2 drop-shadow-sm">{assignment.class_name}</h3>

              <div className="mb-4">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Subjects:</div>
                <div className="flex flex-wrap gap-2">
                  {assignment.subjects.map((subject) => (
                    <span
                      key={subject}
                      className={`${colors.iconBg} ${colors.icon} px-2 py-1 rounded-lg text-xs font-medium`}
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/teacher/classes/${assignment.class_name}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4" />
                  View Class
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/teacher/exam-results/${assignment.class_name}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Enter Marks
                </motion.button>
              </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


