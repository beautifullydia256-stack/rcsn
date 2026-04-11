/**
 * A-Level (Senior 5–6) exam entry — marks table; persists via `teacher_upsert_exam_result_alevel`.
 */
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateUacePrincipalGradeFromMarks } from '@/lib/reportUtils';

type Student = { student_id: string; name: string };

type Existing = {
  student_id: string;
  marks_obtained?: number | null;
  total_marks?: number | null;
  grade?: string | null;
  remarks?: string | null;
};

export function SecondaryALevelExamGrid({
  students,
  schoolId,
  teacherId,
  className,
  subject,
  selectedExamSetId,
  existingRows,
  onRefetch,
  paperCode,
  paperNumber,
}: {
  students: Student[];
  schoolId: string;
  teacherId: string;
  className: string;
  subject: string;
  selectedExamSetId: string;
  existingRows: Existing[];
  onRefetch: () => void;
  /** UNEB code from `school_uace_class_subject_papers` when configured */
  paperCode?: string | null;
  /** Optional label / legacy paper number */
  paperNumber?: string | null;
}) {
  const [edits, setEdits] = useState<Record<string, { marks: string; remark: string }>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const byStudent = new Map<string, Existing>();
  existingRows.forEach((r) => byStudent.set(r.student_id, r));

  const getRow = (studentId: string) => {
    if (edits[studentId] !== undefined) return edits[studentId];
    const row = byStudent.get(studentId);
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
    if (!schoolId || !teacherId || !selectedExamSetId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const totalMarks = 100;
    try {
      const toSave = students
        .map((s) => ({ studentId: s.student_id, ...getRow(s.student_id) }))
        .filter((r) => r.marks !== '' || r.remark !== '');
      if (toSave.length === 0) {
        setSaveError('Enter at least one mark or remark.');
        setSaving(false);
        return;
      }

      for (const { studentId, marks, remark } of toSave) {
        const marksNum = parseFloat(marks) || 0;
        const { grade, remark: computedRemark } = calculateUacePrincipalGradeFromMarks(marksNum, totalMarks);
        const remarkToSave = remark.trim() || computedRemark;
        const { data, error } = await supabase.rpc('teacher_upsert_exam_result_alevel', {
          p_school_id: schoolId,
          p_exam_set_id: selectedExamSetId,
          p_student_id: studentId,
          p_class_name: className,
          p_subject: subject,
          p_marks_obtained: marksNum,
          p_total_marks: totalMarks,
          p_grade: grade,
          p_remarks: remarkToSave,
          p_teacher_id: teacherId,
          p_teacher_comment: remarkToSave,
          p_paper_number: paperNumber?.trim() || null,
          p_paper_code: paperCode?.trim() || null,
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
      setSaveSuccess(true);
      onRefetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="ac-text-primary text-sm font-medium">
        A-Level format: marks out of 100 with UACE principal grades (A–E, O, F). Paper line:{' '}
        <span className="font-semibold">
          {paperCode?.trim() || paperNumber?.trim() || 'default (single line per subject)'}
        </span>
      </p>
      <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)]">
        <table className="w-full min-w-[520px] border-collapse ac-text-primary text-sm">
          <thead>
            <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-bg-muted)]">
              <th className="w-[min-content] p-2 text-left font-medium">Student</th>
              <th className="w-28 p-2 text-left font-medium">Marks</th>
              <th className="w-28 p-2 text-left font-medium">Total</th>
              <th className="p-2 text-left font-medium">Grade</th>
              <th className="p-2 text-left font-medium">Remark</th>
            </tr>
          </thead>
          <tbody>
            {students.map((stu) => {
              const { marks, remark } = getRow(stu.student_id);
              const marksNum = parseFloat(marks) || 0;
              const { grade } = calculateUacePrincipalGradeFromMarks(marksNum, 100);
              return (
                <tr key={stu.student_id} className="border-b border-[var(--ac-border)]">
                  <td className="p-2 font-medium">{stu.name}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      className="w-24 rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1 text-center"
                      value={marks}
                      onChange={(e) => setRow(stu.student_id, 'marks', e.target.value)}
                    />
                  </td>
                  <td className="ac-text-muted p-2">100</td>
                  <td className="p-2">{marks !== '' ? grade : '—'}</td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-full max-w-xs rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1"
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
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="ac-glass-btn-primary rounded-xl px-4 py-2 text-sm font-medium"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Exam Results'}
        </button>
        {saveSuccess && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</span>}
        {saveError && <span className="text-sm text-red-600 dark:text-red-400">{saveError}</span>}
      </div>
    </div>
  );
}
