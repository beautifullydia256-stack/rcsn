/**
 * O-Level (Senior 1–4) exam entry — same structure as legacy Next.js teacher exam page (commit ~250a17c):
 * Activity [0–3], Descriptor, Formative % cap (default 20), Exam [0–80], Final, Grade, Remark, Initials, Topic.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { assertTeacherUpsertRpcResult } from '@/lib/examResultsUtils';
import {
  calculateActivityDescriptor,
  calculateSecondaryLetterGrade,
} from '@/lib/secondaryExamScoring';

export type SecondaryOLevelExistingRow = {
  student_id: string;
  activity_score?: number | null;
  descriptor?: string | null;
  formative_score?: number | null;
  exam_score?: number | null;
  final_score?: number | null;
  overall_remark?: string | null;
  teacher_initials?: string | null;
  topic?: string | null;
  grade?: string | null;
};

type Student = { student_id: string; name: string };

export type OLevelSecondaryRow = {
  topic: string;
  activityScore: string;
  descriptor: string;
  formative: string;
  exam: string;
  final: string;
  grade: string;
  remark: string;
  initials: string;
};

const DEFAULT_REMARK_RANGES: { min_percent: number; max_percent: number; comment_text: string }[] = [
  { min_percent: 0, max_percent: 40, comment_text: 'Needs more effort. Try harder next time.' },
  { min_percent: 41, max_percent: 60, comment_text: 'Fair work. You can do better.' },
  { min_percent: 61, max_percent: 80, comment_text: 'Good work. Keep it up!' },
  { min_percent: 81, max_percent: 100, comment_text: 'Excellent! Keep shining!' },
];

const emptyRow = (topicFallback: string, initials: string): OLevelSecondaryRow => ({
  topic: topicFallback,
  activityScore: '',
  descriptor: '',
  formative: '',
  exam: '',
  final: '',
  grade: '',
  remark: '',
  initials,
});

export function SecondaryOLevelExamGrid({
  students,
  schoolId,
  teacherId,
  className,
  subject,
  selectedExamSetId,
  existingRows,
  onRefetch,
  defaultTeacherInitials = '',
}: {
  students: Student[];
  schoolId: string;
  teacherId: string;
  className: string;
  subject: string;
  selectedExamSetId: string;
  existingRows: SecondaryOLevelExistingRow[];
  onRefetch: () => void;
  defaultTeacherInitials?: string;
}) {
  const [topicFilter, setTopicFilter] = useState('');
  const [teacherInitials, setTeacherInitials] = useState(defaultTeacherInitials);
  const [oLevelFormativeMax, setOLevelFormativeMax] = useState(20);
  const [autoRemarkEnabled, setAutoRemarkEnabled] = useState(true);
  const [teacherRemarksRanges] = useState(DEFAULT_REMARK_RANGES);
  const [examResultsSecondary, setExamResultsSecondary] = useState<Record<string, OLevelSecondaryRow>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const topicFilterRef = useRef(topicFilter);
  topicFilterRef.current = topicFilter;

  const existingRowsSig = useMemo(
    () =>
      JSON.stringify(
        existingRows.map((r) => [
          r.student_id,
          r.activity_score,
          r.formative_score,
          r.exam_score,
          r.final_score,
          r.topic,
          r.overall_remark,
        ])
      ),
    [existingRows]
  );

  const mapDbToRow = useCallback(
    (r: SecondaryOLevelExistingRow, topicFb: string): OLevelSecondaryRow => {
      const act = r.activity_score != null ? String(r.activity_score) : '';
      const form = r.formative_score != null ? String(Math.trunc(Number(r.formative_score))) : '';
      const ex = r.exam_score != null ? String(Math.trunc(Number(r.exam_score))) : '';
      const fin = r.final_score != null ? String(Math.trunc(Number(r.final_score))) : '';
      const ai = (r.teacher_initials || defaultTeacherInitials || '').trim();
      const desc =
        r.descriptor ||
        (act !== '' ? calculateActivityDescriptor(parseFloat(act) || 0) : '');
      let grade = (r.grade || '').trim();
      if (!grade && fin !== '') grade = calculateSecondaryLetterGrade(parseFloat(fin) || 0);
      return {
        topic: (r.topic || topicFb).trim(),
        activityScore: act,
        descriptor: desc,
        formative: form,
        exam: ex,
        final: fin,
        grade,
        remark: (r.overall_remark || '').trim(),
        initials: ai,
      };
    },
    [defaultTeacherInitials]
  );

  useEffect(() => {
    const byStudent = new Map<string, SecondaryOLevelExistingRow>();
    existingRows.forEach((row) => byStudent.set(row.student_id, row));
    const next: Record<string, OLevelSecondaryRow> = {};
    const tf = topicFilterRef.current.trim();
    for (const stu of students) {
      const db = byStudent.get(stu.student_id);
      next[stu.student_id] = db
        ? mapDbToRow(db, '')
        : emptyRow(tf, defaultTeacherInitials);
    }
    setExamResultsSecondary(next);
  }, [students, existingRowsSig, selectedExamSetId, subject, mapDbToRow, defaultTeacherInitials]);

  const handleSecondaryChange = (studentId: string, field: keyof OLevelSecondaryRow, value: string) => {
    setExamResultsSecondary((prev) => {
      const current =
        prev[studentId] || emptyRow(topicFilter.trim(), teacherInitials || defaultTeacherInitials);
      if (field === 'topic' || field === 'remark') {
        return { ...prev, [studentId]: { ...current, [field]: value } };
      }
      let next: OLevelSecondaryRow = { ...current, [field]: value };
      const trunc1 = (n: number) => Math.trunc((n || 0) * 10) / 10;
      const trunc0 = (n: number) => Math.trunc(n || 0);

      if (field === 'activityScore') {
        next.activityScore = value;
      } else if (field === 'formative') {
        if (value === '') {
          next.formative = '';
          next.activityScore = '';
        } else {
          let f = Math.max(0, Math.min(oLevelFormativeMax, parseFloat(value) || 0));
          f = trunc0(f);
          const a = trunc1((f / oLevelFormativeMax) * 3);
          next.formative = String(f);
          next.activityScore = a.toFixed(1);
        }
      } else if (field === 'exam') {
        if (value === '') next.exam = '';
        else {
          let e = Math.max(0, Math.min(80, parseFloat(value) || 0));
          next.exam = String(trunc0(e));
        }
      }

      const aNum = Math.max(0, Math.min(3, parseFloat(next.activityScore)));
      const fNum = Math.max(0, Math.min(oLevelFormativeMax, parseFloat(next.formative)));
      const eNum = Math.max(0, Math.min(80, parseFloat(next.exam)));
      const aSafe = isNaN(aNum) ? 0 : aNum;
      const fSafe = isNaN(fNum) ? 0 : fNum;
      const eSafe = isNaN(eNum) ? 0 : eNum;
      next.descriptor = calculateActivityDescriptor(aSafe);
      const finalNum = trunc0(fSafe + eSafe);
      next.final = String(finalNum);
      next.grade = calculateSecondaryLetterGrade(finalNum);
      if (autoRemarkEnabled) {
        const trRule = teacherRemarksRanges.find((r) => finalNum >= r.min_percent && finalNum <= r.max_percent);
        next.remark = trRule?.comment_text || '';
      }
      next.initials = teacherInitials || next.initials;
      return { ...prev, [studentId]: next };
    });
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSecondaryBlur = (studentId: string, field: keyof OLevelSecondaryRow) => {
    setExamResultsSecondary((prev) => {
      const current = prev[studentId];
      if (!current) return prev;
      const trunc1 = (n: number) => Math.trunc((n || 0) * 10) / 10;
      const trunc0 = (n: number) => Math.trunc(n || 0);
      let next = { ...current };
      if (field === 'formative') {
        const f = Math.max(0, Math.min(oLevelFormativeMax, parseFloat(next.formative) || 0));
        next.formative = String(trunc0(f));
        const a = Math.max(0, Math.min(3, (f / oLevelFormativeMax) * 3));
        next.activityScore = trunc1(a).toFixed(1);
      } else if (field === 'activityScore') {
        const a = Math.max(0, Math.min(3, parseFloat(next.activityScore) || 0));
        next.activityScore = trunc1(a).toFixed(1);
        const f = Math.max(0, Math.min(oLevelFormativeMax, (a / 3) * oLevelFormativeMax));
        next.formative = String(trunc0(f));
      } else if (field === 'exam') {
        const e = Math.max(0, Math.min(80, parseFloat(next.exam) || 0));
        next.exam = String(trunc0(e));
      }
      const fnum = parseFloat(next.formative) || 0;
      const enum_ = parseFloat(next.exam) || 0;
      next.final = String(trunc0(fnum + enum_));
      next.grade = calculateSecondaryLetterGrade(trunc0(fnum + enum_));
      next.descriptor = calculateActivityDescriptor(parseFloat(next.activityScore) || 0);
      return { ...prev, [studentId]: next };
    });
  };

  const handleSave = async () => {
    if (!schoolId || !teacherId || !selectedExamSetId) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const entries = Object.entries(examResultsSecondary)
        .map(([studentId, data]) => ({ studentId, data }))
        .filter(({ data }) => {
          const a = parseFloat(data.activityScore);
          const f = parseFloat(data.formative);
          const e = parseFloat(data.exam);
          const hasNum = (!isNaN(a) && a > 0) || (!isNaN(f) && f > 0) || (!isNaN(e) && e > 0);
          const hasText =
            (data.topic && data.topic.trim() !== '') || (data.remark && data.remark.trim() !== '');
          return hasNum || hasText;
        });
      if (entries.length === 0) {
        setSaveError('Enter at least one score or topic for a student.');
        setSaving(false);
        return;
      }

      for (const { studentId, data } of entries) {
        const activityNum = parseFloat(data.activityScore) || 0;
        const descriptor = calculateActivityDescriptor(activityNum);
        const formativeCap = oLevelFormativeMax;
        const formativeNum =
          descriptor === 'Missed' ? 0 : Math.min(Math.max(parseFloat(data.formative) || 0, 0), formativeCap);
        const examNum =
          descriptor === 'Missed' ? 0 : Math.min(Math.max(parseFloat(data.exam) || 0, 0), 80);
        const finalNum = Math.trunc(formativeNum + examNum);
        const letterGrade = calculateSecondaryLetterGrade(finalNum);

        // p_grade included: single 17-arg RPC (p_teacher_id coerces from uuid); avoid duplicate DB overloads (PGRST203).
        const { data: rpcData, error } = await supabase.rpc('teacher_upsert_exam_result_secondary', {
          p_school_id: schoolId,
          p_exam_set_id: selectedExamSetId,
          p_student_id: studentId,
          p_class_name: className,
          p_subject: subject.trim(),
          p_activity_score: activityNum,
          p_descriptor: descriptor,
          p_formative_score: formativeNum,
          p_exam_score: examNum,
          p_final_score: finalNum,
          p_overall_remark: (data.remark || '').trim(),
          p_teacher_initials: (data.initials || teacherInitials || '').trim(),
          p_teacher_id: teacherId,
          p_topic: (data.topic || topicFilter || '').trim(),
          p_paper_code: null,
          p_paper_number: null,
          p_grade: letterGrade,
        });
        if (error) {
          setSaveError(error.message);
          setSaving(false);
          return;
        }
        try {
          assertTeacherUpsertRpcResult(rpcData);
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : 'Save failed');
          setSaving(false);
          return;
        }
      }

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
        O-Level format: Activity (0–3), Formative (max {oLevelFormativeMax}), Exam (0–80), Final (100%), Grade A–E.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="ac-text-muted">Topic (default for rows)</span>
          <input
            type="text"
            className="rounded-lg border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary min-w-[200px]"
            placeholder="e.g., 1 Classification"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="ac-text-muted">Your initials</span>
          <input
            type="text"
            className="w-24 rounded-lg border border-[var(--ac-border)] bg-[var(--ac-bg)] px-3 py-2 ac-text-primary"
            value={teacherInitials}
            onChange={(e) => setTeacherInitials(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="ac-text-muted">Formative cap</span>
          <input
            type="number"
            min={1}
            max={100}
            className="w-20 rounded-lg border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-2 ac-text-primary"
            value={oLevelFormativeMax}
            onChange={(e) =>
              setOLevelFormativeMax(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 20)))
            }
          />
        </label>
        <label className="flex items-center gap-2 text-sm ac-text-muted">
          <input
            type="checkbox"
            checked={autoRemarkEnabled}
            onChange={(e) => setAutoRemarkEnabled(e.target.checked)}
          />
          Auto remark from % bands
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--ac-border)]">
        <table className="w-full min-w-[900px] border-collapse ac-text-primary text-sm">
          <thead>
            <tr className="border-b border-[var(--ac-border)] bg-[var(--ac-bg-muted)]">
              <th className="text-left p-2 font-medium">Student</th>
              <th className="text-left p-2 font-medium">Topic</th>
              <th className="text-left p-2 font-medium">Activity [3]</th>
              <th className="text-left p-2 font-medium">Descriptor</th>
              <th className="text-left p-2 font-medium">Formative</th>
              <th className="text-left p-2 font-medium">Exam [80]</th>
              <th className="text-left p-2 font-medium">Final</th>
              <th className="text-left p-2 font-medium">Grade</th>
              <th className="text-left p-2 font-medium">Remark</th>
              <th className="text-left p-2 font-medium">Initials</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const row =
                examResultsSecondary[student.student_id] ||
                emptyRow(topicFilter, teacherInitials || defaultTeacherInitials);
              const missed = row.descriptor === 'Missed';
              return (
                <tr
                  key={student.student_id}
                  className={`border-b border-[var(--ac-border)] ${missed ? 'opacity-75' : ''}`}
                >
                  <td className="p-2 font-medium whitespace-nowrap">{student.name}</td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-40 rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1"
                      value={row.topic}
                      onChange={(e) =>
                        handleSecondaryChange(student.student_id, 'topic', e.target.value)
                      }
                      placeholder="Topic"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      max={3}
                      step={0.1}
                      className="w-20 rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1"
                      value={row.activityScore}
                      onChange={(e) =>
                        handleSecondaryChange(student.student_id, 'activityScore', e.target.value)
                      }
                      onBlur={() => handleSecondaryBlur(student.student_id, 'activityScore')}
                    />
                  </td>
                  <td className="p-2 ac-text-muted whitespace-nowrap">{row.descriptor || '—'}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      max={oLevelFormativeMax}
                      step={0.1}
                      className="w-24 rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1"
                      value={row.formative}
                      onChange={(e) =>
                        handleSecondaryChange(student.student_id, 'formative', e.target.value)
                      }
                      onBlur={() => handleSecondaryBlur(student.student_id, 'formative')}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      max={80}
                      step={0.5}
                      className="w-24 rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1"
                      value={row.exam}
                      onChange={(e) =>
                        handleSecondaryChange(student.student_id, 'exam', e.target.value)
                      }
                      onBlur={() => handleSecondaryBlur(student.student_id, 'exam')}
                    />
                  </td>
                  <td className="p-2">{row.final || '0'}</td>
                  <td className="p-2 font-medium">{row.grade || '—'}</td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="w-48 max-w-[12rem] rounded border border-[var(--ac-border)] bg-[var(--ac-bg)] px-2 py-1"
                      value={row.remark}
                      onChange={(e) =>
                        handleSecondaryChange(student.student_id, 'remark', e.target.value)
                      }
                      placeholder="Comment"
                    />
                  </td>
                  <td className="p-2 ac-text-muted whitespace-nowrap">
                    {row.initials || teacherInitials || '—'}
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
        {saveSuccess && <span className="text-emerald-600 dark:text-emerald-400 text-sm">Saved.</span>}
        {saveError && <span className="text-red-600 dark:text-red-400 text-sm">{saveError}</span>}
      </div>
    </div>
  );
}
