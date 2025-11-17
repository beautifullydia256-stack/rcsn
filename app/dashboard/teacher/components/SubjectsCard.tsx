'use client';

import { motion } from 'framer-motion';
import { BookOpen, GraduationCap } from 'lucide-react';

interface Subject {
  subject: string;
  classes: string[];
}

interface SubjectsCardProps {
  subjects?: Subject[];
}

export default function SubjectsCard({ subjects = [] }: SubjectsCardProps) {
  // Mock data if not provided
  const mockSubjects: Subject[] = subjects.length > 0 ? subjects : [
    { subject: 'Mathematics', classes: ['S.1 West', 'S.2 East', 'S.3 North'] },
    { subject: 'Physics', classes: ['S.1 West', 'S.3 North'] },
    { subject: 'Chemistry', classes: ['S.2 East'] },
    { subject: 'Biology', classes: ['S.2 East', 'S.3 North'] }
  ];

  const getSubjectColor = (index: number) => {
    const colors = [
      { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400', icon: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
      { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400', icon: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/40' },
      { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400', icon: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/40' },
      { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-400', icon: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 rounded-2xl backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl"></div>
      <div className="relative bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/10 p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <div className="relative z-10 flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 drop-shadow-sm">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Assigned Subjects
          </h2>
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            {mockSubjects.length} subjects
          </span>
        </div>
        </div>

        <div className="relative z-10 space-y-3">
        {mockSubjects.map((subject, index) => {
          const colors = getSubjectColor(index);
          return (
            <motion.div
              key={subject.subject}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: 4 }}
              className="relative z-10 bg-white/20 dark:bg-white/5 backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/10 p-4 transition-all hover:bg-white/30 dark:hover:bg-white/10 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`${colors.iconBg} p-2 rounded-lg`}>
                    <GraduationCap className={`w-4 h-4 ${colors.icon}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{subject.subject}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {subject.classes.length} {subject.classes.length === 1 ? 'class' : 'classes'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 ml-11">
                {subject.classes.map((className) => (
                  <span
                    key={className}
                    className={`${colors.iconBg} ${colors.text} px-2 py-1 rounded-lg text-xs font-medium`}
                  >
                    {className}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

