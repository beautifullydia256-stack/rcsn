/**
 * Renders one report using the ported primary templates (Template1–5, SecondaryReportPreview).
 * Uses getTemplateForClass so each class gets its assigned template.
 * Primary grades always use Subject Grade Boundaries (D1–F9), never A–F.
 */
import { getTemplateForClass } from '../../templates/primary';
import { ReportPreview } from './templates/primaryReportTemplates';
import { calculatePrimaryGrade } from '../../lib/reportUtils';
import type { NurseryDetailedObservationRow } from '../../templates/primary/prePrimaryDetailedCommentMapping';

type ReportPreviewFromDataProps = {
  reportData: any;
  /** Template key (e.g. 'template4'). If not set, derived from reportData.students[0].current_class via getTemplateForClass. */
  templateKey?: string;
  prePrimaryReportMode?: 'colour' | 'detailed';
  detailedObservationItemsByKey?: Record<string, NurseryDetailedObservationRow>;
};

const defaultReportTitleSettings = {
  title_template: "STUDENT'S PROGRESSIVE REPORT OF TERM {term}",
  use_dynamic_term: true,
};

export function ReportPreviewFromData({
  reportData,
  templateKey,
  prePrimaryReportMode = 'colour',
  detailedObservationItemsByKey,
}: ReportPreviewFromDataProps) {
  if (!reportData?.students?.[0]) return null;

  const raw = reportData.students[0];
  const comments = raw.comments ?? {};
  const rawResults = raw.results ?? [];
  const results = rawResults.map((r: any) => {
    const remark = r.overall_remark || r.teacher_remark || r.remarks || r.teacher_comment || '';
    return {
      ...r,
      final_score: r.final_score ?? r.marks_obtained,
      overall_remark: remark,
      remark: remark,
      teacher_remark: remark,
    };
  });
  // Primary: ensure grade is always D1–F9 (Subject Grade Boundaries), never A–F
  const toPrimaryGrade = (grade: string, marks: unknown, total: number): string => {
    const g = (grade ?? '').toString().trim();
    if (g && !['A', 'B', 'C', 'D', 'E', 'F'].includes(g.toUpperCase())) return g;
    const t = total > 0 ? total : 100;
    const m = Number(marks);
    if (marks !== '' && marks != null && !Number.isNaN(m)) return calculatePrimaryGrade(m, t).grade;
    return g || '';
  };

  // Template4 expects student.subjects (subject_name, eot_marks, teacher_name, etc.). Derive from results if missing.
  const subjects =
    raw.subjects && Array.isArray(raw.subjects) && raw.subjects.length > 0
      ? (raw.subjects as { subject_name?: string; eot_marks?: unknown; mot_marks?: unknown; bot_marks?: unknown; eot_grade?: string; mot_grade?: string; bot_grade?: string; total_marks?: number; teacher_comment?: string; teacher_name?: string }[]).map((s) => {
          const total = Number(s.total_marks) || 100;
          return {
            ...s,
            eot_grade: toPrimaryGrade(s.eot_grade ?? '', s.eot_marks, total),
            mot_grade: toPrimaryGrade(s.mot_grade ?? '', s.mot_marks, total),
            bot_grade: toPrimaryGrade(s.bot_grade ?? '', s.bot_marks, total),
          };
        })
      : (() => {
          const bySubject = new Map<
            string,
            { subject_name: string; eot_marks: any; mot_marks: any; bot_marks: any; eot_grade: string; mot_grade: string; bot_grade: string; total_marks: number; teacher_comment: string; teacher_name: string }
          >();
          for (const r of results) {
            const sub = r.subject ?? '';
            if (!sub) continue;
            const marks = r.marks_obtained ?? r.final_score ?? '';
            const total = Number(r.total_marks ?? 100);
            const teacherComment = r.teacher_comment || r.remarks || r.overall_remark || r.teacher_remark || '';
            const teacherName = r.teacher_initials ?? '';
            // Primary: grade MUST come from Subject Grade Boundaries (D1–F9), never A–F
            const rawGrade = (r.grade ?? '').toString().trim();
            const isAtoF = ['A', 'B', 'C', 'D', 'E', 'F'].includes(rawGrade.toUpperCase());
            const grade = (rawGrade && !isAtoF)
              ? rawGrade
              : (total > 0 && (marks !== '' && marks !== null))
                ? calculatePrimaryGrade(Number(marks) || 0, total).grade
                : rawGrade || '';
            if (!bySubject.has(sub)) {
              bySubject.set(sub, {
                subject_name: sub,
                eot_marks: marks,
                mot_marks: marks,
                bot_marks: '',
                eot_grade: grade,
                mot_grade: grade,
                bot_grade: '',
                total_marks: total,
                teacher_comment: teacherComment,
                teacher_name: teacherName,
              });
            } else {
              const existing = bySubject.get(sub)!;
              if (teacherComment) existing.teacher_comment = teacherComment;
              if (teacherName) existing.teacher_name = teacherName;
            }
          }
          return Array.from(bySubject.values());
        })();
  const att = raw.attendance as
    | { presentDays?: number | null; absentDays?: number | null; totalSchoolDays?: number | null; percentage?: number | null }
    | undefined;
  const summaryAtt = raw.summary as Record<string, unknown> | undefined;
  const student = {
    ...raw,
    results,
    subjects,
    summary: raw.summary ?? {},
    attendance: {
      presentDays: att?.presentDays ?? summaryAtt?.presentDays ?? summaryAtt?.days_present,
      absentDays: att?.absentDays ?? summaryAtt?.absentDays ?? summaryAtt?.days_absent,
      totalSchoolDays: att?.totalSchoolDays ?? summaryAtt?.totalSchoolDays ?? summaryAtt?.total_days,
      percentage: att?.percentage ?? summaryAtt?.attendancePercentage ?? summaryAtt?.attendance_percentage,
    },
    comments: {
      ...comments,
      head_teacher_text: comments.head_teacher_text ?? comments.headteacher_text ?? '',
      class_teacher_text: comments.class_teacher_text ?? comments.class_teacher_comment ?? '',
    },
    feesBalance: raw.fees?.balance ?? raw.feesBalance ?? 0,
  };
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  const className = student.current_class || '';

  const template = templateKey || getTemplateForClass(className);
  const currentTermInfo = examSet.term != null && examSet.year != null
    ? { term: examSet.term, year: examSet.year }
    : null;

  return (
    <ReportPreview
      student={student}
      examSet={examSet}
      school={school}
      template={template}
      reportTitleSettings={defaultReportTitleSettings}
      currentTermInfo={currentTermInfo}
      examSets={undefined}
      gradeSystem={undefined}
      prePrimaryReportMode={prePrimaryReportMode}
      detailedObservationItemsByKey={detailedObservationItemsByKey}
    />
  );
}
