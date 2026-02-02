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
  const student = {
    ...raw,
    results: raw.results ?? [],
    summary: raw.summary ?? {},
    comments: raw.comments ?? {},
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
