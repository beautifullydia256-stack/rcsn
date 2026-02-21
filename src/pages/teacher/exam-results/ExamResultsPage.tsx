import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useTeacherContext } from '../useTeacherContext';
import { calculatePrimaryGrade, calculateGrade } from '@/lib/reportUtils';

type SchoolType = 'Nursery/Primary' | 'Secondary' | null;
type ExamSet = { id: string; name: string; term?: number; year?: number; active_for_input?: boolean };
type CurrentTerm = { year: number; term: number } | null;
type Student = { student_id: string; name: string };
type ExamResultRow = { student_id: string; subject: string; marks_obtained: number | null; total_marks: number; grade: string | null; remarks: string | null };

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

export default function TeacherExamResultsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { classNames, teacherId, isLoading: ctxLoading } = useTeacherContext();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedExamSetId, setSelectedExamSetId] = useState<string>('');

  const { data: schoolType, isLoading: typeLoading } = useQuery({
    queryKey: ['teacher', 'school-type', schoolId ?? ''],
    queryFn: () => fetchSchoolType(schoolId!),
    enabled: !!schoolId,
  });

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

  // Teachers only see exam sets for the current term (no editing past terms)
  const examSets =
    currentTerm != null
      ? allExamSets.filter((es) => es.term === currentTerm.term && es.year === currentTerm.year)
      : [];
  const selectedExamSet = useMemo(
    () => examSets.find((es) => es.id === selectedExamSetId),
    [examSets, selectedExamSetId]
  );

  // Reset exam set selection if it's no longer in the filtered list
  useEffect(() => {
    if (
      selectedExamSetId &&
      examSets.length > 0 &&
      !examSets.some((es) => es.id === selectedExamSetId)
    ) {
      setSelectedExamSetId('');
    }
  }, [examSets, selectedExamSetId]);

  const isLoading = ctxLoading || typeLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold ac-text-primary">Exam Results</h1>
        <button
          type="button"
          className="ac-glass-btn-secondary rounded-xl px-3 py-2 text-sm font-medium ac-text-primary"
          onClick={() => navigate('/dashboard/teacher')}
        >
          Back
        </button>
      </div>

      {isLoading && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <div className="animate-pulse flex items-center justify-center py-8">
            <div className="h-6 w-48 rounded ac-skeleton-block" />
          </div>
        </div>
      )}

      {!isLoading && !schoolId && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Sign in and select a school to enter exam results.</p>
        </div>
      )}

      {!isLoading && schoolId && !schoolType && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)]">
          <p className="ac-text-muted text-center">Unable to determine school type. Contact your admin to set school type (Primary or Secondary).</p>
        </div>
      )}

      {!isLoading && schoolId && schoolType && (
        <div className="ac-glass-card p-6 border border-[var(--ac-border)] space-y-6">
          <h2 className="ac-text-primary font-medium">
            {schoolType === 'Nursery/Primary' ? 'Primary / Nursery' : 'Secondary'} exam results
          </h2>
          <p className="ac-text-muted text-sm">Select a class and exam set to enter or view marks. Only the current term is available for editing.</p>

          {currentTerm == null && (
            <p className="text-sm text-amber-600 dark:text-amber-400">No current term is set. Ask your admin to set the current term in school settings so you can enter marks.</p>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm ac-text-muted">Class</span>
              <select
                className="teacher-dropdown rounded-lg border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary min-w-[180px]"
                style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}>
                  Select class
                </option>
                {classNames.map((c) => (
                  <option
                    key={c}
                    value={c}
                    style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
                  >
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm ac-text-muted">Exam set</span>
              <select
                className="teacher-dropdown teacher-exam-set-select rounded-lg border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary min-w-[180px]"
                style={{
                  backgroundColor: 'var(--ac-bg)',
                  color: 'var(--ac-text-primary)',
                }}
                value={selectedExamSetId}
                onChange={(e) => setSelectedExamSetId(e.target.value)}
              >
                <option value="" style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}>
                  Select exam set
                </option>
                {examSets.map((es) => (
                  <option
                    key={es.id}
                    value={es.id}
                    style={{ backgroundColor: 'var(--ac-bg)', color: 'var(--ac-text-primary)' }}
                  >
                    {es.name ?? 'Unnamed'} {es.year != null ? `(${es.year})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedClass && selectedExamSetId && (
            <div className="pt-4 border-t border-[var(--ac-border)]">
              {selectedExamSet?.active_for_input ? (
                <TeacherMarkEntry
                  schoolId={schoolId}
                  teacherId={teacherId}
                  schoolType={schoolType}
                  className={selectedClass}
                  examSetId={selectedExamSetId}
                />
              ) : (
                <>
                  <p className="ac-text-muted text-sm mb-2">Mark entry for <strong className="ac-text-primary">{selectedClass}</strong> in the selected exam set.</p>
                  <p className="ac-text-muted text-sm">Ask your admin to enable teacher mark entry for this exam set (Settings → Exam Sets → turn on &quot;Active for input&quot;).</p>
                </>
              )}
            </div>
          )}

          {classNames.length === 0 && (
            <p className="ac-text-muted text-sm">No classes assigned to you yet. Ask your admin to assign you to classes.</p>
          )}
        </div>
      )}
    </div>
  );
}

// Mark entry grid: students × subjects, save via RPC
function TeacherMarkEntry({
  schoolId,
  teacherId,
  schoolType,
  className,
  examSetId,
}: {
  schoolId: string | null;
  teacherId: string | null;
  schoolType: SchoolType;
  className: string;
  examSetId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: students = [] } = useQuery({
    queryKey: ['teacher', 'exam-results', 'students', schoolId, className],
    queryFn: async (): Promise<Student[]> => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('students')
        .select('student_id, name')
        .eq('school_id', schoolId)
        .eq('current_class', className)
        .eq('status', 'active')
        .order('name');
      return (data as Student[]) ?? [];
    },
    enabled: !!schoolId && !!className,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['teacher', 'exam-results', 'subjects', schoolId, className],
    queryFn: async (): Promise<string[]> => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('class_subjects')
        .select('subject')
        .eq('school_id', schoolId)
        .eq('class_name', className)
        .order('subject');
      return (data ?? []).map((r: { subject: string }) => r.subject);
    },
    enabled: !!schoolId && !!className,
  });

  const { data: existingResults = [], refetch: refetchResults } = useQuery({
    queryKey: ['teacher', 'exam-results', 'results', schoolId, examSetId, className],
    queryFn: async (): Promise<ExamResultRow[]> => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('exam_results')
        .select('student_id, subject, marks_obtained, total_marks, grade, remarks')
        .eq('school_id', schoolId)
        .eq('exam_set_id', examSetId)
        .eq('class_name', className);
      return (data as ExamResultRow[]) ?? [];
    },
    enabled: !!schoolId && !!examSetId && !!className,
  });

  const resultsByKey = useMemo(() => {
    const map = new Map<string, ExamResultRow>();
    existingResults.forEach((r) => map.set(`${r.student_id}:${r.subject}`, r));
    return map;
  }, [existingResults]);

  const [edits, setEdits] = useState<Record<string, { marks: number | null; total: number }>>({});
  const getCell = (studentId: string, subject: string) => {
    const key = `${studentId}:${subject}`;
    if (edits[key] !== undefined) return edits[key];
    const row = resultsByKey.get(key);
    return {
      marks: row?.marks_obtained ?? null,
      total: row?.total_marks ?? 100,
    };
  };
  const setCell = (studentId: string, subject: string, marks: number | null, total: number = 100) => {
    setEdits((prev) => ({ ...prev, [`${studentId}:${subject}`]: { marks, total } }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!schoolId || !teacherId) {
      setSaveError('Your account is not linked to a teacher. Contact your admin.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const toSave = Object.entries(edits);
    if (toSave.length === 0) {
      setSaving(false);
      return;
    }
    const totalMarksDefault = 100;
    const isPrimary = schoolType === 'Nursery/Primary';
    for (const [key, { marks, total }] of toSave) {
      const [studentId, subject] = key.split(':');
      const totalVal = total || totalMarksDefault;
      const marksVal = marks ?? 0;
      const { grade, remark } = isPrimary
        ? calculatePrimaryGrade(marksVal, totalVal)
        : calculateGrade(marksVal, totalVal);
      const { data, error } = await supabase.rpc('teacher_upsert_exam_result_primary', {
        p_school_id: schoolId,
        p_exam_set_id: examSetId,
        p_student_id: studentId,
        p_class_name: className,
        p_subject: subject,
        p_teacher_id: teacherId,
        p_marks_obtained: marksVal,
        p_total_marks: totalVal,
        p_grade: grade,
        p_remarks: remark,
        p_teacher_comment: null,
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

  if (!teacherId) {
    return (
      <p className="ac-text-muted text-sm">Your account is not linked to a teacher. Contact your admin to assign you to classes.</p>
    );
  }

  if (students.length === 0 || subjects.length === 0) {
    return (
      <p className="ac-text-muted text-sm">
        {students.length === 0 ? 'No students in this class.' : 'No subjects configured for this class. Ask your admin to add subjects in Settings.'}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="ac-text-primary text-sm font-medium">Enter marks for {className}. You can edit and save below.</p>
      <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)]">
        <table className="w-full min-w-[600px] border-collapse ac-text-primary text-sm">
          <thead>
            <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-bg-muted)]">
              <th className="text-left p-2 font-medium sticky left-0 bg-[var(--ac-bg-muted)] z-10">Student</th>
              {subjects.map((sub) => (
                <th key={sub} className="text-left p-2 font-medium">{sub}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((stu) => (
              <tr key={stu.student_id} className="border-b border-[var(--ac-border)] hover:bg-[var(--ac-bg-muted)]/50">
                <td className="p-2 sticky left-0 bg-[var(--ac-bg)] z-10 font-medium">{stu.name}</td>
                {subjects.map((sub) => {
                  const { marks, total } = getCell(stu.student_id, sub);
                  return (
                    <td key={sub} className="p-1">
                      <input
                        type="number"
                        min={0}
                        max={total || 100}
                        step={1}
                        className="w-16 rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1 ac-text-primary text-center"
                        placeholder="—"
                        value={marks ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          setCell(stu.student_id, sub, v, total || 100);
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="ac-glass-btn-primary rounded-xl px-4 py-2 text-sm font-medium"
          onClick={handleSave}
          disabled={saving || Object.keys(edits).length === 0}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saveSuccess && <span className="ac-text-success text-sm">Saved.</span>}
        {saveError && <span className="text-red-500 dark:text-red-400 text-sm">{saveError}</span>}
      </div>
    </div>
  );
}
