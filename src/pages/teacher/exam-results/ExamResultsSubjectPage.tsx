/**
 * Teacher Exam Results — reached from sidebar: Class → Subject.
 * Primary (P1–P7): marks out of 100. Pre-primary (Baby / Middle / Top): holistic colour ratings per skill.
 */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTeacherContext } from '../useTeacherContext';
import { calculatePrimaryGrade, calculateGrade } from '@/lib/reportUtils';
import {
  ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS,
  countPrePrimaryStrandsWithData,
  isPrePrimaryNurseryClass,
} from '../../../templates/primary/prePrimaryHolisticRatings';
import { PrePrimaryHolisticExamGrid } from './PrePrimaryHolisticExamGrid';

type SchoolType = 'Nursery/Primary' | 'Secondary' | null;
type ExamSet = { id: string; name: string; term?: number; year?: number; active_for_input?: boolean };
type CurrentTerm = { year: number; term: number } | null;
type Student = { student_id: string; name: string; admission_number?: string | null };

async function fetchSchoolType(schoolId: string): Promise<SchoolType> {
  const { data } = await supabase.from('schools').select('type').eq('school_id', schoolId).single();
  const t = (data as { type?: string } | null)?.type;
  if (t === 'Nursery/Primary' || t === 'Secondary') return t;
  return null;
}

async function fetchCurrentTerm(schoolId: string): Promise<CurrentTerm> {
  const { data } = await supabase
    .from('school_terms')
    .select('year, term, start_date, end_date')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: true });
  const todayStr = new Date().toISOString().slice(0, 10);
  const current = (data || []).find(
    (r: { start_date?: string; end_date: string }) =>
      r.end_date >= todayStr && (r.start_date == null || r.start_date <= todayStr)
  );
  return current ? { year: current.year, term: current.term } : null;
}

export default function ExamResultsSubjectPage() {
  const { classEncoded, subjectEncoded } = useParams<{ classEncoded: string; subjectEncoded: string }>();
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { teacherId } = useTeacherContext();

  const className = useMemo(() => (classEncoded ? decodeURIComponent(classEncoded) : ''), [classEncoded]);
  const subject = useMemo(() => (subjectEncoded ? decodeURIComponent(subjectEncoded) : ''), [subjectEncoded]);

  const { data: schoolType } = useQuery({
    queryKey: ['teacher', 'school-type', schoolId ?? ''],
    queryFn: () => fetchSchoolType(schoolId!),
    enabled: !!schoolId,
  });

  const showPrePrimaryHolistic = useMemo(
    () => schoolType === 'Nursery/Primary' && isPrePrimaryNurseryClass(className),
    [schoolType, className]
  );

  const { data: currentTerm } = useQuery({
    queryKey: ['teacher', 'current-term', schoolId ?? ''],
    queryFn: () => fetchCurrentTerm(schoolId!),
    enabled: !!schoolId,
  });

  const { data: allExamSets = [] } = useQuery({
    queryKey: ['teacher', 'exam-sets', schoolId ?? ''],
    queryFn: async (): Promise<ExamSet[]> => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('exam_sets')
        .select('id, name, term, year, active_for_input')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      return (data as ExamSet[]) ?? [];
    },
    enabled: !!schoolId,
  });

  const examSetsForTerm = useMemo(() => {
    if (!currentTerm) return [];
    return allExamSets.filter(
      (es) => es.term === currentTerm.term && es.year === currentTerm.year && es.active_for_input
    );
  }, [allExamSets, currentTerm]);

  const { data: students = [] } = useQuery({
    queryKey: ['teacher', 'exam-results', 'students', schoolId, className],
    queryFn: async (): Promise<Student[]> => {
      if (!schoolId || !className) return [];
      const { data } = await supabase
        .from('students')
        .select('student_id, name, admission_number')
        .eq('school_id', schoolId)
        .eq('current_class', className)
        .eq('status', 'active')
        .order('name');
      return (data as Student[]) ?? [];
    },
    enabled: !!schoolId && !!className,
  });

  const [selectedExamSetId, setSelectedExamSetId] = useState('');

  useEffect(() => {
    if (examSetsForTerm.length > 0 && !examSetsForTerm.some((es) => es.id === selectedExamSetId)) {
      setSelectedExamSetId('');
    }
  }, [examSetsForTerm, selectedExamSetId]);

  const { data: existingResults = [], refetch: refetchResults } = useQuery({
    queryKey: ['teacher', 'exam-results', 'by-subject', schoolId, selectedExamSetId, className, subject],
    queryFn: async () => {
      if (!schoolId || !selectedExamSetId || !className || !subject) return [];
      const { data } = await supabase
        .from('exam_results')
        .select('student_id, marks_obtained, total_marks, grade, remarks, nursery_skill_performance')
        .eq('school_id', schoolId)
        .eq('exam_set_id', selectedExamSetId)
        .eq('class_name', className)
        .eq('subject', subject);
      return (data ?? []) as {
        student_id: string;
        marks_obtained: number | null;
        total_marks: number | null;
        grade: string | null;
        remarks: string | null;
        nursery_skill_performance?: unknown;
      }[];
    },
    enabled: !!schoolId && !!selectedExamSetId && !!className && !!subject,
  });

  const { data: strandCoverageRows = [] } = useQuery({
    queryKey: [
      'teacher',
      'exam-results',
      'strand-coverage',
      schoolId,
      selectedExamSetId,
      className,
    ],
    queryFn: async () => {
      if (!schoolId || !selectedExamSetId || !className) return [];
      const { data } = await supabase
        .from('exam_results')
        .select('student_id, subject, nursery_skill_performance')
        .eq('school_id', schoolId)
        .eq('exam_set_id', selectedExamSetId)
        .eq('class_name', className)
        .in('subject', ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS);
      return (data ?? []) as {
        student_id: string;
        subject: string;
        nursery_skill_performance?: unknown;
      }[];
    },
    enabled: !!schoolId && !!selectedExamSetId && !!className && showPrePrimaryHolistic,
  });

  const strandAreasRatedByStudent = useMemo(() => {
    const m = new Map<string, number>();
    const byStudent = new Map<string, { subject: string; nursery_skill_performance?: unknown }[]>();
    for (const r of strandCoverageRows) {
      if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
      byStudent.get(r.student_id)!.push({
        subject: r.subject,
        nursery_skill_performance: r.nursery_skill_performance,
      });
    }
    for (const [sid, rows] of byStudent) {
      m.set(sid, countPrePrimaryStrandsWithData(rows));
    }
    return m;
  }, [strandCoverageRows]);

  const resultsByStudent = useMemo(() => {
    const map = new Map<string, (typeof existingResults)[0]>();
    existingResults.forEach((r) => map.set(r.student_id, r));
    return map;
  }, [existingResults]);

  const [edits, setEdits] = useState<Record<string, { marks: string; remark: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const getRow = (studentId: string) => {
    if (edits[studentId] !== undefined) return edits[studentId];
    const row = resultsByStudent.get(studentId);
    return {
      marks: row?.marks_obtained != null ? String(row.marks_obtained) : '',
      remark: row?.remarks ?? '',
    };
  };
  const setRow = (studentId: string, field: 'marks' | 'remark', value: string) => {
    setEdits((prev) => ({
      ...prev,
      [studentId]: { ...getRow(studentId), [field]: value },
    }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!schoolId || !teacherId || !selectedExamSetId || !className || !subject) return;
    if (showPrePrimaryHolistic) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const totalMarks = 100;
    const isPrimary = schoolType === 'Nursery/Primary';
    const toSave = students.map((s) => ({ studentId: s.student_id, ...getRow(s.student_id) })).filter((r) => r.marks !== '' || r.remark !== '');
    if (toSave.length === 0) {
      setSaving(false);
      return;
    }
    for (const { studentId, marks, remark } of toSave) {
      const marksNum = parseFloat(marks) || 0;
      const { grade, remark: computedRemark } = isPrimary
        ? calculatePrimaryGrade(marksNum, totalMarks)
        : calculateGrade(marksNum, totalMarks);
      const remarkToSave = remark.trim() || computedRemark;
      const { data, error } = await supabase.rpc('teacher_upsert_exam_result_primary', {
        p_school_id: schoolId,
        p_exam_set_id: selectedExamSetId,
        p_student_id: studentId,
        p_class_name: className,
        p_subject: subject,
        p_teacher_id: teacherId,
        p_marks_obtained: marksNum,
        p_total_marks: totalMarks,
        p_grade: grade,
        p_remarks: remarkToSave,
        p_teacher_comment: remarkToSave,
        p_nursery_skills: null,
      });
      const result = data as { success?: boolean; error?: string } | null;
      if (result && !result.success) {
        setSaveError(result.error ?? 'Failed to save');
        setSaving(false);
        return;
      }
      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
    }
    setEdits({});
    refetchResults();
    setSaveSuccess(true);
    setSaving(false);
  };

  if (!classEncoded || !className || !subjectEncoded || !subject) {
    return (
      <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
        <p className="ac-text-muted">
          Invalid class or subject. <button type="button" className="underline" onClick={() => navigate('/dashboard/teacher/exam-results')}>Back to Exam Results</button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold ac-text-primary">Exam Results — {className} / {subject}</h1>
        <p className="ac-text-muted text-sm mt-1">
          {showPrePrimaryHolistic
            ? 'Select exam set, then enter holistic ratings (Very Good / Good / Needs Improvement / Tries) for each skill.'
            : 'Select exam set, then enter marks.'}
        </p>
      </div>

      {currentTerm == null && (
        <div className="ac-glass-card p-4 border border-[var(--ac-border)]">
          <p className="text-sm text-amber-600 dark:text-amber-400">No current term set. Ask your admin to set the current term so you can enter marks.</p>
        </div>
      )}

      <div className="ac-glass-card p-6 border border-[var(--ac-border)] space-y-6">
        <h3 className="ac-text-primary font-medium">Select Exam Set</h3>
        <div className="max-w-xs">
          <label className="flex flex-col gap-1">
            <span className="text-sm ac-text-muted">Exam Set</span>
            <select
              className="teacher-dropdown rounded-lg border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary w-full"
              style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
              value={selectedExamSetId}
              onChange={(e) => setSelectedExamSetId(e.target.value)}
            >
              <option value="" style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}>Select Exam Set</option>
              {examSetsForTerm.map((es) => (
                <option key={es.id} value={es.id} style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}>
                  {es.name ?? 'Unnamed'} {es.year != null ? `(${es.year})` : ''}
                </option>
              ))}
            </select>
            {currentTerm && examSetsForTerm.length === 0 && (
              <span className="text-xs ac-text-muted">No exam sets open for input this term. Ask admin to enable &quot;Active for input&quot; in Settings → Exam Sets.</span>
            )}
          </label>
        </div>

        {selectedExamSetId && (
          <>
            <div className="border-t border-[var(--ac-border)] pt-4">
              {showPrePrimaryHolistic && teacherId ? (
                <PrePrimaryHolisticExamGrid
                  students={students}
                  subject={subject}
                  schoolId={schoolId!}
                  teacherId={teacherId}
                  className={className}
                  selectedExamSetId={selectedExamSetId}
                  existingRows={existingResults}
                  onRefetch={() => refetchResults()}
                  strandAreasRatedByStudent={strandAreasRatedByStudent}
                />
              ) : (
                <>
                  <p className="ac-text-primary text-sm font-medium mb-3">Enter marks for {subject} (out of 100)</p>
                  {students.length === 0 ? (
                    <p className="ac-text-muted text-sm">No students in this class.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)]">
                      <table className="w-full min-w-[500px] border-collapse ac-text-primary text-sm">
                        <thead>
                          <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-bg-muted)]">
                            <th className="text-left p-2 font-medium">Student</th>
                            <th className="text-left p-2 font-medium w-24">Marks</th>
                            <th className="text-left p-2 font-medium">Grade</th>
                            <th className="text-left p-2 font-medium">Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((stu) => {
                            const { marks, remark } = getRow(stu.student_id);
                            const marksNum = parseFloat(marks) || 0;
                            const total = 100;
                            const { grade } = schoolType === 'Nursery/Primary'
                              ? calculatePrimaryGrade(marksNum, total)
                              : calculateGrade(marksNum, total);
                            return (
                              <tr key={stu.student_id} className="border-b border-[var(--ac-border)] hover:bg-[var(--ac-bg-muted)]/50">
                                <td className="p-2 font-medium">{stu.name}</td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    className="w-20 rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1 ac-text-primary text-center"
                                    value={marks}
                                    onChange={(e) => setRow(stu.student_id, 'marks', e.target.value)}
                                  />
                                </td>
                                <td className="p-2">{marks !== '' ? grade : '—'}</td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    className="w-full max-w-xs rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1 ac-text-primary"
                                    placeholder="Remark"
                                    value={remark}
                                    onChange={(e) => setRow(stu.student_id, 'remark', e.target.value)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
            {students.length > 0 && !showPrePrimaryHolistic && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="ac-glass-btn-primary rounded-xl px-4 py-2 text-sm font-medium"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {saveSuccess && <span className="ac-text-success text-sm">Saved.</span>}
                {saveError && <span className="text-red-500 dark:text-red-400 text-sm">{saveError}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
