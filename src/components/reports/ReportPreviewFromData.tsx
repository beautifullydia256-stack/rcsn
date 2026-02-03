/**
 * Renders one report using the ported primary templates (Template1–5, SecondaryReportPreview).
 * Uses getTemplateForClass so each class gets its assigned template.
 */
import { getTemplateForClass } from '../../templates/primary';
import { ReportPreview } from './templates/primaryReportTemplates';

type ReportPreviewFromDataProps = {
  reportData: any;
  /** Template key (e.g. 'template4'). If not set, derived from reportData.students[0].current_class via getTemplateForClass. */
  templateKey?: string;
};

const defaultReportTitleSettings = {
  title_template: "STUDENT'S PROGRESSIVE REPORT OF TERM {term}",
  use_dynamic_term: true,
};

export function ReportPreviewFromData({ reportData, templateKey }: ReportPreviewFromDataProps) {
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
  // Template4 expects student.subjects (subject_name, eot_marks, teacher_name, etc.). Derive from results if missing.
  const subjects =
    raw.subjects && Array.isArray(raw.subjects) && raw.subjects.length > 0
      ? raw.subjects
      : (() => {
          const bySubject = new Map<
            string,
            { subject_name: string; eot_marks: any; mot_marks: any; bot_marks: any; eot_grade: string; mot_grade: string; bot_grade: string; total_marks: number; teacher_comment: string; teacher_name: string }
          >();
          for (const r of results) {
            const sub = r.subject ?? '';
            if (!sub) continue;
            const marks = r.marks_obtained ?? r.final_score ?? '';
            const grade = r.grade ?? '';
            const total = Number(r.total_marks ?? 100);
            const teacherComment = r.teacher_comment || r.remarks || r.overall_remark || r.teacher_remark || '';
            const teacherName = r.teacher_initials ?? '';
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
  const student = {
    ...raw,
    results,
    subjects,
    summary: raw.summary ?? {},
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
    />
  );
}
