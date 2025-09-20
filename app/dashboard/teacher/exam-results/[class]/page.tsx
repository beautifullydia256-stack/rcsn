"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { useRouter, useParams } from "next/navigation";

export default function TeacherExamResultsClassPage() {
  const router = useRouter();
  const params = useParams();
  const className = decodeURIComponent(params.class as string);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [examSets, setExamSets] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [selectedExamSet, setSelectedExamSet] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [examResults, setExamResults] = useState<Record<string, { marks: string; totalMarks: string; grade: string }>>({});
  const [showGradeSettings, setShowGradeSettings] = useState(false);
  const [gradeSettings, setGradeSettings] = useState<Record<string, Array<{min: number; max: number; grade: string}>>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/');
          return;
        }

        // Try to get teacher_id from user_metadata or from users table
        let teacherId = user.user_metadata?.teacher_id;
        let schoolId = user.user_metadata?.school_id;
        
        if (!teacherId || !schoolId) {
          // Fallback: get teacher_id and school_id from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_metadata, school_id')
            .eq('user_id', user.id)
            .single();
          
          if (userError) {
            console.error('Error fetching user data:', userError);
            setError('Failed to load teacher information');
            return;
          }
          
          teacherId = teacherId || userData?.user_metadata?.teacher_id;
          schoolId = schoolId || userData?.school_id;
        }
        
        if (!teacherId) {
          setError('Teacher ID not found. Please contact your administrator.');
          return;
        }
        
        if (!schoolId) {
          setError('School ID not found. Please contact your administrator.');
          return;
        }

        // Get teacher's subjects for this class
        console.log('Fetching teacher assignments for:', { teacherId: teacherId, schoolId: schoolId, className: className });
        const { data: assignments, error: assignmentsError } = await supabase
          .from('teacher_class_subjects')
          .select('subject')
          .eq('school_id', schoolId)  // Application-level school filtering
          .eq('teacher_id', teacherId)
          .eq('class_name', className);

        if (assignmentsError) {
          console.error('Error fetching teacher assignments:', assignmentsError);
          throw assignmentsError;
        }
        console.log('Teacher assignments:', assignments);
        setTeacherSubjects(assignments?.map(a => a.subject) || []);

        // Get exam sets for this class that are active for input
        console.log('Fetching exam sets for:', { schoolId, className });
        const { data: examSetsData, error: examSetsError } = await supabase
          .from('exam_sets')
          .select('*')
          .eq('school_id', schoolId)  // Application-level school filtering
          .eq('is_active', true)
          .eq('active_for_input', true)  // Only show exam sets that are active for input
          .order('year', { ascending: false })
          .order('term', { ascending: true });

        if (examSetsError) {
          console.error('Error fetching exam sets:', examSetsError);
          throw examSetsError;
        }
        
        // Filter exam sets that apply to this class (either all classes or specific class)
        const filteredExamSets = (examSetsData || []).filter(examSet => 
          examSet.target_classes.length === 0 || examSet.target_classes.includes(className)
        );
        console.log('Exam sets:', examSetsData, 'Filtered:', filteredExamSets);
        setExamSets(filteredExamSets);

        // Get students in this class
        console.log('Fetching students for:', { schoolId, className });
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('student_id, name, current_class')
          .eq('school_id', schoolId)  // Application-level school filtering
          .eq('current_class', className)
          .order('name');

        if (studentsError) {
          console.error('Error fetching students:', studentsError);
          console.error('Students error details:', {
            code: studentsError.code,
            message: studentsError.message,
            details: studentsError.details,
            hint: studentsError.hint
          });
          throw studentsError;
        }
        console.log('Students:', studentsData);
        setStudents(studentsData || []);

      } catch (err) {
        console.error('Error fetching data:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          className: className
        });
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [className, router]);

  const calculateGrade = (marks: number, totalMarks: number, subject: string): string => {
    if (!marks || !totalMarks) return '';
    
    const percentage = (marks / totalMarks) * 100;
    const subjectGrades = gradeSettings[subject] || getDefaultGrades();
    
    for (const gradeRange of subjectGrades) {
      if (percentage >= gradeRange.min && percentage <= gradeRange.max) {
        return gradeRange.grade;
      }
    }
    
    return 'F'; // Default grade
  };

  const getDefaultGrades = () => [
    { min: 0, max: 40, grade: 'F' },
    { min: 41, max: 50, grade: 'D' },
    { min: 51, max: 60, grade: 'C' },
    { min: 61, max: 70, grade: 'B' },
    { min: 71, max: 80, grade: 'B+' },
    { min: 81, max: 90, grade: 'A' },
    { min: 91, max: 100, grade: 'A+' }
  ];

  const handleMarksChange = (studentId: string, field: 'marks' | 'totalMarks', value: string) => {
    const newMarks = field === 'marks' ? value : (examResults[studentId]?.marks || '');
    const newTotalMarks = field === 'totalMarks' ? value : '100'; // Always set to 100
    
    const marksNum = parseFloat(newMarks) || 0;
    const totalMarksNum = parseFloat(newTotalMarks) || 100;
    const grade = calculateGrade(marksNum, totalMarksNum, selectedSubject);
    
    setExamResults(prev => ({
      ...prev,
      [studentId]: {
        marks: newMarks,
        totalMarks: newTotalMarks,
        grade: grade
      }
    }));
  };

  const handleSaveResults = async () => {
    if (!selectedExamSet || !selectedSubject) {
      setError('Please select an exam set and subject');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const teacherId = user?.user_metadata?.teacher_id;

      const resultsToSave = Object.entries(examResults)
        .filter(([_, data]) => data.marks && data.totalMarks)
        .map(([studentId, data]) => ({
          school_id: user?.user_metadata?.school_id,
          exam_set_id: selectedExamSet,
          student_id: studentId,
          class_name: className,
          subject: selectedSubject,
          marks_obtained: parseFloat(data.marks),
          total_marks: parseFloat(data.totalMarks),
          grade: data.grade || calculateGrade(parseFloat(data.marks), parseFloat(data.totalMarks), selectedSubject)
        }));

      if (resultsToSave.length === 0) {
        setError('Please enter marks for at least one student');
        return;
      }

      const { error: insertError } = await supabase
        .from('exam_results')
        .upsert(resultsToSave, { 
          onConflict: 'exam_set_id,student_id,subject',
          ignoreDuplicates: false 
        });

      if (insertError) throw insertError;

      setSuccess(`Successfully saved ${resultsToSave.length} exam results`);
      setExamResults({});
      
    } catch (err) {
      console.error('Error saving results:', err);
      setError('Failed to save exam results');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-semibold">Insert Exam Results</h1>
            <p className="text-white/80 text-sm mt-1">Class: {className}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGradeSettings(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              Grade Settings
            </button>
            <button
              onClick={() => router.push('/dashboard/teacher/exam-results')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Classes
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-4 py-3">
            {success}
          </div>
        )}

        {/* Exam Set and Subject Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 mb-6"
        >
          <h3 className="text-white font-medium mb-4">Select Exam Set and Subject</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Exam Set</label>
              <select
                value={selectedExamSet}
                onChange={(e) => setSelectedExamSet(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2"
              >
                <option value="">Select Exam Set</option>
                {examSets.map(examSet => (
                  <option key={examSet.id} value={examSet.id} className="bg-slate-800">
                    {examSet.name} - Term {examSet.term} {examSet.year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2"
              >
                <option value="">Select Subject</option>
                {teacherSubjects.map(subject => (
                  <option key={subject} value={subject} className="bg-slate-800">
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Students and Marks Input */}
        {selectedExamSet && selectedSubject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md overflow-hidden"
          >
            <div className="p-6 border-b border-white/10">
              <h3 className="text-white font-medium">Enter Marks for {selectedSubject}</h3>
              <p className="text-white/80 text-sm mt-1">
                Enter marks for each student. Only students you teach this subject will be shown.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Marks Obtained
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Total Marks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {students.map((student) => {
                    const marks = examResults[student.student_id]?.marks || '';
                    const totalMarks = examResults[student.student_id]?.totalMarks || '100';
                    const grade = examResults[student.student_id]?.grade || '';
                    
                    return (
                      <tr key={student.student_id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap text-white">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={marks}
                            onChange={(e) => handleMarksChange(student.student_id, 'marks', e.target.value)}
                            className="w-24 rounded border border-white/10 bg-white/10 text-white px-2 py-1 text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value="100"
                            readOnly
                            className="w-24 rounded border border-white/10 bg-white/5 text-white/60 px-2 py-1 text-sm cursor-not-allowed"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            grade === 'A' ? 'bg-green-600/20 text-green-300' :
                            grade === 'B' ? 'bg-blue-600/20 text-blue-300' :
                            grade === 'C' ? 'bg-yellow-600/20 text-yellow-300' :
                            grade === 'D' ? 'bg-orange-600/20 text-orange-300' :
                            grade === 'F' ? 'bg-red-600/20 text-red-300' :
                            'text-white/60'
                          }`}>
                            {grade || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 border-t border-white/10">
              <button
                onClick={handleSaveResults}
                disabled={saving}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Exam Results'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Grade Settings Modal */}
        {showGradeSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white text-xl font-semibold">Grade Settings</h2>
                <button
                  onClick={() => setShowGradeSettings(false)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {teacherSubjects.map(subject => (
                  <div key={subject} className="border border-white/10 rounded-lg p-4">
                    <h3 className="text-white font-medium mb-3">{subject}</h3>
                    <div className="space-y-2">
                      {(gradeSettings[subject] || getDefaultGrades()).map((grade, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={grade.min}
                            onChange={(e) => {
                              const newGrades = [...(gradeSettings[subject] || getDefaultGrades())];
                              newGrades[index].min = parseInt(e.target.value) || 0;
                              setGradeSettings(prev => ({ ...prev, [subject]: newGrades }));
                            }}
                            className="w-20 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                          <span className="text-white/80">to</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={grade.max}
                            onChange={(e) => {
                              const newGrades = [...(gradeSettings[subject] || getDefaultGrades())];
                              newGrades[index].max = parseInt(e.target.value) || 100;
                              setGradeSettings(prev => ({ ...prev, [subject]: newGrades }));
                            }}
                            className="w-20 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                          <span className="text-white/80">=</span>
                          <input
                            type="text"
                            value={grade.grade}
                            onChange={(e) => {
                              const newGrades = [...(gradeSettings[subject] || getDefaultGrades())];
                              newGrades[index].grade = e.target.value;
                              setGradeSettings(prev => ({ ...prev, [subject]: newGrades }));
                            }}
                            className="w-16 px-2 py-1 rounded border border-white/20 bg-white/10 text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowGradeSettings(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
