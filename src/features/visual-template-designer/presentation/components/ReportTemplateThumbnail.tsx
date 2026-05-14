/**
 * ReportTemplateThumbnail
 *
 * Renders a scaled-down preview of an actual system report template
 * (primary or secondary) using the same React components that generate PDFs.
 * Wrapped in an ErrorBoundary so a bad sample never breaks the page.
 */
import React, { Component } from 'react';
import { ReportPreview } from '@/components/reports/templates/primaryReportTemplates';
import { SecondaryBuiltInHtmlPreview } from '@/components/reports/SecondaryBuiltInHtmlPreview';

// ─── Sample data ─────────────────────────────────────────────────────────────
// Enough data to make the templates render without crashing.

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
      { subject: 'Mathematics',        marks_obtained: 85, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: '' },
      { subject: 'English Language',   marks_obtained: 72, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: '' },
      { subject: 'Science',            marks_obtained: 68, out_of: 100, grade: 'C3', remarks: 'Good',        teacher_comment: '' },
      { subject: 'Social Studies',     marks_obtained: 75, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: '' },
      { subject: 'Religious Educ.',    marks_obtained: 80, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: '' },
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

// Map each system template ID to the class name ReportPreview uses to pick
// the right sub-renderer, and the template key (strips 'primary_' prefix).
const PRIMARY_TEMPLATE_META: Record<string, { cls: string; key: string }> = {
  primary_template1: { cls: 'Baby Class', key: 'template1' },
  primary_template2: { cls: 'Middle Class', key: 'template2' },
  primary_template3: { cls: 'P.3', key: 'template3' },
  primary_template4: { cls: 'P.6', key: 'template4' },
  primary_template5: { cls: 'P.4', key: 'template5' },
  primary_template6: { cls: 'Baby Class', key: 'template6' },
};

const SECONDARY_TEMPLATE_META: Record<string, string> = {
  secondary_template1: 'template1',
  secondary_template2: 'template2',
  secondary_template3: 'template3',
  secondary_template4: 'template4',
};

// ─── Error boundary ───────────────────────────────────────────────────────────

interface EBState { hasError: boolean }

class ThumbnailErrorBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ─── Fallback card ────────────────────────────────────────────────────────────

function FallbackThumbnail({ name, isPrimary }: { name: string; isPrimary: boolean }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: isPrimary ? '#f0fdf4' : '#eef2ff',
      border: `1px solid ${isPrimary ? '#86efac' : '#a5b4fc'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: 8, boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 28 }}>{isPrimary ? '📋' : '📄'}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', textAlign: 'center' as const, lineHeight: 1.3 }}>{name}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReportTemplateThumbnailProps {
  templateId: string;  // e.g. 'primary_template3' or 'secondary_template1'
  templateName: string;
  /** Width of the thumbnail container in px. Height is auto-calculated for A4 ratio. */
  width?: number;
}

export function ReportTemplateThumbnail({ templateId, templateName, width = 200 }: ReportTemplateThumbnailProps) {
  const isPrimary = templateId.startsWith('primary_');
  const height = Math.round(width * (297 / 210)); // A4 aspect ratio

  // Scale factor: A4 at 96dpi is ~794px wide; we scale to 'width' px.
  const A4_PX = 794;
  const scale = width / A4_PX;

  const fallback = <FallbackThumbnail name={templateName} isPrimary={isPrimary} />;

  const containerStyle: React.CSSProperties = {
    width,
    height,
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 4,
    background: '#fff',
  };

  const innerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: A4_PX,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    pointerEvents: 'none',
  };

  if (isPrimary) {
    const meta = PRIMARY_TEMPLATE_META[templateId];
    if (!meta) return <div style={containerStyle}>{fallback}</div>;

    const student = makeSampleStudent(meta.cls);
    return (
      <div style={containerStyle}>
        <ThumbnailErrorBoundary fallback={<div style={{ width: '100%', height: '100%' }}>{fallback}</div>}>
          <div style={innerStyle}>
            <ReportPreview
              student={student}
              examSet={SAMPLE_EXAM_SET}
              school={SAMPLE_SCHOOL}
              template={meta.key}
              reportTitleSettings={SAMPLE_TITLE_SETTINGS}
              currentTermInfo={SAMPLE_TERM}
            />
          </div>
        </ThumbnailErrorBoundary>
      </div>
    );
  } else {
    // Secondary — use SecondaryBuiltInHtmlPreview with usePlaceholderData
    const secKey = SECONDARY_TEMPLATE_META[templateId];
    if (!secKey) return <div style={containerStyle}>{fallback}</div>;

    return (
      <div style={containerStyle}>
        <ThumbnailErrorBoundary fallback={<div style={{ width: '100%', height: '100%' }}>{fallback}</div>}>
          <div style={innerStyle}>
            <SecondaryBuiltInHtmlPreview
              student={{}}
              examSet={{}}
              school={SAMPLE_SCHOOL}
              templateKey={secKey}
              usePlaceholderData
            />
          </div>
        </ThumbnailErrorBoundary>
      </div>
    );
  }
}
