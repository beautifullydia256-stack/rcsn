/**
 * SystemTemplateBackground
 *
 * Renders the actual HTML report template at full A4 size (794px wide) as a
 * non-interactive background layer inside the canvas editor.  Canvas component
 * overlays are positioned on top so the user can drag/resize them while seeing
 * exactly how the final report will look.
 *
 * Wrapped in an error boundary so a render failure never breaks the editor.
 */
import React, { Component } from 'react';
import { ReportPreview } from '@/components/reports/templates/primaryReportTemplates';
const SecondaryBuiltInHtmlPreview: React.FC<any> = () => null;

// ─── Sample data (matches ReportTemplateThumbnail so the background looks
//     identical to the picker thumbnails) ────────────────────────────────────

const SAMPLE_SCHOOL = {
  name: "St. Mary's College",
  address: 'P.O. Box 1234, Kampala, Uganda',
  phone: '+256 700 123 456',
  email: 'info@school.ac.ug',
  motto: 'Excellence in Education',
  subtitle: 'Excellence in Education',
  logo_url: null,
};

const SAMPLE_EXAM_SET = {
  name: 'End of Term 1 Examinations 2025',
  term: 1,
  year: 2025,
  date: '2025-07-04',
};

const SAMPLE_TITLE_SETTINGS = {
  title_template: "STUDENT'S PROGRESSIVE REPORT",
  use_dynamic_term: false,
};

const SAMPLE_TERM = { term: 1, year: 2025, next_term_begins: '2025-09-10' };

function makeSampleStudent(cls: string) {
  return {
    name: 'Grace Nakamya',
    full_name: 'Grace Nakamya',
    current_class: cls,
    admission_number: 'S/2025/001',
    student_id: 'S001',
    profile_photo: null,
    gender: 'F',
    date_of_birth: '2012-03-15',
    next_term_begins_date: '10th September 2025',
    report_date: '2025-07-04',
    results: [
      { subject: 'Mathematics',      marks_obtained: 85, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: '' },
      { subject: 'English Language', marks_obtained: 72, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: '' },
      { subject: 'Science',          marks_obtained: 68, out_of: 100, grade: 'C3', remarks: 'Good',        teacher_comment: '' },
      { subject: 'Social Studies',   marks_obtained: 75, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: '' },
      { subject: 'Religious Educ.',  marks_obtained: 80, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: '' },
    ],
    summary: {
      attendanceDetails: { present: 48, total_school_days: 52, absent: 4 },
      division: 'D1',
      performanceRemark: 'Excellent performance. Keep it up.',
      aggregate: 10,
      percentage: 76,
      classPosition: '3rd',
      classSize: 42,
      totalMarks: 380,
      outOf: 500,
    },
    comments: {
      class_teacher_comment: 'Keep up the excellent work.',
      class_teacher_name: 'Mr. Ssekandi Joseph',
      head_teacher_comment: 'An outstanding student.',
      head_teacher_name: 'Mrs. Nalubega Catherine',
    },
  };
}

// ─── Template meta maps ───────────────────────────────────────────────────────

const PRIMARY_META: Record<string, { cls: string; key: string }> = {
  primary_template1: { cls: 'Baby Class',    key: 'template1' },
  primary_template2: { cls: 'Middle Class',  key: 'template2' },
  primary_template3: { cls: 'P.3',           key: 'template3' },
  primary_template4: { cls: 'P.6',           key: 'template4' },
  primary_template5: { cls: 'P.4',           key: 'template5' },
  primary_template6: { cls: 'Baby Class',    key: 'template6' },
};

const SECONDARY_META: Record<string, string> = {
  secondary_template1: 'template1',
  secondary_template2: 'template2',
  secondary_template3: 'template3',
  secondary_template4: 'template4',
};

// ─── Error boundary ───────────────────────────────────────────────────────────

interface EBState { hasError: boolean }

class BgErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null; // Fail silently — canvas still works
    return this.props.children;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SystemTemplateBackgroundProps {
  systemTemplateId: string;
}

export function SystemTemplateBackground({ systemTemplateId }: SystemTemplateBackgroundProps) {
  const isPrimary = systemTemplateId.startsWith('primary_');

  // Full-bleed non-interactive layer — canvas zoom is handled by the parent canvas div
  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 794,
    pointerEvents: 'none',
    zIndex: 0,
    userSelect: 'none',
  };

  if (isPrimary) {
    const meta = PRIMARY_META[systemTemplateId];
    if (!meta) return null;
    const student = makeSampleStudent(meta.cls);
    return (
      <BgErrorBoundary>
        <div style={wrapStyle}>
          <ReportPreview
            student={student}
            examSet={SAMPLE_EXAM_SET}
            school={SAMPLE_SCHOOL}
            template={meta.key}
            reportTitleSettings={SAMPLE_TITLE_SETTINGS}
            currentTermInfo={SAMPLE_TERM}
          />
        </div>
      </BgErrorBoundary>
    );
  }

  const secKey = SECONDARY_META[systemTemplateId];
  if (!secKey) return null;
  return (
    <BgErrorBoundary>
      <div style={wrapStyle}>
        <SecondaryBuiltInHtmlPreview
          student={{}}
          examSet={{}}
          school={SAMPLE_SCHOOL}
          templateKey={secKey}
          usePlaceholderData
        />
      </div>
    </BgErrorBoundary>
  );
}
