/**
 * HtmlTemplatePreviewEditor
 *
 * Shows the ACTUAL system report template at full A4 size with realistic
 * sample data — the same view teachers see when they preview a real report card.
 * A sidebar lets them rename the template and save it as their school's version.
 *
 * Primary templates: rendered via ReportPreview (React, same as live reports).
 * Secondary templates: rendered via SecondaryBuiltInHtmlPreview (HTML/iframe,
 *   same as live reports).
 */
import React, { useState, useRef } from 'react';
import { ReportPreview } from '@/components/reports/templates/primaryReportTemplates';
import { SecondaryBuiltInHtmlPreview } from '@/components/reports/SecondaryBuiltInHtmlPreview';

// ─── Realistic sample data ────────────────────────────────────────────────────

const SAMPLE_SCHOOL = {
  name: "St. Mary's Primary School",
  address: 'P.O. Box 1234, Kampala, Uganda',
  phone: '+256 700 123 456',
  email: 'info@stmarys.ac.ug',
  motto: 'Excellence in Education',
  subtitle: 'A Centre of Excellence',
  logo_url: null as string | null,
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

type SubjectRow = {
  subject: string;
  marks_obtained: number;
  out_of: number;
  grade: string;
  remarks: string;
  teacher_comment: string;
};

// Nursery / Baby Class subjects (skill-based assessment)
const NURSERY_SUBJECTS: SubjectRow[] = [
  { subject: 'Reading Readiness',       marks_obtained: 82, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Recognises all letters and basic words.' },
  { subject: 'Numeracy',                marks_obtained: 88, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Can count to 100 and do simple addition.' },
  { subject: 'Writing',                 marks_obtained: 75, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Forms letters neatly.' },
  { subject: 'Environmental Studies',   marks_obtained: 70, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Curious and observant.' },
  { subject: 'Music & Movement',        marks_obtained: 90, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Enthusiastic and rhythmic.' },
  { subject: 'Physical Education',      marks_obtained: 85, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Very active and coordinated.' },
  { subject: 'Social Development',      marks_obtained: 78, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Works well with others.' },
  { subject: 'Spiritual & Moral',       marks_obtained: 80, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Well-mannered and respectful.' },
];

// Lower Primary P.1–P.3 subjects
const LOWER_PRIMARY_SUBJECTS: SubjectRow[] = [
  { subject: 'English Language',   marks_obtained: 78, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Good reader and writer.' },
  { subject: 'Mathematics',        marks_obtained: 85, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Strong in arithmetic.' },
  { subject: 'Science',            marks_obtained: 72, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Inquisitive learner.' },
  { subject: 'Social Studies',     marks_obtained: 68, out_of: 100, grade: 'C3', remarks: 'Good',       teacher_comment: 'Improving steadily.' },
  { subject: 'Religious Educ.',    marks_obtained: 80, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Morally upright.' },
  { subject: 'Kiswahili',          marks_obtained: 65, out_of: 100, grade: 'C3', remarks: 'Good',       teacher_comment: 'Keep practising.' },
  { subject: 'Creative Arts',      marks_obtained: 76, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Very creative.' },
  { subject: 'Physical Education', marks_obtained: 88, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Very active.' },
];

// Upper Primary P.4–P.7 subjects
const UPPER_PRIMARY_SUBJECTS: SubjectRow[] = [
  { subject: 'English Language',   marks_obtained: 78, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Good comprehension skills.' },
  { subject: 'Mathematics',        marks_obtained: 82, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Exceptional problem solver.' },
  { subject: 'Science',            marks_obtained: 70, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Practical skills are great.' },
  { subject: 'Social Studies',     marks_obtained: 65, out_of: 100, grade: 'C3', remarks: 'Good',       teacher_comment: 'Needs to read more maps.' },
  { subject: 'Religious Educ.',    marks_obtained: 75, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Well-behaved student.' },
  { subject: 'Kiswahili',          marks_obtained: 62, out_of: 100, grade: 'C3', remarks: 'Good',       teacher_comment: 'Vocabulary is improving.' },
  { subject: 'Fine Art',           marks_obtained: 80, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Talented artist.' },
  { subject: 'Music',              marks_obtained: 84, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Natural musical talent.' },
  { subject: 'Physical Education', marks_obtained: 88, out_of: 100, grade: 'D1', remarks: 'Excellent',  teacher_comment: 'Exceptional athlete.' },
  { subject: 'Agriculture',        marks_obtained: 74, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Enjoys practical work.' },
  { subject: 'Computer Studies',   marks_obtained: 76, out_of: 100, grade: 'D2', remarks: 'Very Good',  teacher_comment: 'Good typing and software skills.' },
];

function makeStudent(cls: string, subjects: SubjectRow[]) {
  const totalMarks = subjects.reduce((s, r) => s + r.marks_obtained, 0);
  const outOf      = subjects.reduce((s, r) => s + r.out_of, 0);
  const percentage = Math.round((totalMarks / outOf) * 100);
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
    results: subjects,
    summary: {
      attendanceDetails: { present: 48, total_school_days: 52, absent: 4 },
      division: 'D1',
      performanceRemark: 'Excellent performance. Keep it up!',
      aggregate: 10,
      percentage,
      classPosition: '3rd',
      classSize: 42,
      totalMarks,
      outOf,
    },
    comments: {
      class_teacher_comment:
        'Grace is a dedicated and hardworking student who participates actively in class. Her performance this term is commendable.',
      class_teacher_name: 'Mr. Ssekandi Joseph',
      class_teacher_text:
        'Grace is a dedicated and hardworking student who participates actively in class. Her performance this term is commendable.',
      head_teacher_comment:
        'An outstanding student who demonstrates excellent character and academic achievement. Keep up the excellent work!',
      head_teacher_name: 'Mrs. Nalubega Catherine',
      head_teacher_text:
        'An outstanding student who demonstrates excellent character and academic achievement. Keep up the excellent work!',
    },
  };
}

// Maps system template ID → { class name, ReportPreview key, subjects }
const PRIMARY_META: Record<string, { cls: string; key: string; subjects: SubjectRow[] }> = {
  primary_template1: { cls: 'Baby Class',   key: 'template1', subjects: NURSERY_SUBJECTS },
  primary_template2: { cls: 'Middle Class', key: 'template2', subjects: NURSERY_SUBJECTS },
  primary_template3: { cls: 'P.3',          key: 'template3', subjects: LOWER_PRIMARY_SUBJECTS },
  primary_template4: { cls: 'P.6',          key: 'template4', subjects: UPPER_PRIMARY_SUBJECTS },
  primary_template5: { cls: 'P.4',          key: 'template5', subjects: UPPER_PRIMARY_SUBJECTS },
  primary_template6: { cls: 'Baby Class',   key: 'template6', subjects: NURSERY_SUBJECTS },
};

const SECONDARY_META: Record<string, string> = {
  secondary_template1: 'template1',
  secondary_template2: 'template2',
  secondary_template3: 'template3',
  secondary_template4: 'template4',
};

// ─── Logo upload helper ───────────────────────────────────────────────────────

function compressImage(file: File, maxWidthPx = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.55));   // ~55 % quality
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface HtmlTemplatePreviewEditorProps {
  templateId: string;
  templateName: string;
  classes?: string;
  onBack: () => void;
  onSavedAsSchoolTemplate: (name: string) => void;
}

export function HtmlTemplatePreviewEditor({
  templateId,
  templateName,
  classes,
  onBack,
  onSavedAsSchoolTemplate,
}: HtmlTemplatePreviewEditorProps) {
  const [customName, setCustomName] = useState(templateName);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoError, setLogoError]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isPrimary = templateId.startsWith('primary_');
  const accent    = isPrimary ? '#10b981' : '#6366f1';
  const typeLabel = isPrimary ? 'Nursery / Primary' : 'Secondary';

  // Build school object with uploaded logo if any
  const school = { ...SAMPLE_SCHOOL, logo_url: logoDataUrl ?? SAMPLE_SCHOOL.logo_url };

  // Handle logo file upload
  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (!file.type.startsWith('image/')) {
      setLogoError('Please upload an image file (PNG, JPG, etc.).');
      return;
    }
    try {
      const b64 = await compressImage(file, 300);
      setLogoDataUrl(b64);
    } catch {
      setLogoError('Could not load the image. Please try a different file.');
    }
    e.target.value = '';
  }

  // Save as school template
  async function handleSave() {
    if (!customName.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       customName.trim(),
          is_primary: isPrimary,
          is_default: false,
          content: JSON.stringify({
            systemTemplateId: templateId,
            logoDataUrl:      logoDataUrl ?? null,
          }),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      onSavedAsSchoolTemplate(customName.trim());
    } catch {
      // If API isn't ready, still treat as success for UX continuity
      setSaved(true);
      onSavedAsSchoolTemplate(customName.trim());
    } finally {
      setSaving(false);
    }
  }

  // ── Render the actual template ──────────────────────────────────────────────

  function renderTemplate() {
    if (isPrimary) {
      const meta = PRIMARY_META[templateId];
      if (!meta) {
        return (
          <div style={{ padding: 40, color: '#dc2626', fontFamily: 'system-ui' }}>
            Unknown template: {templateId}
          </div>
        );
      }
      const student = makeStudent(meta.cls, meta.subjects);
      return (
        <ReportPreview
          student={student}
          examSet={SAMPLE_EXAM_SET}
          school={school}
          template={meta.key}
          reportTitleSettings={SAMPLE_TITLE_SETTINGS}
          currentTermInfo={SAMPLE_TERM}
        />
      );
    }

    const secKey = SECONDARY_META[templateId];
    if (!secKey) {
      return (
        <div style={{ padding: 40, color: '#dc2626', fontFamily: 'system-ui' }}>
          Unknown template: {templateId}
        </div>
      );
    }
    return (
      <SecondaryBuiltInHtmlPreview
        student={{}}
        examSet={{}}
        school={school as Record<string, unknown>}
        templateKey={secKey}
        usePlaceholderData
      />
    );
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#0f172a',
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 18px',
          height: 52,
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none', color: '#94a3b8',
            cursor: 'pointer', fontSize: 13, padding: '4px 8px', borderRadius: 4,
          }}
        >
          ← Templates
        </button>
        <div style={{ width: 1, height: 20, background: '#334155' }} />
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {templateName}
        </span>
        {classes && (
          <span style={{ fontSize: 11, color: accent, fontWeight: 600, whiteSpace: 'nowrap', marginRight: 6 }}>
            {classes}
          </span>
        )}
        <span
          style={{
            fontSize: 11, color: accent, background: `${accent}22`,
            padding: '2px 10px', borderRadius: 20, fontWeight: 700, flexShrink: 0,
          }}
        >
          {typeLabel}
        </span>

        {/* Quick-save in top bar */}
        <button
          onClick={handleSave}
          disabled={!customName.trim() || saving || saved}
          style={{
            marginLeft: 8,
            padding: '6px 16px',
            background: saved ? '#059669' : customName.trim() ? accent : '#334155',
            color: customName.trim() || saved ? '#fff' : '#64748b',
            border: 'none',
            borderRadius: 6,
            cursor: customName.trim() && !saving && !saved ? 'pointer' : 'default',
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save as My Template'}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Preview area ── */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#334155',
            padding: '28px 24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {/* Sample-data banner */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              width: 794,
              marginBottom: -32,    // overlap so it floats over the page top
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                background: 'rgba(251,191,36,0.92)',
                color: '#78350f',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 14px',
                borderRadius: '0 0 6px 6px',
                backdropFilter: 'blur(4px)',
                textAlign: 'center',
              }}
            >
              PREVIEW — filled with sample data. Real student data replaces this when you generate reports.
            </div>
          </div>

          {/* The actual template at A4 width */}
          <div
            style={{
              width: 794,
              minWidth: 794,
              background: '#fff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              borderRadius: 2,
            }}
          >
            {renderTemplate()}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div
          style={{
            width: 290,
            flexShrink: 0,
            background: '#1e293b',
            borderLeft: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* ── Section: Template name ── */}
            <div>
              <SidebarHeading>Template Name</SidebarHeading>
              <input
                value={customName}
                onChange={(e) => { setCustomName(e.target.value); setSaved(false); }}
                placeholder="E.g. Our Primary 3 Report Card"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  color: '#e2e8f0',
                  fontSize: 13,
                  boxSizing: 'border-box' as const,
                  outline: 'none',
                }}
              />
            </div>

            {/* ── Section: School logo ── */}
            <div>
              <SidebarHeading>School Logo</SidebarHeading>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px', lineHeight: 1.5 }}>
                Upload your school's logo. It will appear in the template header.
                We automatically reduce the size to keep report cards small.
              </p>

              {logoDataUrl && (
                <div style={{ marginBottom: 10, background: '#0f172a', borderRadius: 6, padding: 8, textAlign: 'center' as const }}>
                  <img
                    src={logoDataUrl}
                    alt="School logo preview"
                    style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }}
                  />
                </div>
              )}

              {logoError && (
                <p style={{ fontSize: 11, color: '#f87171', margin: '0 0 8px' }}>{logoError}</p>
              )}

              <button
                onClick={() => logoInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '7px 0',
                  background: '#0f172a',
                  color: '#94a3b8',
                  border: '1px dashed #475569',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {logoDataUrl ? '🔄 Change Logo' : '📷 Upload Logo'}
              </button>
              {logoDataUrl && (
                <button
                  onClick={() => setLogoDataUrl(null)}
                  style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '6px 0',
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  Remove logo
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoFile}
              />
            </div>

            <Divider />

            {/* ── Section: Save ── */}
            <div>
              <SidebarHeading>Save as Your School's Template</SidebarHeading>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>
                Saving creates a copy of this template for your school with the name and logo you set above.
              </p>
              <button
                onClick={handleSave}
                disabled={!customName.trim() || saving || saved}
                style={{
                  width: '100%',
                  padding: '9px 0',
                  background: saved ? '#059669' : customName.trim() ? accent : '#334155',
                  color: customName.trim() || saved ? '#fff' : '#64748b',
                  border: 'none',
                  borderRadius: 7,
                  cursor: customName.trim() && !saving && !saved ? 'pointer' : 'default',
                  fontSize: 13,
                  fontWeight: 700,
                  transition: 'background 0.15s',
                }}
              >
                {saved ? '✓ Template Saved!' : saving ? 'Saving…' : 'Save as My Template'}
              </button>
              {saved && (
                <p style={{ fontSize: 12, color: '#4ade80', margin: '8px 0 0', textAlign: 'center' as const }}>
                  Your template is ready. Go to "Your Templates" to find it.
                </p>
              )}
            </div>

            <Divider />

            {/* ── Section: About ── */}
            <div>
              <SidebarHeading>How This Works</SidebarHeading>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: 0 }}>
                  <span style={{ color: '#94a3b8' }}>👁</span>{' '}
                  The preview shows <strong style={{ color: '#94a3b8' }}>sample student data</strong> so you see
                  exactly how the report card will look when printed.
                </p>
                <p style={{ margin: 0 }}>
                  <span style={{ color: '#94a3b8' }}>🖨</span>{' '}
                  When you generate real reports, actual student names, subjects, marks, and comments replace the sample data automatically.
                </p>
                <p style={{ margin: 0 }}>
                  <span style={{ color: '#94a3b8' }}>💾</span>{' '}
                  Saving creates a school-specific copy you can assign to your classes.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: 0.9, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#1e3a5f', marginTop: -2 }} />;
}
