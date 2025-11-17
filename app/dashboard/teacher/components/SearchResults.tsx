'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, BookOpen, FileText, MessageSquare, Calendar, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResultsProps {
  query: string;
  students: Array<{ student_id: string; name: string; current_class: string }>;
  assignments: Array<{ class_name: string; subject: string }>;
  onClose: () => void;
}

export default function SearchResults({ query, students, assignments, onClose }: SearchResultsProps) {
  const router = useRouter();
  const [results, setResults] = useState<{
    students: Array<{ id: string; name: string; class: string; type: string }>;
    classes: Array<{ name: string; type: string }>;
    subjects: Array<{ name: string; class: string; type: string }>;
  }>({ students: [], classes: [], subjects: [] });

  useEffect(() => {
    if (!query.trim()) {
      setResults({ students: [], classes: [], subjects: [] });
      return;
    }

    const searchLower = query.toLowerCase();
    const matchedStudents = students
      .filter(s => 
        s.name.toLowerCase().includes(searchLower) ||
        s.current_class.toLowerCase().includes(searchLower)
      )
      .map(s => ({
        id: s.student_id,
        name: s.name,
        class: s.current_class,
        type: 'student'
      }));

    const classSet = new Set<string>();
    const subjectSet = new Set<string>();
    
    assignments.forEach(a => {
      if (a.class_name.toLowerCase().includes(searchLower)) {
        classSet.add(a.class_name);
      }
      if (a.subject.toLowerCase().includes(searchLower)) {
        subjectSet.add(`${a.subject} - ${a.class_name}`);
      }
    });

    const matchedClasses = Array.from(classSet).map(name => ({
      name,
      type: 'class'
    }));

    const matchedSubjects = Array.from(subjectSet).map(full => {
      const [subject, className] = full.split(' - ');
      return {
        name: subject,
        class: className,
        type: 'subject'
      };
    });

    setResults({
      students: matchedStudents,
      classes: matchedClasses,
      subjects: matchedSubjects
    });
  }, [query, students, assignments]);

  const totalResults = results.students.length + results.classes.length + results.subjects.length;

  if (!query.trim() || totalResults === 0) {
    return null;
  }

  const handleStudentClick = (studentId: string) => {
    router.push(`/dashboard/teacher/students/${encodeURIComponent(studentId)}`);
    onClose();
  };

  const handleClassClick = (className: string) => {
    router.push(`/dashboard/teacher/classes`);
    onClose();
  };

  const handleSubjectClick = (subject: string, className: string) => {
    router.push(`/dashboard/teacher/exam-results/${encodeURIComponent(className)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[600px] overflow-y-auto z-50"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {totalResults} result{totalResults !== 1 ? 's' : ''} found
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-2">
          {/* Students */}
          {results.students.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Students
              </div>
              {results.students.map((student) => (
                <motion.button
                  key={student.id}
                  onClick={() => handleStudentClick(student.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {student.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {student.class}
                    </div>
                  </div>
                  <Users className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          )}

          {/* Classes */}
          {results.classes.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Classes
              </div>
              {results.classes.map((cls) => (
                <motion.button
                  key={cls.name}
                  onClick={() => handleClassClick(cls.name)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {cls.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Class
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Subjects */}
          {results.subjects.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Subjects
              </div>
              {results.subjects.map((subject, index) => (
                <motion.button
                  key={`${subject.name}-${subject.class}-${index}`}
                  onClick={() => handleSubjectClick(subject.name, subject.class)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  whileHover={{ x: 4 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {subject.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {subject.class}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

