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
  const results = rawResults.map((r: any) => ({
    ...r,
    final_score: r.final_score ?? r.marks_obtained,
    overall_remark: r.overall_remark ?? r.remarks ?? r.teacher_comment ?? '',
    remark: r.remark ?? r.overall_remark ?? r.remarks ?? r.teacher_comment ?? '',
  }));
  const student = {
    ...raw,
    results,
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
