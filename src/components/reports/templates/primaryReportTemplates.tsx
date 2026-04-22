/**
 * Primary report templates ported from app/dashboard/admin/reports/generate (older system).
 * Template selection follows getTemplateForClass; each class uses its assigned template.
 */
import React, { useMemo } from 'react';
import {
  NURSERY_PERFORMANCE_OPTIONS,
  NURSERY_PERFORMANCE_COLOR_MAP,
  NURSERY_SKILL_GRID,
  resolveNurseryPerformanceValue,
  getReadableTextColor,
  applyAlphaToHex
} from '../../../templates/primary/nurseryPerformance';
import {
  FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS,
  FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS,
  isPrePrimaryNurseryClass,
} from '../../../templates/primary/prePrimaryHolisticRatings';
import { buildPrePrimaryDetailedSections } from '../../../templates/primary/prePrimaryDetailedCommentResolve';
import type { NurseryDetailedObservationRow } from '../../../templates/primary/prePrimaryDetailedCommentMapping';
import {
  runtimeStrandsToHolisticStrands,
  type PrePrimaryHolisticRuntimeConfig,
} from '../../../lib/prePrimaryHolisticDb';
import { PrePrimaryHolisticColourGrid } from '../../../templates/primary/prePrimaryHolisticReportGrid';
import type { PrePrimaryHolisticGradeEnum } from '../../../templates/primary/prePrimaryHolisticRatings';
import { lightenColor, isALevelClass, isOLevelClass, isLowerSectionPrimary } from './helpers';
import { formatAverageWhole, formatCurrency } from '../../../lib/reportUtils';
import { REPORT_HEADER_DEFAULTS } from '../../../lib/reportHeaderBrandingDefaults';
import { studentAgeLabelForReport } from '../../../lib/reportStudentAge';

/** Explicit fraction + % for attendance cards (stakeholder: counts not only %). */
function AttendanceCountsSupplement({
  attendance,
  summary,
}: {
  attendance: { percentage?: number | null; presentDays?: unknown; absentDays?: unknown; totalSchoolDays?: unknown };
  summary?: { attendancePercentage?: unknown };
}) {
  const pr = attendance.presentDays;
  const tot = attendance.totalSchoolDays;
  const pc =
    attendance.percentage ??
    (summary?.attendancePercentage != null && summary.attendancePercentage !== ''
      ? Number(summary.attendancePercentage)
      : null);
  if (typeof pr === 'number' && typeof tot === 'number' && tot > 0) {
    const pctLabel =
      pc != null && !Number.isNaN(Number(pc))
        ? Math.round(Number(pc))
        : Math.round((pr / tot) * 100);
    return (
      <div className="text-[8.4pt] text-slate-600 mt-0.5">
        {pr} present of {tot} school days ({pctLabel}%)
      </div>
    );
  }
  if (pc != null && !Number.isNaN(Number(pc)) && (pr == null || tot == null)) {
    return (
      <div className="text-[8.4pt] text-slate-600 mt-0.5">Attendance rate: {Math.round(Number(pc))}% (day counts not on record)</div>
    );
  }
  return null;
}

function ReportPreview({ student, examSet, school, template, reportTitleSettings, currentTermInfo, examSets, gradeSystem, prePrimaryReportMode = 'colour', detailedObservationItemsByKey, prePrimaryHolisticRuntimeConfig, teacherSkillRemarksByStrandSkill, compactPrePrimaryPdf = false }: { student: any; examSet: any; school: any; template: string; reportTitleSettings: any; currentTermInfo: any; examSets?: any[]; gradeSystem?: { grades?: Array<{ min: number; max: number; grade: string }>; divisions?: Array<{ min: number; max: number; division: string }> }; prePrimaryReportMode?: 'colour' | 'detailed'; detailedObservationItemsByKey?: Record<string, NurseryDetailedObservationRow>; prePrimaryHolisticRuntimeConfig?: PrePrimaryHolisticRuntimeConfig | null; teacherSkillRemarksByStrandSkill?: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>> | null; compactPrePrimaryPdf?: boolean }) {
  const cls = String(student.current_class || '');
  const isSecondaryTrack = isOLevelClass(cls) || isALevelClass(cls);
  const isLower = isLowerSectionPrimary(cls);

  // Primary/Nursery path (not O-Level / A-Level secondary)
  if (!isSecondaryTrack) {
    if (template === 'template3' || isLower) {
      return (
        <div className="report-preview-pdf-fonts-primary">
          <Template3KyoteraReport student={student} examSet={examSet} school={school} reportTitleSettings={reportTitleSettings} currentTermInfo={currentTermInfo} examSets={examSets} gradeSystem={gradeSystem} />
        </div>
      );
    }
    if (template === 'template4') {
      return (
        <div className="report-preview-pdf-fonts-primary">
          <Template4UpperSectionReport student={student} examSet={examSet} school={school} examSets={examSets} gradeSystem={gradeSystem} />
        </div>
      );
    }
    if (template === 'template5') {
      return <Template5CleanReportCard student={student} examSet={examSet} school={school} />;
    }
    // template6 (Baby Class Heritage) and default primary (nursery/middle/top) use Template2
    if (template === 'template6') {
      return (
        <Template2KasoziReport
          student={student}
          examSet={examSet}
          school={school}
          prePrimaryReportMode={prePrimaryReportMode}
          detailedObservationItemsByKey={detailedObservationItemsByKey}
          prePrimaryHolisticRuntimeConfig={prePrimaryHolisticRuntimeConfig}
          teacherSkillRemarksByStrandSkill={teacherSkillRemarksByStrandSkill}
          compactPrePrimaryPdf={compactPrePrimaryPdf}
        />
      );
    }
    return (
      <Template2KasoziReport
        student={student}
        examSet={examSet}
        school={school}
        prePrimaryReportMode={prePrimaryReportMode}
        detailedObservationItemsByKey={detailedObservationItemsByKey}
        prePrimaryHolisticRuntimeConfig={prePrimaryHolisticRuntimeConfig}
        teacherSkillRemarksByStrandSkill={teacherSkillRemarksByStrandSkill}
        compactPrePrimaryPdf={compactPrePrimaryPdf}
      />
    );
  }

  // O-Level/Secondary path
  switch (template) {
    case 'template1':
      return <Template1OLevelReport student={student} examSet={examSet} school={school} />;
    case 'template2':
      return (
        <Template2KasoziReport
          student={student}
          examSet={examSet}
          school={school}
          prePrimaryReportMode={prePrimaryReportMode}
          detailedObservationItemsByKey={detailedObservationItemsByKey}
          prePrimaryHolisticRuntimeConfig={prePrimaryHolisticRuntimeConfig}
          teacherSkillRemarksByStrandSkill={teacherSkillRemarksByStrandSkill}
          compactPrePrimaryPdf={compactPrePrimaryPdf}
        />
      );
    case 'template3':
      return (
        <div className="report-preview-pdf-fonts-primary">
          <Template3KyoteraReport student={student} examSet={examSet} school={school} reportTitleSettings={reportTitleSettings} currentTermInfo={currentTermInfo} examSets={examSets} gradeSystem={gradeSystem} />
        </div>
      );
    case 'template4':
      return (
        <div className="report-preview-pdf-fonts-primary">
          <Template4UpperSectionReport student={student} examSet={examSet} school={school} examSets={examSets} gradeSystem={gradeSystem} />
        </div>
      );
    case 'template5':
      return <Template5CleanReportCard student={student} examSet={examSet} school={school} />;
    default:
      return <Template1OLevelReport student={student} examSet={examSet} school={school} />;
  }
}


// Template 1 - O-Level Report Card (Exact format from sample)
function Template1OLevelReport({ student, examSet, school }: { student: any; examSet: any; school: any }) {
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avgGrade = student.summary.division ?? '';
  const displayDivision = (() => {
    if (typeof avgGrade !== 'string') return avgGrade;
    const trimmed = avgGrade.trim();
    if (trimmed.toLowerCase().startsWith('division')) {
      return trimmed.replace(/division\s*/i, '').trim();
    }
    return trimmed;
  })();
  const overallPerf = student.summary.performanceRemark ?? '';

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

  return (
    <div style={{ 
      fontFamily: 'Times New Roman, Arial, sans-serif',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '12mm',
      boxSizing: 'border-box'
    }} className="bg-white text-black print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-full">
      
      {/* WATERMARK */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 -z-10 pointer-events-none">
        <div className="w-[864px] h-[864px] border-2 border-gray-300 rounded-full flex items-center justify-center bg-gray-100">
          <div className="text-center text-9xl font-bold text-gray-400">
            SCHOOL<br/>LOGO
          </div>
        </div>
      </div>
      
      {/* HEADER - School Logo and Info Side by Side */}
      <div className="flex items-start justify-between mb-4">
        {/* School Logo - Left side */}
        <div className="w-48 h-48 flex items-center justify-center overflow-hidden border-0">
          {school?.logo_url || school?.logo ? (
            <img
              src={school.logo_url || school.logo}
              alt="School Logo"
              className="w-full h-full object-cover border-0"
            />
          ) : (
            <div className="text-center text-xs">
              <div className="font-bold">SCHOOL</div>
              <div className="font-bold">LOGO</div>
            </div>
          )}
        </div>
        
        {/* School Info - Right side */}
        <div className="text-center flex-1">
          {school?.name && (
            <div className="font-bold text-[22pt] uppercase tracking-wide leading-[1.1] mb-3 text-slate-900">
              {school.name}
            </div>
          )}
          {(school?.phone || school?.email || school?.address) && (
            <div className="text-[10pt] font-normal leading-relaxed mb-2 text-slate-700">
              {school?.address && <span className="font-medium">{school.address}</span>}
              {school?.address && (school?.phone || school?.email) && <span className="mx-2 text-slate-400">|</span>}
              {school?.phone && <span>Tel: <span className="font-medium">{school.phone}</span></span>}
              {school?.phone && school?.email && <span className="mx-2 text-slate-400">|</span>}
              {school?.email && <span>Email: <span className="font-medium">{school.email}</span></span>}
            </div>
          )}
          {school?.motto && (
            <div className="text-[11pt] font-normal italic text-slate-600 mt-2 leading-relaxed">
              &quot;{school.motto}&quot;
            </div>
          )}
        </div>
      </div>

      {/* REPORT TITLE */}
      <div className="text-center bg-green-600 text-white py-2.5 mb-5">
        <h1 className="text-[14pt] font-bold uppercase tracking-wide leading-tight">
          LEARNER'S END OF TERM REPORT CARD FOR TERM {examSet?.term || '2'}, {examSet?.year || '2025'}
        </h1>
      </div>

      {/* Student Info and Photo - Side by side */}
      <div className="flex justify-between items-start mb-3">
        {/* LEARNER INFO - Left side */}
        <div className="text-[11pt]">
        <div><strong>LNo.:</strong> {student.admission_number || student.student_id}</div>
        <div><strong>NAME:</strong> {student.name}</div>
        <div><strong>CLASS & STREAM:</strong> {student.current_class}</div>
        </div>
        
        {/* Student Photo - Right side */}
        <div className="w-20 h-24 border-2 border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden">
          {student.profile_photo ? (
            <img
              src={student.profile_photo}
              alt="Student Photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-xs text-gray-500">Photo</div>
          )}
        </div>
      </div>


      {/* SUBJECTS TABLE */}
      <table className="w-full mb-3" style={{ borderCollapse: 'collapse', fontSize: '9.5pt' }}>
        <thead>
          <tr>
            {['Subjects & Topics Covered','Activity Score [3]','Descriptor','Formative Score [20%]','Exam Score [80%]','Final Score [100%]','Grade','Overall Remark','Subject Teacher'].map(h => (
              <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#4CAF50', color: 'white', padding: '6px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(student.results?.length ?? 0) > 0 ? (
            (student.results || []).map((result: any, index: number) => {
              // O-Level or primary: support both activity_score/formative_score and marks_obtained/final_score
              const activity = result.activity_score ?? '';
              const activityNum = parseFloat(activity) || 0;
              const descriptor = result.descriptor || calculateDescriptor(activityNum);
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? result.marks_obtained ?? '';
              const finalNum = parseFloat(String(finalScore)) || 0;
              const gradeText = result.grade || calculateGrade(finalNum);
              const overallRemark = result.overall_remark ?? result.remarks ?? result.teacher_comment ?? '';
              const teacherInitials = result.teacher_initials ?? '';
              const topic = result.topic || '';
              
              return (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>
                    <div className="font-bold">{result.subject}</div>
                    <div className="text-[9pt] leading-snug mt-1">
                      {topic}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{activity}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{descriptor}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{formative}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{exam}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{finalScore}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{gradeText}</td>
                  <td className="text-[9pt]" style={{ border: '1px solid #000', padding: '4px' }}>{overallRemark}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{teacherInitials}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={9} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>N/A - Student did not sit for this term</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* COMMENTS & SIGNATURES (Reworked, remove average/overall text) */}
      <div className="mb-3 text-[10.5pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Class Teacher's Comment</h3>
        <div style={{ height: '48px', borderBottom: '1px solid #000', marginBottom: '6px' }} />
        <p>
          Name: {student.comments?.class_teacher_name || ''} | Signature: ____________________
        </p>

        <h3 className="text-[11pt] font-semibold mt-3 mb-1">Head Teacher's Comment</h3>
        <div style={{ height: '48px', borderBottom: '1px solid #000', marginBottom: '6px' }} />
        <p>
          Name: {student.comments?.head_teacher_name || ''} | Signature: ____________________
        </p>
      </div>


      {/* COMMENTS */}
      <div className="mb-4 text-[10pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Class Teacher's Comment</h3>
        <div style={{ height: '60px', borderBottom: '1px solid #000', marginBottom: '8px' }} />
        <p>Name: {student.comments?.class_teacher_name || ''} | Signature: ____________________</p>

        <h3 className="text-[11pt] font-semibold mt-3 mb-1">Head Teacher's Comment</h3>
        <div style={{ height: '60px', borderBottom: '1px solid #000', marginBottom: '8px' }} />
        <p>Name: {student.comments?.head_teacher_name || ''} | Signature: ____________________</p>
      </div>

      {/* Next Term removed for this template per request */}

      {/* Grading system & descriptions */}
      <div className="mb-4">
        <h3 className="text-[11pt] font-semibold">Grading System</h3>
        <p className="text-[10pt]"><strong>80 - A | 70 - B | 50 - C | 40 - D | 0 - E</strong></p>
        
        <h3 className="text-[11pt] font-semibold mt-2">Description</h3>
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0' }}>Grade</th>
              <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0' }}>Achievement Level</th>
              <th style={{ border: '1px solid #000', padding: '4px', background: '#f0f0f0' }}>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>A</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Exceptional</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>B</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Outstanding</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>C</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Satisfactory</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>D</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Basic</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '4px' }}>E</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Elementary</td>
              <td style={{ border: '1px solid #000', padding: '4px' }}>Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center text-[9pt] mt-4">
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '{school?.motto || 'Education the Future'}'</div>
      </div>
    </div>
  );
}

// Template 2 - St. Adrian Kasozi Secondary School Format
function Template2KasoziReport({
  student,
  examSet,
  school,
  prePrimaryReportMode = 'colour',
  detailedObservationItemsByKey,
  prePrimaryHolisticRuntimeConfig = null,
  teacherSkillRemarksByStrandSkill = null,
  compactPrePrimaryPdf = false,
}: {
  student: any;
  examSet: any;
  school: any;
  prePrimaryReportMode?: 'colour' | 'detailed';
  detailedObservationItemsByKey?: Record<string, NurseryDetailedObservationRow>;
  prePrimaryHolisticRuntimeConfig?: PrePrimaryHolisticRuntimeConfig | null;
  teacherSkillRemarksByStrandSkill?: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>> | null;
  /** Tighter skills grid for Heritage / PDF (single A4). */
  compactPrePrimaryPdf?: boolean;
}) {
  const isPrePrimary = isPrePrimaryNurseryClass(student?.current_class);
  const holisticStrands = useMemo(
    () =>
      prePrimaryHolisticRuntimeConfig
        ? runtimeStrandsToHolisticStrands(prePrimaryHolisticRuntimeConfig.strands)
        : FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS,
    [prePrimaryHolisticRuntimeConfig]
  );
  const ratingLevels = prePrimaryHolisticRuntimeConfig?.ratingLevels ?? null;
  const legendRatings = useMemo(() => {
    if (ratingLevels?.length) {
      return [...ratingLevels]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => ({ label: r.display_label, color: r.color_hex }));
    }
    return FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS.map((r) => ({ label: r.label, color: r.color }));
  }, [ratingLevels]);
  const useDetailedPrePrimary =
    isPrePrimary &&
    prePrimaryReportMode === 'detailed' &&
    detailedObservationItemsByKey &&
    Object.keys(detailedObservationItemsByKey).length > 0;

  const kidsFontStack = "'Baloo 2', 'Comic Sans MS', 'Comic Neue', 'Poppins', 'sans-serif'";
  const backgroundGradient = 'linear-gradient(135deg, #fff7ad 0%, #ffd1dc 40%, #c8f5ff 75%, #e7deff 100%)';
  /** Inner “paper” card — unchanged for nursery (only outer shell goes plain white for A4). */
  const innerPaperStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.97)',
    borderRadius: '26px',
    padding: '0.45cm 0.55cm 0.55cm',
    boxShadow: '0 30px 48px rgba(30,64,175,0.22)',
    position: 'relative',
    zIndex: 2,
  };

  const streamDisplay =
    student?.stream ||
    student?.current_stream ||
    student?.stream_name ||
    student?.class_stream ||
    student?.section ||
    'N/A';

  const reportDateDisplay = (() => {
    const raw = examSet?.date || student?.report_date || student?.summary?.reportDate;
    if (!raw) return 'N/A';
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleDateString();
  })();

  const contactEmail = school?.contact_email || school?.email || '';
  const contactPhone = school?.contact_phone || school?.phone || '';
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(' ');
  const headerMetaItems = [
    student?.current_class ? `Class: ${student.current_class}` : null,
    streamDisplay && streamDisplay !== 'N/A' ? `Stream: ${streamDisplay}` : null,
    examSet?.term ? `Term: ${examSet.term}` : null,
    examSet?.year ? `Year: ${examSet.year}` : null,
  ].filter(Boolean);

  return (
    <div
      className={`relative print:shadow-none print:rounded-none print:m-0 print:w-full print:min-h-full nursery-wrapper ${
        isPrePrimary ? 'print:!p-[12mm]' : 'print:p-0'
      }`}
      style={{
        fontFamily: kidsFontStack,
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: isPrePrimary ? '12mm' : '0.6cm',
        boxSizing: 'border-box',
        ...(isPrePrimary
          ? {
              backgroundColor: '#ffffff',
              backgroundImage: 'none',
              color: '#1f2937',
              borderRadius: '28px',
              overflow: 'hidden',
            }
          : {
              backgroundImage: backgroundGradient,
              color: '#1f2937',
              borderRadius: '28px',
              overflow: 'hidden',
            }),
      }}
    >
      {!isPrePrimary ? (
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-65"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 32%, rgba(255,255,255,0.45) 0%, transparent 55%)',
          }}
        />
      ) : null}
      {/* Entire report body above the decorative wash; otherwise static blocks sit under opacity-65 and look faint (especially top rows of the skills grid). */}
      <div className="relative z-10">
      <div className="relative z-10" style={innerPaperStyle}>
        <div
          className="print-header-container"
          style={{
            paddingTop: '0.3cm',
            paddingBottom: '0.12cm',
            paddingLeft: '0',
            paddingRight: '0.32cm',
            background: 'transparent',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          <div className="flex items-center" style={{ minHeight: '2cm', position: 'relative' }}>
            <div
              className="flex-shrink-0"
              style={{
                width: '120px',
                height: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                left: '0',
                marginLeft: '0',
              }}
            >
              {(school?.logo_url || school?.logo) ? (
                <img
                  src={school.logo_url || school.logo}
                  alt="School Logo"
                  className="w-full h-full object-contain"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <div
                  className="border border-gray-300 rounded flex items-center justify-center bg-gray-50"
                  style={{ width: '100%', height: '100%' }}
                >
                  <span style={{ fontSize: '9pt', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                    School<br />Logo
                  </span>
                </div>
              )}
            </div>

            <div
              className="flex-1 text-center"
              style={{ fontFamily: 'Times New Roman, serif', marginLeft: '120px', paddingLeft: '0.28cm' }}
            >
              {school?.name && (
                <h1
                  style={{
                    fontSize: '16pt',
                    fontWeight: 700,
                    fontFamily: kidsFontStack,
                    textTransform: 'uppercase',
                    letterSpacing: '0.045em',
                    lineHeight: '1.06',
                    marginBottom: '0.2cm',
                    color: school?.header_school_name_color || '#1e3a8a',
                    marginTop: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {school.name}
                </h1>
              )}

              {school?.subtitle && (
                <div
                  style={{
                    fontSize: '11pt',
                    fontFamily: kidsFontStack,
                    fontWeight: 500,
                    color: school?.header_subtitle_color || '#3b82f6',
                    marginBottom: '0.16cm',
                    lineHeight: '1.3',
                  }}
                >
                  {school.subtitle}
                </div>
              )}

              {addressLine && (
                <div
                  style={{
                    fontSize: '11pt',
                    fontFamily: kidsFontStack,
                    fontWeight: 600,
                    color: school?.header_address_color || '#1e40af',
                    marginBottom: '0.16cm',
                    lineHeight: '1.28',
                  }}
                >
                  {addressLine}
                </div>
              )}

              {(contactEmail || contactPhone) && (
                <div
                  style={{
                    fontSize: '10.6pt',
                    fontFamily: kidsFontStack,
                    fontWeight: 600,
                    color: school?.header_contact_color || '#1e40af',
                    marginBottom: '0.16cm',
                    lineHeight: '1.28',
                  }}
                >
                  {contactEmail && <span>{contactEmail}</span>}
                  {contactEmail && contactPhone && <span style={{ margin: '0 8px', color: '#64748b' }}>|</span>}
                  {contactPhone && <span>{contactPhone}</span>}
                </div>
              )}

              {school?.motto && (
                <div
                  style={{
                    fontSize: '10.2pt',
                    fontFamily: kidsFontStack,
                    fontStyle: 'italic',
                    fontWeight: 600,
                    color: school?.header_motto_color || '#2563eb',
                    marginBottom: '0.2cm',
                    lineHeight: '1.32',
                  }}
                >
                  &quot;{school.motto}&quot;
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              height: '1px',
              background: `linear-gradient(to right, ${school?.header_divider_color || '#1e3a8a'} 0%, ${
                school?.header_divider_color ? lightenColor(school.header_divider_color) : '#60a5fa'
              } 50%, ${school?.header_divider_color || '#1e3a8a'} 100%)`,
              marginTop: '0.2cm',
              marginBottom: '0.18cm',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          />

          <div className="text-center" style={{ marginBottom: '0.18cm' }}>
            <div
              className="inline-block"
              style={{
                padding: '7px 24px',
                borderRadius: '20px',
                fontSize: '9.4pt',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#0f172a',
                background: 'linear-gradient(135deg, rgba(255,244,209,0.95) 0%, rgba(204,238,255,0.95) 100%)',
                border: '2px solid rgba(30,64,175,0.25)',
                boxShadow: '0 10px 20px rgba(30,64,175,0.18)',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                fontFamily: kidsFontStack,
              }}
            >
              {isPrePrimary
                ? `${String(student?.current_class || 'Pre-primary').toUpperCase()} - TERMLY REPORT`
                : 'MIDDLE & TOP CLASS - TERMLY REPORT'}
            </div>
            {headerMetaItems.length > 0 && (
              <div
                style={{
                  fontSize: '7.5pt',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginTop: '4px',
                  color: '#1f2937',
                }}
              >
                {headerMetaItems.join(' • ')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 mb-5 text-[10.4pt]">
        <div
          className="flex items-start justify-between gap-[0.55rem]"
          style={{
            background: 'linear-gradient(120deg, rgba(255,246,207,0.95) 0%, rgba(255,214,235,0.95) 100%)',
            border: '4px solid rgba(30,64,175,0.18)',
            borderRadius: '20px',
            padding: '10px 16px',
            boxShadow: '0 16px 28px rgba(30,64,175,0.18)',
          }}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1">
            <div><strong className="text-blue-900 uppercase">Student's Name:</strong> {student.name}</div>
            <div><strong className="text-blue-900 uppercase">Year:</strong> {examSet?.year || new Date().getFullYear()}</div>
            <div><strong className="text-blue-900 uppercase">Stream:</strong> {streamDisplay}</div>
            <div><strong className="text-blue-900 uppercase">Class:</strong> {student.current_class}</div>
            <div><strong className="text-blue-900 uppercase">Age (years):</strong> {studentAgeLabelForReport(student, examSet)}</div>
            <div><strong className="text-blue-900 uppercase">Admission No:</strong> {student.admission_number || student.student_id}</div>
            <div><strong className="text-blue-900 uppercase">Term:</strong> {examSet?.term || 'N/A'}</div>
            <div><strong className="text-blue-900 uppercase">Report Date:</strong> {reportDateDisplay}</div>
          </div>
          <div className="w-[2.1cm] h-[2.9cm] border-2 border-blue-200 bg-white rounded-lg shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
            {student.profile_photo ? (
              <img
                src={student.profile_photo}
                alt="Student Photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                style={{
                  fontSize: '0.6rem',
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  background: 'rgba(226,232,240,0.35)',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                PHOTO
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5">
        {useDetailedPrePrimary ? (
          <>
            <h3 className="text-[12pt] font-bold mb-2">Beginning of Term — Detailed progress</h3>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255,244,209,0.94) 0%, rgba(204,238,255,0.94) 100%)',
                border: '4px solid rgba(30,64,175,0.18)',
                borderRadius: '20px',
                padding: '12px',
                boxShadow: '0 20px 36px rgba(30,64,175,0.18)',
              }}
            >
              {buildPrePrimaryDetailedSections(
                student.results,
                detailedObservationItemsByKey!,
                holisticStrands,
                ratingLevels
              ).map((sec) => (
                <div key={sec.sectionTitle} className="mb-4 print:page-break-inside-avoid last:mb-0">
                  <h4
                    className="text-[10.5pt] font-bold text-blue-900 mb-2"
                    style={{ fontFamily: kidsFontStack }}
                  >
                    {sec.sectionTitle}
                  </h4>
                  {sec.skills.map((sk) => (
                    <div
                      key={sk.skillKey}
                      className="mb-3 pl-1 border-l-4 border-blue-200/80"
                      style={{ breakInside: 'avoid' as const }}
                    >
                      <div className="text-[9.5pt] font-semibold text-slate-800 mb-0.5">{sk.skillLabel}</div>
                      {sk.promptText ? (
                        <div className="text-[8.5pt] text-slate-500 italic mb-1">{sk.promptText}</div>
                      ) : null}
                      <p className="text-[10pt] text-slate-900 leading-snug m-0">
                        {sk.notRecorded ? 'Not recorded for this assessment.' : sk.responseText}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-[7.5pt] text-slate-500 mt-3 leading-relaxed">
              This report uses the same ratings as the colour checklist. Where Good and Needs Improvement apply, wording may match until distinct lines are maintained in the catalogue.
            </p>
          </>
        ) : isPrePrimary ? (
          <div
            style={{
              width: '210mm',
              maxWidth: '100%',
              margin: '0 auto',
              boxSizing: 'border-box',
              padding: 'clamp(6px, 2vmin, 10mm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <h3 className="text-[12pt] font-bold mb-0">Developmental Skills Checklist</h3>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255,244,209,0.94) 0%, rgba(204,238,255,0.94) 100%)',
                border: '3px solid rgba(30,64,175,0.18)',
                borderRadius: '16px',
                padding: '6px',
                boxShadow: '0 12px 28px rgba(30,64,175,0.14)',
              }}
            >
              <PrePrimaryHolisticColourGrid
                holisticStrands={holisticStrands}
                results={student.results}
                ratingLevels={ratingLevels}
                fontFamily={kidsFontStack}
                observationItemsByKey={detailedObservationItemsByKey ?? null}
                teacherSkillRemarksByStrandSkill={teacherSkillRemarksByStrandSkill ?? null}
                pdfCompact={compactPrePrimaryPdf}
              />
            </div>
            <div
              className="flex flex-wrap items-center font-semibold"
              style={{
                gap: '12px',
                fontSize: '9.6pt',
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '14px',
                padding: '8px 12px',
                border: '2px dashed rgba(30,64,175,0.24)',
                boxShadow: '0 6px 14px rgba(30,64,175,0.1)',
                fontFamily: kidsFontStack,
              }}
            >
              {legendRatings.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #0f172a',
                      borderRadius: '50%',
                      background: color,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-[12pt] font-bold mb-2">Developmental Skills Checklist</h3>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255,244,209,0.94) 0%, rgba(204,238,255,0.94) 100%)',
                border: '4px solid rgba(30,64,175,0.18)',
                borderRadius: '20px',
                padding: '8px',
                boxShadow: '0 20px 36px rgba(30,64,175,0.18)',
              }}
            >
              <table
                className="w-full"
                style={{
                  borderCollapse: 'collapse',
                  fontSize: '10pt',
                  tableLayout: 'fixed',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                <tbody>
                  {NURSERY_SKILL_GRID.map((row, rowIdx) => (
                    <tr key={`nursery-skill-row-${rowIdx}`}>
                      {row.map((skill, colIdx) => {
                        if (!skill.label) {
                          return (
                            <td
                              key={`nursery-skill-${rowIdx}-${colIdx}`}
                              style={{
                                border: '2px solid rgba(148,163,184,0.35)',
                                padding: '8px 6px',
                                minHeight: '42px',
                                textAlign: 'center',
                                verticalAlign: 'middle',
                                background: '#ffffff'
                              }}
                            >
                              {'\u00A0'}
                            </td>
                          );
                        }

                        const performanceWord = resolveNurseryPerformanceValue(student, skill);
                        const fallbackColor = '#e2e8f0';
                        const accentColor = performanceWord ? NURSERY_PERFORMANCE_COLOR_MAP[performanceWord] : fallbackColor;
                        const hasPerformance = Boolean(performanceWord);
                        const textColor = getReadableTextColor(accentColor);
                        const gradientBackground = hasPerformance ? accentColor : '#f8fafc';
                        const labelColor = hasPerformance
                          ? (textColor === '#ffffff' ? 'rgba(255,255,255,0.88)' : 'rgba(15,23,42,0.92)')
                          : '#1f2937';
                        const cellBorderColor = hasPerformance ? accentColor : 'rgba(148,163,184,0.45)';
                        const cellShadow = hasPerformance
                          ? `0 16px 32px ${applyAlphaToHex(accentColor, 0.35)}`
                          : 'inset 0 0 0 1px rgba(148,163,184,0.25)';

                        return (
                          <td
                            key={`nursery-skill-${rowIdx}-${colIdx}`}
                            style={{
                              border: `2px solid ${cellBorderColor}`,
                              padding: '8px 6px',
                              minHeight: '48px',
                              textAlign: 'center',
                              fontWeight: 600,
                              verticalAlign: 'middle',
                              background: gradientBackground,
                              transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                              boxShadow: cellShadow
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minHeight: '40px', justifyContent: 'center' }}>
                              <span style={{ fontSize: '9pt', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 600, color: labelColor }}>
                                {skill.label}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="flex flex-wrap gap-6 items-center text-[9.6pt] mt-4"
              style={{
                background: 'rgba(255,255,255,0.8)',
                borderRadius: '16px',
                padding: '10px 14px',
                border: '2px dashed rgba(30,64,175,0.24)',
                boxShadow: '0 8px 18px rgba(30,64,175,0.12)',
              }}
            >
              {NURSERY_PERFORMANCE_OPTIONS.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2 font-semibold">
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '1px solid #1f2937',
                      borderRadius: '4px',
                      background: color
                    }}
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div
        className="mb-4 text-[10pt]"
        style={{
          background: 'linear-gradient(135deg, rgba(219,228,255,0.95) 0%, rgba(255,230,242,0.95) 100%)',
          border: '3px solid rgba(30,64,175,0.12)',
          borderRadius: '18px',
          padding: '12px 16px',
          boxShadow: '0 12px 28px rgba(30,64,175,0.14)',
        }}
      >
        <h3 className="text-[11pt] font-semibold mb-1 text-blue-900" style={{ letterSpacing: '0.03em' }}>
          Class Teacher's Comments:
        </h3>
        <p>{student.comments?.class_teacher_text || '..............................................................'}</p>
        <p>Signature: ______________________</p>

        <h3 className="text-[11pt] font-semibold mb-1 mt-4 text-blue-900" style={{ letterSpacing: '0.03em' }}>
          Headteacher's Comments:
        </h3>
        <p>{student.comments?.head_teacher_text || '..............................................................'}</p>
        <p>Signature: ______________________</p>
      </div>

      <div
        className="mb-4 text-[10pt]"
        style={{
          background: 'linear-gradient(135deg, rgba(207,255,226,0.92) 0%, rgba(223,255,204,0.92) 100%)',
          border: '3px solid rgba(30,64,175,0.12)',
          borderRadius: '18px',
          padding: '12px 16px',
          boxShadow: '0 10px 24px rgba(30,64,175,0.12)',
        }}
      >
        <p>
          <strong>Next term begins on:</strong>{' '}
          {student?.results?.[0]?.next_term_begins_date
            ? new Date(student.results[0].next_term_begins_date).toLocaleDateString()
            : '____________________'}
        </p>
      </div>

      </div>
    </div>
  );
}

// Template 3 - Kyotera Parents' Secondary School Format
function Template3KyoteraReport({ student, examSet, school, reportTitleSettings, currentTermInfo, examSets, gradeSystem }: { student: any; examSet: any; school: any; reportTitleSettings: any; currentTermInfo: any; examSets?: any[]; gradeSystem?: { grades?: Array<{ min: number; max: number; grade: string }>; divisions?: Array<{ min: number; max: number; division: string }> } }) {
  const reportDateDisplayLower = (() => {
    const raw = examSet?.date || student?.report_date || student?.summary?.reportDate;
    if (!raw) return 'N/A';
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return String(raw);
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();
  const attendance = student.summary.attendanceDetails || {};
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  // Default grading scales (same as Upper Section) for Grading System block
  const defaultGradeScale = [
    { min: 75, max: 100, grade: 'D1' },
    { min: 70, max: 74, grade: 'D2' },
    { min: 65, max: 69, grade: 'C3' },
    { min: 60, max: 64, grade: 'C4' },
    { min: 55, max: 59, grade: 'C5' },
    { min: 50, max: 54, grade: 'C6' },
    { min: 45, max: 49, grade: 'P7' },
    { min: 40, max: 44, grade: 'P8' },
    { min: 0, max: 39, grade: 'F9' }
  ];
  const defaultDivisionScale = [
    { min: 4, max: 12, division: 'Division 1' },
    { min: 13, max: 23, division: 'Division 2' },
    { min: 24, max: 29, division: 'Division 3' },
    { min: 30, max: 34, division: 'Division 4' },
    { min: 35, max: 36, division: 'U (Ungraded)' }
  ];
  const gradeScale = (gradeSystem?.grades && gradeSystem.grades.length > 0 ? gradeSystem.grades : defaultGradeScale)
    .map((range: { min: number; max: number; grade: string }) => ({
      min: Number(range.min),
      max: Number(range.max),
      grade: String(range.grade || '').toUpperCase()
    }))
    .sort((a: { min: number }, b: { min: number }) => b.min - a.min);
  const divisionScale = (gradeSystem?.divisions && gradeSystem.divisions.length > 0 ? gradeSystem.divisions : defaultDivisionScale)
    .map((range: { min: number; max: number; division: string }) => ({
      min: Number(range.min),
      max: Number(range.max),
      division: String(range.division || '')
    }))
    .sort((a: { min: number }, b: { min: number }) => a.min - b.min);
  
  // Generate report title based on settings
  const getReportTitle = () => {
    try {
      if (!reportTitleSettings) {
        return `STUDENT'S PROGRESSIVE REPORT OF ${currentTermInfo?.term ? `TERM ${currentTermInfo.term}` : 'TERM'}`;
      }
      
      let title = reportTitleSettings.title_template || 'STUDENT\'S PROGRESSIVE REPORT OF TERM {term}';
      
      if (reportTitleSettings.use_dynamic_term && currentTermInfo?.term) {
        title = title.replace('{term}', currentTermInfo.term.toString());
      }
      
      return title.toUpperCase();
    } catch (error) {
      console.warn('Error generating report title:', error);
      return `STUDENT'S PROGRESSIVE REPORT OF ${currentTermInfo?.term ? `TERM ${currentTermInfo.term}` : 'TERM'}`;
    }
  };
  
  // Teacher remarks are now pre-processed and stored in the processed_primary_exam_results table

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

  // Calculate identifier based on grade/score (Template 3 specific)
  const getIdentifier = (score: number) => {
    if (score >= 80) return '3'; // Accomplished
    if (score >= 60) return '2'; // Moderate
    if (score >= 50) return '1'; // Basic
    return ''; // Blank for absent
  };

  // Get grade based on score (Template 3 specific)
  const getGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'E';
  };

  // Helper functions to detect exam set types
  const isMid = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
  };
  
  const isEnd = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
  };

  // Resolve comments same as Upper Section: from result row first, then student.comments, then placeholder
  const endOfTermResult = (() => {
    const results = student?.results || [];
    const endResults = results.filter((r: any) => {
      const name = String(r.exam_set_name || r.exam_set || '').toLowerCase();
      return name.includes('end') || name.includes('final') || name.includes('eot');
    });
    return endResults.find((r: any) => r.headteacher_comment || r.class_teacher_comment) || endResults[0] || results[0] || null;
  })();
  const classTeacherCommentDisplay = (() => {
    const raw = (endOfTermResult?.class_teacher_comment || student?.comments?.class_teacher_text || student?.comments?.class_teacher_comment || (student as any)?.class_teacher_comment || '').toString().trim();
    return raw || 'Good progress. Keep it up.';
  })();
  const headTeacherCommentDisplay = (() => {
    const raw = (endOfTermResult?.headteacher_comment || student?.comments?.head_teacher_text || student?.comments?.head_teacher_comment || student?.comments?.headteacher_text || (student as any)?.head_teacher_comment || '').toString().trim();
    return raw || 'Approved.';
  })();

  // Determine which columns to show (same rule as Template4 / Primary 7 for consistency)
  // Mid Term only → show just Mid column; End of Term or Auto → show BOTH Mid and End columns.
  let showMidTermColumn = true;
  let showEndOfTermColumn = true;

  if (examSet && examSet.name) {
    const examSetName = String(examSet.name).toLowerCase();
    if (examSetName.includes('all exam sets') || examSetName === 'all exam sets') {
      showMidTermColumn = true;
      showEndOfTermColumn = true;
    } else if (isMid(examSet.name)) {
      // Mid Term selected: show only Mid Term column
      showMidTermColumn = true;
      showEndOfTermColumn = false;
    } else {
      // End of Term (or Auto) selected: show BOTH Mid and End columns so both tables appear
      showMidTermColumn = true;
      showEndOfTermColumn = true;
    }
  }

  const hdr = {
    name: school?.header_school_name_color || REPORT_HEADER_DEFAULTS.schoolName,
    subtitle: school?.header_subtitle_color || REPORT_HEADER_DEFAULTS.subtitle,
    address: school?.header_address_color || REPORT_HEADER_DEFAULTS.address,
    contact: school?.header_contact_color || REPORT_HEADER_DEFAULTS.contact,
    motto: school?.header_motto_color || REPORT_HEADER_DEFAULTS.motto,
    divider: school?.header_divider_color || REPORT_HEADER_DEFAULTS.divider,
    chipText: school?.header_chip_text_color || REPORT_HEADER_DEFAULTS.chipText,
    chipBg: school?.header_chip_background_color || REPORT_HEADER_DEFAULTS.chipBackground,
    chipBorder: school?.header_chip_border_color || REPORT_HEADER_DEFAULTS.chipBorder,
    meta: school?.header_meta_line_color || REPORT_HEADER_DEFAULTS.metaLine,
    contactSep: school?.header_contact_separator_color || REPORT_HEADER_DEFAULTS.contactSeparator,
  };

  return (
    <div
      className="relative px-[0.2cm] py-[0.25cm] bg-white text-slate-800"
      style={{ fontFamily: 'Times New Roman, Times, serif', fontSize: '10.2pt', lineHeight: 1.3, paddingTop: '0.08cm' }}
    >
      {school?.logo_url && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <img
            src={school.logo_url}
            alt="School Watermark"
            className="max-w-2xl w-[55%] opacity-20 object-contain"
          />
          </div>
      )}

      <div className="relative z-10">
        {/* PRINT-READY PROFESSIONAL HEADER */}
        <div 
          className="print-header-container"
          style={{
            paddingTop: '0.28cm',
            paddingBottom: '0.05cm',
            paddingLeft: '0',
            paddingRight: '0.32cm',
            background: 'transparent',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}
        >
          {/* Two-Column Layout */}
          <div className="flex items-center" style={{ minHeight: '2.1cm', position: 'relative' }}>
            {/* Left Column: Logo - Positioned at very left edge */}
            <div 
              className="flex-shrink-0"
              style={{
                width: '132px',
                height: '132px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                left: '0',
                marginLeft: '0'
              }}
            >
              {(school?.logo_url || school?.logo) ? (
            <img
                  src={school.logo_url || school.logo} 
              alt="School Logo"
                  className="w-full h-full object-contain"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          ) : (
                <div 
                  className="border border-gray-300 rounded flex items-center justify-center bg-gray-50"
                  style={{ width: '100%', height: '100%' }}
                >
                  <span style={{ fontSize: '9pt', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                    School<br/>Logo
                  </span>
            </div>
          )}
        </div>
        
            {/* Center Column: School Information - Starts where badge ends */}
            <div className="flex-1 text-center" style={{ fontFamily: 'Times New Roman, serif', marginLeft: '132px', paddingLeft: '0.3cm' }}>
              {/* School Name - Bold Sans-serif Title - Uses saved color */}
              {school?.name && (
                <h1 
                  style={{
                    fontSize: '16.5pt',
                    fontWeight: '700',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: '1.06',
                    marginBottom: '0.22cm',
                    color: hdr.name,
                    marginTop: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {school.name}
                </h1>
              )}

              {/* Subtitle - Serif Font - Uses saved color */}
              {school?.subtitle && (
                <div 
                  style={{
                    fontSize: '11pt',
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontWeight: '400',
                    color: hdr.subtitle,
                    marginBottom: '0.18cm',
                    lineHeight: '1.32'
                  }}
                >
                  {school.subtitle}
        </div>
              )}

              {/* Address with P.O.Box - Serif Font - Uses saved color */}
              {(school?.address || school?.pobox) && (
                <div 
                  style={{
                    fontSize: '11pt',
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontWeight: '600',
                    color: hdr.address,
                    marginBottom: '0.16cm',
                    lineHeight: '1.32'
                  }}
                >
                  {school?.address || ''}{school?.address && school?.pobox ? ' ' : ''}{school?.pobox || ''}
        </div>
              )}

              {/* Contact Information - Email | Phone - Serif Font - Uses saved color */}
              {(school?.contact_email || school?.contact_phone) && (
                <div 
                  style={{
                    fontSize: '11pt',
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontWeight: '600',
                    color: hdr.contact,
                    marginBottom: '0.16cm',
                    lineHeight: '1.32'
                  }}
                >
                  {school?.contact_email && <span>{school.contact_email}</span>}
                  {school?.contact_email && school?.contact_phone && <span style={{ margin: '0 8px', color: hdr.contactSep }}>|</span>}
                  {school?.contact_phone && <span>{school.contact_phone}</span>}
      </div>
              )}

              {/* Motto - Serif Font Bold Italic with Quotes - Uses saved color */}
              {school?.motto && (
                <div 
                  style={{
                    fontSize: '9.8pt',
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: '600',
                    color: hdr.motto,
                    marginBottom: '0.22cm',
                    lineHeight: '1.32',
                    letterSpacing: '0.02em'
                  }}
                >
                  &quot;{school.motto}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Elegant Divider Line - Uses saved color */}
          <div 
            style={{
              height: '1px',
              background: `linear-gradient(to right, ${hdr.divider} 0%, ${lightenColor(hdr.divider)} 50%, ${hdr.divider} 100%)`,
              marginTop: '0.22cm',
              marginBottom: '0.12cm',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          />

          {/* Report Type Banner */}
          <div className="text-center" style={{ marginBottom: '0.2cm' }}>
            <div 
              className="inline-block"
              style={{
                padding: '6px 20px',
                borderRadius: '18px',
                fontSize: '9pt',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: hdr.chipText,
                background: hdr.chipBg,
                border: `1px solid ${hdr.chipBorder}`,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              {getReportTitle()}
            </div>
            {(examSet?.name || examSet?.year) && (
              <div 
                style={{
                  fontSize: '7.4pt',
                  color: hdr.meta,
                  marginTop: '0.14cm',
                  fontWeight: '400'
                }}
              >
                {examSet?.name || 'Term Report'} - {examSet?.year || new Date().getFullYear()}
              </div>
            )}
          </div>
        </div>

        {/* Print Media Query Styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .print-header-container {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-top: 0.28cm !important;
              margin-bottom: 0.18cm !important;
            }
          }
        `}} />
      </div>

      <div className="relative z-10 space-y-3" style={{ marginTop: '0.2cm' }}>
      {/* STUDENT INFO — match PDF (generate.ts Template 3 student-block / student-grid) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '6px 10px',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            marginBottom: '3mm',
            background: '#f8fafc',
            minHeight: '28mm',
            fontSize: '10.2pt',
            lineHeight: 1.3,
            color: '#1e293b',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: '10px',
              rowGap: '4px',
              fontSize: '10.2pt',
              flex: 1,
            }}
          >
            <div>
              <strong style={{ color: '#1e3a8a' }}>Name:</strong> {student.name ?? ''}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Class:</strong> {student.current_class ?? ''}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Age (years):</strong> {studentAgeLabelForReport(student, examSet)}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Admission No:</strong>{' '}
              {student.admission_number ?? student.student_id ?? 'N/A'}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Term:</strong> {examSet?.term ?? 'N/A'} /{' '}
              {examSet?.year || new Date().getFullYear()}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Date:</strong> {reportDateDisplayLower}
            </div>
          </div>
          <div
            style={{
              width: '2.1cm',
              height: '2.9cm',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {student.profile_photo ? (
              <img src={student.profile_photo} alt="Student Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '8pt', color: '#94a3b8' }}>Photo</span>
            )}
          </div>
        </div>

      {/* SUBJECTS TABLE - Lower Section (P.1 - P.3) */}
        <div className="bg-white border border-blue-100/50 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-[9.8pt]">
          <thead>
              <tr className="bg-blue-100/70 text-blue-900 uppercase tracking-wide">
                <th className="border border-blue-100 px-2.5 py-2 text-center font-semibold">SUBJECT</th>
                <th className="border border-blue-100 px-2.5 py-2 text-center font-semibold">FULL MARKS</th>
                {showMidTermColumn && (
                  <th className="border border-blue-100 px-2.5 py-2 text-center font-semibold">MID TERM</th>
                )}
                {showEndOfTermColumn && (
                  <th className="border border-blue-100 px-2.5 py-2 text-center font-semibold">END OF TERM</th>
                )}
                <th className="border border-blue-100 px-2.5 py-2 text-center font-semibold">TEACHER'S REMARKS</th>
                <th className="border border-blue-100 px-2.5 py-2 text-center font-semibold">INITIALS</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const results = student.results || [];
              if (results.length === 0) {
                // Calculate colspan: SUBJECT + FULL MARKS + (MID TERM if shown) + (END OF TERM if shown) + REMARKS + INITIALS
                const colspan = 4 + (showMidTermColumn ? 1 : 0) + (showEndOfTermColumn ? 1 : 0);
                return (
                  <tr>
                    <td colSpan={colspan} className="border border-blue-100 px-3 py-2 text-center text-slate-600">No results available</td>
                  </tr>
                );
              }
              let totalFullMarks = 0;
              return (
                <>
                  {(() => {
                    // Use processed data structure - each row is already a subject with exam set info
                    const all = Array.isArray(student.results) ? student.results : [];
                    const isMid = (name: any) => {
                      const n = String(name || '').trim().toLowerCase();
                      return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
                    };
                    const isEnd = (name: any) => {
                      const n = String(name || '').trim().toLowerCase();
                      return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
                    };
                    
                    // Group results by subject
                    const subjectGroups: { [key: string]: { mid?: any; end?: any; mid_grade?: string; end_grade?: string; subject: string; total_marks: number; remarks: string; initials: string } } = {};
                    
                    all.forEach((r: any) => {
                      const subject = r.subject ?? '';
                      const examSetName = r.exam_set_name || '';
                      
                      if (!subjectGroups[subject]) {
                        subjectGroups[subject] = {
                          subject,
                          total_marks: r.total_marks ?? 100,
                          remarks: '',
                          initials: ''
                        };
                      }
                      
                      const tr = String(r.teacher_remark ?? '').trim();
                      const rm = String(r.remarks ?? '').trim();
                      const tc = String(r.teacher_comment ?? '').trim();
                      const gr = String(r.grade ?? '').trim().toUpperCase();
                      const marksNum = Number(r.marks_obtained);
                      const zeroish =
                        r.marks_obtained === 0 ||
                        r.marks_obtained === null ||
                        r.marks_obtained === '' ||
                        (!Number.isNaN(marksNum) && marksNum === 0);
                      const missedFlag = [tr, rm, tc].some((x) => x === 'MISSED') || gr === 'MISSED';
                      const isMissedEntry = zeroish && missedFlag;
                      const displayMarks = isMissedEntry ? 0 : (r.marks_obtained ?? '');
                      const displayGrade = r.grade ?? '';
                      
                      const remark = r.teacher_remark ?? r.remarks ?? r.teacher_comment ?? '';
                      const initials = r.teacher_initials ?? '';
                      if (isMid(examSetName)) {
                        subjectGroups[subject].mid = displayMarks;
                        subjectGroups[subject].mid_grade = displayGrade;
                        if (!isMissedEntry && remark) {
                          subjectGroups[subject].remarks = remark;
                          subjectGroups[subject].initials = initials;
                        } else if (isMissedEntry) {
                          subjectGroups[subject].initials = initials || subjectGroups[subject].initials;
                        }
                      } else if (isEnd(examSetName)) {
                        subjectGroups[subject].end = displayMarks;
                        subjectGroups[subject].end_grade = displayGrade;
                        if (!isMissedEntry && remark) {
                          subjectGroups[subject].remarks = remark;
                          subjectGroups[subject].initials = initials;
                        } else if (isMissedEntry) {
                          subjectGroups[subject].initials = initials || subjectGroups[subject].initials;
                        }
                      } else {
                        subjectGroups[subject].mid = displayMarks;
                        subjectGroups[subject].mid_grade = displayGrade;
                        subjectGroups[subject].end = displayMarks;
                        subjectGroups[subject].end_grade = displayGrade;
                        if (!isMissedEntry && remark) {
                          subjectGroups[subject].remarks = remark;
                          subjectGroups[subject].initials = initials;
                        } else if (isMissedEntry) {
                          subjectGroups[subject].initials = initials || subjectGroups[subject].initials;
                        }
                      }
                    });
                    
                    // Note: MISSED entries should already be in student.results from the fallback code
                    // If they're still missing here, it means the fallback didn't create them
                    // This could happen if the subject isn't in allSubjects or exam set matching failed
                    
                    // If no remarks found from any exam set, use any available remarks/initials
                    Object.values(subjectGroups).forEach((group: any) => {
                      const anyResult = all.find((r: any) => r.subject === group.subject);
                      if (anyResult) {
                        if (!group.remarks) {
                          group.remarks =
                            anyResult.teacher_remark ?? anyResult.remarks ?? anyResult.teacher_comment ?? '';
                        }
                        if (!group.initials) group.initials = anyResult.teacher_initials ?? '';
                        if (group.mid === undefined && group.end === undefined) {
                          group.mid = anyResult.marks_obtained ?? '';
                          group.end = anyResult.marks_obtained ?? '';
                        }
                      }
                    });
                    
                    const subjects = Object.values(subjectGroups);
                    
                    const prioritySubjects = ['English', 'Mathematics', 'Science'];
                    const sortedSubjects = subjects.sort((a, b) => {
                      const aIndex = prioritySubjects.findIndex((p) => p.toLowerCase() === String(a.subject).trim().toLowerCase());
                      const bIndex = prioritySubjects.findIndex((p) => p.toLowerCase() === String(b.subject).trim().toLowerCase());
                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                      if (aIndex !== -1) return -1;
                      if (bIndex !== -1) return 1;
                      return a.subject.localeCompare(b.subject, undefined, { sensitivity: 'base' });
                    });
                    
                    return sortedSubjects.map((group, idx) => {
                      totalFullMarks += group.total_marks;
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                          <td className="border border-blue-100 px-2.5 py-1.6 font-semibold text-left text-slate-900">{group.subject}</td>
                          <td className="border border-blue-100 px-2.5 py-1.6 text-center text-slate-800">{group.total_marks}</td>
                          {showMidTermColumn && (
                            <td className="border border-blue-100 px-2.5 py-1.6 text-center text-slate-800">{group.mid ?? ''}</td>
                          )}
                          {showEndOfTermColumn && (
                            <td className="border border-blue-100 px-2.5 py-1.6 text-center text-slate-800">{group.end ?? ''}</td>
                          )}
                          <td className="border border-blue-100 px-2.5 py-1.6 text-left text-slate-700">{group.remarks}</td>
                          <td className="border border-blue-100 px-2.5 py-1.6 text-center text-slate-800">{group.initials}</td>
                        </tr>
                      );
                    });
                  })()}
                  <tr className="bg-blue-100/60">
                    <td className="border border-blue-100 px-2.5 py-1.8 font-semibold text-left text-slate-900">TOTAL</td>
                    <td className="border border-blue-100 px-2.5 py-1.8 font-semibold text-center text-slate-900">{totalFullMarks}</td>
                    {showMidTermColumn && (
                      <td className="border border-blue-100 px-2.5 py-1.8"></td>
                    )}
                    {showEndOfTermColumn && (
                      <td className="border border-blue-100 px-2.5 py-1.8"></td>
                    )}
                    <td className="border border-blue-100 px-2.5 py-1.8" colSpan={2}></td>
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>

        {/* SUMMARY SECTION - Separate Cards */}
        <div className="grid grid-cols-3 gap-3 text-[9.2pt]">
          <div className="bg-white border border-blue-100/40 rounded-lg shadow-sm px-3.5 py-2.5 text-slate-800">
            <div><strong className="text-blue-900">Total Marks:</strong> {student.summary?.totalMarks || 'N/A'}</div>
            <div><strong className="text-blue-900">Average:</strong> {formatAverageWhole(student.summary?.average)}</div>
          </div>
          <div className="bg-white border border-blue-100/40 rounded-lg shadow-sm px-3.5 py-2.5 text-slate-800">
            <div><strong className="text-blue-900">Class Position:</strong> {student.summary?.classPosition || 'N/A'}</div>
            <div><strong className="text-blue-900">Out of:</strong> {student.summary?.totalStudents || 'N/A'} students</div>
        </div>
          <div className="bg-white border border-blue-100/40 rounded-lg shadow-sm px-3.5 py-2.5 text-slate-800">
            <div><strong className="text-blue-900">Attendance:</strong></div>
            <div>Days Present: {attendance.presentDays ?? 'N/A'}</div>
            <div>Days Absent: {attendance.absentDays ?? 'N/A'}</div>
            <div>Total Days: {attendance.totalSchoolDays ?? 'N/A'}</div>
            <AttendanceCountsSupplement attendance={attendance} summary={student.summary} />
          </div>
        </div>

      {/* GRADING SYSTEM - same as Upper Section */}
      <div className="text-[8.6pt] min-h-[48mm] mb-1.5">
          <h3 className="text-[9.2pt] font-semibold mb-1.2 text-blue-900">Grading System</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.9">
            <div className="rounded-xl bg-white border border-blue-100/60 shadow-sm overflow-hidden">
              <div className="bg-blue-100/70 px-2.1 py-1.2 font-semibold text-center text-blue-900 uppercase tracking-wide text-[7.8pt]">Subject Grade Boundaries</div>
              <table className="w-full text-[8pt]">
                <thead>
                  <tr className="bg-blue-50 text-blue-900">
                    <th className="border border-blue-100 px-2.1 py-1.05 text-left">Percentage Range</th>
                    <th className="border border-blue-100 px-2.1 py-1.05 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeScale.map((range: { min: number; max: number; grade: string }, idx: number) => (
                    <tr key={`${range.grade}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/45'}>
                      <td className="border border-blue-100 px-2.1 py-1.02 text-slate-800">{`${range.min} - ${range.max}`}</td>
                      <td className="border border-blue-100 px-2.1 py-1.02 text-center font-semibold text-blue-900">{range.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </div>
            <div className="rounded-xl bg-white border border-blue-100/60 shadow-sm overflow-hidden">
              <div className="bg-blue-100/70 px-2.1 py-1.2 font-semibold text-center text-blue-900 uppercase tracking-wide text-[7.8pt]">Division by Aggregate Points</div>
              <table className="w-full text-[8pt]">
                <thead>
                  <tr className="bg-blue-50 text-blue-900">
                    <th className="border border-blue-100 px-2.1 py-1.05 text-left">Aggregate Range</th>
                    <th className="border border-blue-100 px-2.1 py-1.05 text-center">Division</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionScale.map((range: { min: number; max: number; division: string }, idx: number) => (
                    <tr key={`${range.division}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/45'}>
                      <td className="border border-blue-100 px-2.1 py-1.02 text-slate-800">{`${range.min} - ${range.max}`}</td>
                      <td className="border border-blue-100 px-2.1 py-1.02 text-center font-semibold text-blue-900">{range.division}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </div>
          </div>
        </div>

        {/* COMMENTS & FOOTER - aligned with Upper Section */}
        <div className="text-[8.5pt] rounded-xl bg-white border border-blue-100/60 shadow-sm px-2.9 py-2.5 space-y-1.6 min-h-[58mm]">
          <div>
            <h3 className="text-blue-900 font-semibold uppercase tracking-wide mb-1.1 text-[9pt]">Class Teacher&apos;s Comments</h3>
            <p className="text-slate-700 leading-[1.28]">{classTeacherCommentDisplay}</p>
            <div className="text-slate-700 mt-1.1 text-[8pt]">Signature: ____________________</div>
          </div>
          <div>
            <h3 className="text-blue-900 font-semibold uppercase tracking-wide mb-1.1 text-[9pt]">Headteacher&apos;s Comments</h3>
            <p className="text-slate-700 leading-[1.28]">{headTeacherCommentDisplay}</p>
            <div className="text-slate-700 mt-1.1 text-[8pt]">Signature: ____________________</div>
          </div>
          <div className="flex justify-between items-center text-[8.1pt] pt-1.6 mt-1.6 border-t border-blue-100/60">
            <div><strong className="text-blue-900">Next term begins on:</strong> {student?.next_term_begins_date ? new Date(student.next_term_begins_date).toLocaleDateString() : 'TBA'}</div>
            <div><strong className="text-blue-900">Fees Balance:</strong> {formatCurrency(student?.feesBalance || 0)}</div>
          </div>
        </div>
        <div className="text-center text-[7pt] mt-1.25 pt-[0.2rem] border-t border-blue-100/80 text-slate-500">Generated by PwezaCore School Management System</div>
      </div>
    </div>
  );
}


function Template4UpperSectionReport({ student, examSet, school, examSets, gradeSystem }: { student: any; examSet: any; school: any; examSets?: any[]; gradeSystem?: { grades?: Array<{ min: number; max: number; grade: string }>; divisions?: Array<{ min: number; max: number; division: string }> } }) {
  const hdr = {
    name: school?.header_school_name_color || REPORT_HEADER_DEFAULTS.schoolName,
    subtitle: school?.header_subtitle_color || REPORT_HEADER_DEFAULTS.subtitle,
    address: school?.header_address_color || REPORT_HEADER_DEFAULTS.address,
    contact: school?.header_contact_color || REPORT_HEADER_DEFAULTS.contact,
    motto: school?.header_motto_color || REPORT_HEADER_DEFAULTS.motto,
    divider: school?.header_divider_color || REPORT_HEADER_DEFAULTS.divider,
    chipText: school?.header_chip_text_color || REPORT_HEADER_DEFAULTS.chipText,
    chipBg: school?.header_chip_background_color || REPORT_HEADER_DEFAULTS.chipBackground,
    chipBorder: school?.header_chip_border_color || REPORT_HEADER_DEFAULTS.chipBorder,
    meta: school?.header_meta_line_color || REPORT_HEADER_DEFAULTS.metaLine,
    contactSep: school?.header_contact_separator_color || REPORT_HEADER_DEFAULTS.contactSeparator,
  };

  const attendance = student?.summary?.attendanceDetails || {};

  const streamDisplay =
    student?.stream ||
    student?.current_stream ||
    student?.stream_name ||
    student?.class_stream ||
    student?.section ||
    'N/A';

  const reportDateDisplay = (() => {
    const raw = examSet?.date || student?.report_date || student?.summary?.reportDate;
    if (!raw) return 'N/A';
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const avgDisplay = formatAverageWhole(student?.summary?.average);
  const avgGrade = student?.summary?.division ?? '';
  const displayDivision = (() => {
    if (typeof avgGrade !== 'string') return avgGrade;
    const trimmed = avgGrade.trim();
    if (trimmed.toLowerCase().startsWith('division')) {
      return trimmed.replace(/division\s*/i, '').trim();
    }
    return trimmed;
  })();
  const overallPerf = student.summary.performanceRemark ?? '';
  const defaultGradeScale = [
    { min: 75, max: 100, grade: 'D1' },
    { min: 70, max: 74, grade: 'D2' },
    { min: 65, max: 69, grade: 'C3' },
    { min: 60, max: 64, grade: 'C4' },
    { min: 55, max: 59, grade: 'C5' },
    { min: 50, max: 54, grade: 'C6' },
    { min: 45, max: 49, grade: 'P7' },
    { min: 40, max: 44, grade: 'P8' },
    { min: 0, max: 39, grade: 'F9' }
  ];

  const defaultDivisionScale = [
    { min: 4, max: 12, division: 'Division 1' },
    { min: 13, max: 23, division: 'Division 2' },
    { min: 24, max: 29, division: 'Division 3' },
    { min: 30, max: 34, division: 'Division 4' },
    { min: 35, max: 36, division: 'U (Ungraded)' }
  ];

  const gradeScale = (gradeSystem?.grades && gradeSystem.grades.length > 0 ? gradeSystem.grades : defaultGradeScale)
    .map(range => ({
      min: Number(range.min),
      max: Number(range.max),
      grade: String(range.grade || '').toUpperCase()
    }))
    .sort((a, b) => b.min - a.min);

  const divisionScale = (gradeSystem?.divisions && gradeSystem.divisions.length > 0 ? gradeSystem.divisions : defaultDivisionScale)
    .map(range => ({
      min: Number(range.min),
      max: Number(range.max),
      division: String(range.division || '')
    }))
    .sort((a, b) => a.min - b.min);

  // Primary schools: grade MUST come from Subject Grade Boundaries (same scale shown in report), not A–F
  const getGradeFromMarks = (marks: number | string, totalMarks: number | string, scale: { min: number; max: number; grade: string }[]): string => {
    const m = Number(marks);
    const t = Number(totalMarks);
    if (t == null || t <= 0 || Number.isNaN(m)) return '';
    const pct = (m / t) * 100;
    const range = scale.find(r => pct >= r.min && pct <= r.max);
    return range ? String(range.grade || '').toUpperCase() : 'F9';
  };

  const endOfTermResult = (() => {
    const results = student?.results || [];
    const endResults = results.filter((r: any) => {
      const name = String(r.exam_set_name || r.exam_set || '').toLowerCase();
      return name.includes('end') || name.includes('final') || name.includes('eot');
    });
    return endResults.find((r: any) => r.headteacher_comment || r.class_teacher_comment) || endResults[0] || results[0] || null;
  })();

  const classTeacherComment = endOfTermResult?.class_teacher_comment
    || student?.comments?.class_teacher_text
    || student?.comments?.class_teacher_comment
    || student?.class_teacher_comment
    || '..............................................................';

  const headTeacherComment = endOfTermResult?.headteacher_comment
    || student?.comments?.head_teacher_text
    || student?.comments?.head_teacher_comment
    || student?.head_teacher_comment
    || '..............................................................';

  // Helper function to detect if exam set is Beginning of Term
  const isBeginning = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'beginning of term' || n.includes('beginning') || n.includes('bot');
  };
  
  // Helper function to detect if exam set is Mid Term
  const isMid = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
  };
  
  // Helper function to detect if exam set is End of Term
  const isEnd = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'end of term' || n.includes('end') || n.includes('eot');
  };
  
  // Determine selected exam set from examSet prop or from examSets
  // If examSet is provided and has a name, use it; otherwise, assume "All Exam Sets" (use End of Term)
  let selectedExamSetForDisplay = examSet && examSet.name ? examSet : null;

  // Treat "All Exam Sets" like no specific selection so End of Term values are shown
  if (selectedExamSetForDisplay && typeof selectedExamSetForDisplay.name === 'string') {
    const nameLower = selectedExamSetForDisplay.name.toLowerCase();
    if (nameLower.includes('all exam sets') || nameLower.includes('all sets')) {
      selectedExamSetForDisplay = null;
    }
  }

  const isMidTermSelected = selectedExamSetForDisplay && isMid(selectedExamSetForDisplay.name);

  // Check if BOT exam sets exist for this term
  const hasBOTExamSets = examSets && examSets.some((es: any) => isBeginning(es.name));
  
  const showENDColumn = !isMidTermSelected; // Hide END column when Mid Term is selected

  return (
    <div
      className="relative px-[0.08cm] py-[0.08cm] bg-white text-slate-800"
      style={{ fontFamily: 'Times New Roman, Times, serif', fontSize: '10.2pt', lineHeight: '1.33', paddingTop: '0.05cm' }}
    >
      {(school?.logo_url || school?.logo) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <img
            src={school.logo_url || school.logo}
            alt="School Watermark"
            className="max-w-2xl w-[55%] opacity-20 object-contain"
          />
        </div>
      )}

      <div className="relative z-10">
        {/* PRINT-READY PROFESSIONAL HEADER */}
        <div 
          className="print-header-container"
          style={{
            paddingTop: '0.28cm',
            paddingBottom: '0.05cm',
            paddingLeft: '0',
            paddingRight: '0.32cm',
            background: 'transparent',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            pageBreakInside: 'avoid',
            breakInside: 'avoid'
          }}
        >
          {/* Two-Column Layout */}
          <div className="flex items-center" style={{ minHeight: '2.1cm', position: 'relative' }}>
            {/* Left Column: Logo - Positioned at very left edge */}
            <div 
              className="flex-shrink-0"
              style={{
                width: '132px',
                height: '132px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                left: '0',
                marginLeft: '0'
              }}
            >
              {(school?.logo_url || school?.logo) ? (
                <img 
                  src={school.logo_url || school.logo} 
                  alt="School Logo" 
                  className="w-full h-full object-contain"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <div 
                  className="border border-gray-300 rounded flex items-center justify-center bg-gray-50"
                  style={{ width: '100%', height: '100%' }}
                >
                  <span style={{ fontSize: '9pt', color: '#9ca3af', textAlign: 'center', padding: '8px' }}>
                    School<br/>Logo
                  </span>
                </div>
              )}
            </div>

            {/* Center Column: School Information - Starts where badge ends */}
            <div className="flex-1 text-center" style={{ fontFamily: 'Times New Roman, serif', marginLeft: '132px', paddingLeft: '0.32cm' }}>
              {/* School Name - Bold Sans-serif Title - Uses saved color */}
              {school?.name && (
                <h1 
                  style={{
                    fontSize: '16.5pt',
                    fontWeight: '700',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    lineHeight: '1.06',
                    marginBottom: '0.22cm',
                    color: hdr.name,
                    marginTop: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {school.name}
                </h1>
              )}

              {/* Subtitle - Serif Font - Uses saved color */}
              {school?.subtitle && (
                <div 
                  style={{
                    fontSize: '11pt',
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontWeight: '400',
                    color: hdr.subtitle,
                    marginBottom: '0.18cm',
                    lineHeight: '1.32'
                  }}
                >
                  {school.subtitle}
                </div>
              )}

              {/* Address with P.O.Box - Serif Font - Uses saved color */}
              {(school?.address || school?.pobox) && (
                <div 
                  style={{
                    fontSize: '11pt',
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontWeight: '600',
                    color: hdr.address,
                    marginBottom: '0.16cm',
                    lineHeight: '1.32'
                  }}
                >
                  {school?.address || ''}{school?.address && school?.pobox ? ' ' : ''}{school?.pobox || ''}
                </div>
              )}

              {/* Contact Information - Email | Phone - Uses saved color */}
              {(school?.contact_email || school?.contact_phone) && (
                <div 
                  style={{
                    fontSize: '11pt',
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontWeight: '600',
                    color: hdr.contact,
                    marginBottom: '0.16cm',
                    lineHeight: '1.32'
                  }}
                >
                  {school?.contact_email && <span>{school.contact_email}</span>}
                  {school?.contact_email && school?.contact_phone && <span style={{ margin: '0 8px', color: hdr.contactSep }}>|</span>}
                  {school?.contact_phone && <span>{school.contact_phone}</span>}
                </div>
              )}

              {/* Motto - Serif Font Bold Italic with Quotes - Uses saved color */}
              {school?.motto && (
                <div 
                  style={{
                    fontSize: '9.8pt',
                    fontFamily: 'Times New Roman, Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: '600',
                    color: hdr.motto,
                    marginBottom: '0.22cm',
                    lineHeight: '1.32',
                    letterSpacing: '0.02em'
                  }}
                >
                  &quot;{school.motto}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Elegant Divider Line - Uses saved color */}
          <div 
            style={{
              height: '1px',
              background: `linear-gradient(to right, ${hdr.divider} 0%, ${lightenColor(hdr.divider)} 50%, ${hdr.divider} 100%)`,
              marginTop: '0.3cm',
              marginBottom: '0.18cm',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          />

          {/* Report Type Banner */}
          <div className="text-center" style={{ marginBottom: '0.22cm' }}>
            <div 
              className="inline-block"
              style={{
                padding: '6px 18px',
                borderRadius: '16px',
                fontSize: '9pt',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: hdr.chipText,
                background: hdr.chipBg,
                border: `1px solid ${hdr.chipBorder}`,
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
              }}
            >
              End of Term Report – Upper Section
            </div>
            {(examSet?.name || examSet?.year) && (
              <div 
                style={{
                  fontSize: '7.4pt',
                  color: hdr.meta,
                  marginTop: '0.14cm',
                  fontWeight: '400'
                }}
              >
                {examSet?.name || 'Term Report'} - {examSet?.year || new Date().getFullYear()}
              </div>
            )}
          </div>
        </div>

        {/* Print Media Query Styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            .print-header-container {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-top: 0.4cm !important;
              margin-bottom: 0.22cm !important;
            }
          }
        `}} />
      </div>

      <div className="relative z-10 flex flex-col gap-[0.9rem]" style={{ marginTop: '0.08cm' }}>
      {/* STUDENT INFO — match PDF (generate.ts Template 4 student-block / student-grid) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '6px 10px',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            marginBottom: '3mm',
            background: '#f8fafc',
            minHeight: '28mm',
            fontSize: '10.2pt',
            lineHeight: 1.3,
            color: '#1e293b',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              columnGap: '10px',
              rowGap: '4px',
              fontSize: '10.2pt',
              flex: 1,
            }}
          >
            <div>
              <strong style={{ color: '#1e3a8a' }}>Name:</strong> {student?.name ?? ''}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Class:</strong> {student?.current_class ?? ''}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Age (years):</strong> {studentAgeLabelForReport(student, examSet)}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Admission No:</strong>{' '}
              {student?.admission_number ?? student?.student_id ?? 'N/A'}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Term:</strong> {examSet?.term ?? 'N/A'} /{' '}
              {examSet?.year || new Date().getFullYear()}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Stream:</strong> {streamDisplay}
            </div>
            <div>
              <strong style={{ color: '#1e3a8a' }}>Date:</strong> {reportDateDisplay}
            </div>
          </div>
          <div
            style={{
              width: '2.1cm',
              height: '2.9cm',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {student?.profile_photo ? (
              <img src={student.profile_photo} alt="Student Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '8pt', color: '#94a3b8' }}>Photo</span>
            )}
          </div>
        </div>

      {/* SUBJECTS TABLE */}
      <div className="bg-white border border-blue-100/60 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-[9.8pt]">
        <thead>
              <tr className="bg-blue-100/70 text-blue-900 uppercase tracking-wide">
                <th className="border border-blue-100 px-2.6 py-1.28 text-left">Subject</th>
            {hasBOTExamSets && !isMidTermSelected && (
                  <th className="border border-blue-100 px-2.6 py-1.28 text-center w-16">BOT</th>
            )}
                <th className="border border-blue-100 px-2.6 py-1.28 text-center w-16">MID</th>
            {showENDColumn && (
                  <th className="border border-blue-100 px-2.6 py-1.28 text-center w-16">END</th>
            )}
                <th className="border border-blue-100 px-2.6 py-1.28 text-center w-16">Grade</th>
                <th className="border border-blue-100 px-2.6 py-1.28 text-left">Teacher's Comment</th>
                <th className="border border-blue-100 px-2.6 py-1.28 text-left">Teacher</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const prioritySubjects = ['English', 'Mathematics', 'Science'];
            const pri = (name: string) =>
              prioritySubjects.findIndex((p) => p.toLowerCase() === String(name || '').trim().toLowerCase());
            const sortedSubjects = [...(student?.subjects || [])].sort((a: any, b: any) => {
              const ai = pri(a.subject_name || '');
              const bi = pri(b.subject_name || '');
              if (ai !== -1 && bi !== -1) return ai - bi;
              if (ai !== -1) return -1;
              if (bi !== -1) return 1;
              return String(a.subject_name || '').localeCompare(String(b.subject_name || ''), undefined, {
                sensitivity: 'base',
              });
            });
            const fmtMark = (marks: unknown, grade: unknown): string | number => {
              const g = String(grade ?? '').trim().toUpperCase();
              if (g === 'MISSED') return 0;
              if (marks === '' || marks == null) return '';
              if (String(marks).trim().toUpperCase() === 'MISSED') return 0;
              if (typeof marks === 'number') return marks;
              if (typeof marks === 'string') return marks;
              return String(marks);
            };
            return sortedSubjects.map((subj: any, idx: number) => {
              const bot = fmtMark(subj.bot_marks ?? '', subj.bot_grade ?? '');
              const mot = fmtMark(subj.mot_marks ?? '', subj.mot_grade ?? '');
              const eot = fmtMark(subj.eot_marks ?? '', subj.eot_grade ?? '');

              let displayGrade = '';
              if (selectedExamSetForDisplay) {
                const selectedExamSetName = (selectedExamSetForDisplay.name || '').toLowerCase();
                if (isBeginning(selectedExamSetName)) {
                  displayGrade = subj.bot_grade ?? '';
                } else if (isMid(selectedExamSetName)) {
                  displayGrade = subj.mot_grade ?? '';
                } else if (isEnd(selectedExamSetName)) {
                  displayGrade = subj.eot_grade ?? '';
                }
              } else {
                displayGrade = subj.eot_grade ?? '';
              }
              if (!displayGrade) displayGrade = '—';

              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/35'}>
                  <td className="border border-blue-100 px-2.5 py-1.24 font-semibold text-slate-900">{subj.subject_name || ''}</td>
                  {hasBOTExamSets && !isMidTermSelected && (
                    <td className="border border-blue-100 px-2.2 py-1.12 text-center text-slate-800">{bot}</td>
                  )}
                  <td className="border border-blue-100 px-2.2 py-1.12 text-center text-slate-800">{mot}</td>
                  {showENDColumn && (
                    <td className="border border-blue-100 px-2.2 py-1.12 text-center text-slate-800">{eot}</td>
                  )}
                  <td className="border border-blue-100 px-2.2 py-1.12 text-center font-bold text-blue-900">{displayGrade}</td>
                  <td className="border border-blue-100 px-2.2 py-1.12 text-[9.2pt] text-slate-700 leading-[1.27]">{subj.teacher_comment || ''}</td>
                  <td className="border border-blue-100 px-2.3 py-1.18 text-[9.2pt] text-slate-700 leading-[1.27]">{subj.teacher_name || ''}</td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-1.6 text-[8.7pt]">
          <div className="rounded-xl bg-white border border-blue-100/60 shadow-sm px-2.5 py-1.6">
            <div><strong className="text-blue-900">Total Marks:</strong> {student?.summary?.totalMarks || 'N/A'}</div>
            <div><strong className="text-blue-900">Average:</strong> {avgDisplay}</div>
            <div><strong className="text-blue-900">Aggregates:</strong> {student?.summary?.aggregate !== null && student?.summary?.aggregate !== undefined ? student.summary.aggregate : 'N/A'}</div>
            <div><strong className="text-blue-900">Division:</strong> {displayDivision || 'N/A'}</div>
        </div>
          <div className="rounded-xl bg-white border border-blue-100/60 shadow-sm px-2.5 py-1.6">
            <div><strong className="text-blue-900">Class Position:</strong> {student?.summary?.classPosition || 'N/A'}</div>
            <div><strong className="text-blue-900">Out of:</strong> {student?.summary?.totalStudents || 'N/A'} students</div>
        </div>
          <div className="rounded-xl bg-white border border-blue-100/60 shadow-sm px-2.5 py-1.6 text-slate-800">
            <div className="text-blue-900 font-semibold">Attendance:</div>
          <div>Days Present: {attendance.presentDays ?? 'N/A'}</div>
          <div>Days Absent: {attendance.absentDays ?? 'N/A'}</div>
          <div>Total Days: {attendance.totalSchoolDays ?? 'N/A'}</div>
          <AttendanceCountsSupplement attendance={attendance} summary={student.summary} />
        </div>
      </div>

      {/* GRADING SYSTEM */}
      <div className="text-[8.6pt]">
          <h3 className="text-[9.2pt] font-semibold mb-1.2 text-blue-900">Grading System</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.9">
            <div className="rounded-xl bg-white border border-blue-100/60 shadow-sm overflow-hidden">
              <div className="bg-blue-100/70 px-2.1 py-1.2 font-semibold text-center text-blue-900 uppercase tracking-wide text-[7.8pt]">Subject Grade Boundaries</div>
              <table className="w-full text-[8pt]">
                <thead>
                  <tr className="bg-blue-50 text-blue-900">
                    <th className="border border-blue-100 px-2.1 py-1.05 text-left">Percentage Range</th>
                    <th className="border border-blue-100 px-2.1 py-1.05 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeScale.map((range, idx) => (
                    <tr key={`${range.grade}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/45'}>
                      <td className="border border-blue-100 px-2.1 py-1.02 text-slate-800">{`${range.min} - ${range.max}`}</td>
                      <td className="border border-blue-100 px-2.1 py-1.02 text-center font-semibold text-blue-900">{range.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </div>
            <div className="rounded-xl bg-white border border-blue-100/60 shadow-sm overflow-hidden">
              <div className="bg-blue-100/70 px-2.1 py-1.2 font-semibold text-center text-blue-900 uppercase tracking-wide text-[7.8pt]">Division by Aggregate Points</div>
              <table className="w-full text-[8pt]">
                <thead>
                  <tr className="bg-blue-50 text-blue-900">
                    <th className="border border-blue-100 px-2.1 py-1.05 text-left">Aggregate Range</th>
                    <th className="border border-blue-100 px-2.1 py-1.05 text-center">Division</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionScale.map((range, idx) => (
                    <tr key={`${range.division}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/45'}>
                      <td className="border border-blue-100 px-2.1 py-1.02 text-slate-800">{`${range.min} - ${range.max}`}</td>
                      <td className="border border-blue-100 px-2.1 py-1.02 text-center font-semibold text-blue-900">{range.division}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </div>
          </div>
        </div>

      {/* COMMENTS */}
      <div className="text-[8.5pt] rounded-xl bg-white border border-blue-100/60 shadow-sm px-2.9 py-2.2 space-y-1.6">
          <div>
            <h3 className="text-blue-900 font-semibold uppercase tracking-wide mb-1.1 text-[9pt]">Class Teacher's Comments</h3>
            <p className="text-slate-700 leading-[1.28]">{classTeacherComment}</p>
            <div className="text-slate-700 mt-1.1 text-[8pt]">Signature: ____________________</div>
          </div>
          <div>
            <h3 className="text-blue-900 font-semibold uppercase tracking-wide mb-1.1 text-[9pt]">Headteacher's Comments</h3>
            <p className="text-slate-700 leading-[1.28]">{headTeacherComment}</p>
            <div className="text-slate-700 mt-1.1 text-[8pt]">Signature: ____________________</div>
          </div>
          <div className="flex justify-between items-center text-[8.1pt] pt-1.6 mt-1.6 border-t border-blue-100/60">
            <div><strong className="text-blue-900">Next Term Begins:</strong> {student?.next_term_begins_date ? new Date(student.next_term_begins_date).toLocaleDateString() : 'TBA'}</div>
            <div><strong className="text-blue-900">Fees Balance:</strong> {formatCurrency(student?.feesBalance || 0)}</div>
          </div>
      </div>

      {/* FOOTER */}
      <div className="text-center text-[7pt] mt-1.25 pt-[0.2rem] border-t border-blue-100/80 text-slate-500">
        Generated by PwezaCore School Management System
        </div>
      </div>
    </div>
  );
}

// Template 5 - Clean, Elegant, Printable A4 Report Card
function Template5CleanReportCard({ student, examSet, school }: { student: any; examSet: any; school: any }) {
  const attendance = student.summary.attendanceDetails || {};
  const results = student.results || [];
  
  // Group results by subject
  const subjectGroups: { [key: string]: { subject: string; marks: string; grade: string; remarks: string } } = {};
  
  results.forEach((r: any) => {
    const subject = r.subject ?? '';
    if (!subjectGroups[subject]) {
      subjectGroups[subject] = {
        subject,
        marks: '',
        grade: '',
        remarks: r.teacher_remark || ''
      };
    }
    
    // Use End of Term marks/grade if available, otherwise Mid Term
    const examSetName = (r.exam_set_name || '').toLowerCase();
    if (examSetName.includes('end') || examSetName.includes('eot')) {
      subjectGroups[subject].marks = r.marks_obtained ?? '';
      subjectGroups[subject].grade = r.grade ?? '';
      if (r.teacher_remark && r.teacher_remark !== 'MISSED') {
        subjectGroups[subject].remarks = r.teacher_remark;
      }
    } else if (!subjectGroups[subject].marks && (examSetName.includes('mid') || examSetName.includes('mot'))) {
      subjectGroups[subject].marks = r.marks_obtained ?? '';
      subjectGroups[subject].grade = r.grade ?? '';
      if (!subjectGroups[subject].remarks && r.teacher_remark && r.teacher_remark !== 'MISSED') {
        subjectGroups[subject].remarks = r.teacher_remark;
      }
    }
  });
  
  const subjects = Object.values(subjectGroups);
  
  // Sort subjects: English, Mathematics, Science first
  const prioritySubjects = ['English', 'Mathematics', 'Science'];
  subjects.sort((a, b) => {
    const aIndex = prioritySubjects.indexOf(a.subject);
    const bIndex = prioritySubjects.indexOf(b.subject);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.subject.localeCompare(b.subject);
  });

  return (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '25.4mm',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Calibri, Times New Roman, Arial, sans-serif',
        color: '#000000',
        boxSizing: 'border-box'
      }}
      className="print-report-card"
    >
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4;
          margin: 1in;
        }
        @media print {
          .print-report-card {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}} />

      {/* HEADER SECTION - Matching Image Design */}
      <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
        {/* Left Side: Logo with Banner */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Circular Logo Badge */}
          <div
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              border: '6px solid #8B4513',
              backgroundColor: '#8B4513',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginBottom: '8px',
              position: 'relative'
            }}
          >
            {school?.logo_url || school?.logo ? (
              <img
                src={school.logo_url || school.logo}
                alt="School Badge"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  padding: '8px'
                }}
              />
            ) : (
              <div style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold' }}>SK</div>
            )}
            {/* Outer Ring with School Name */}
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '6px solid #8B4513',
                pointerEvents: 'none'
              }}
            />
          </div>
          
          {/* Banner Below Logo with Motto */}
          {school?.motto && (
            <div
              style={{
                backgroundColor: '#8B4513',
                border: '1px solid #FFFFFF',
                padding: '6px 12px',
                borderRadius: '4px',
                textAlign: 'center',
                minWidth: '120px'
              }}
            >
              <div
                style={{
                  color: '#FFFFFF',
                  fontSize: '9px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Arial, sans-serif'
                }}
              >
                {school.motto}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: School Information */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          {/* School Name - Large, Bold */}
          {school?.name && (
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#000000',
                marginBottom: '4px',
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.2'
              }}
            >
              {school.name.toUpperCase()}
            </div>
          )}

          {/* Subtitle - Smaller, Regular */}
          {school?.subtitle && (
            <div
              style={{
                fontSize: '12px',
                fontWeight: '400',
                color: '#000000',
                marginBottom: '8px',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              {school.subtitle}
            </div>
          )}

          {/* Contact Information Block */}
          <div
            style={{
              fontSize: '10px',
              fontWeight: '400',
              color: '#000000',
              fontFamily: 'Arial, sans-serif',
              lineHeight: '1.6'
            }}
          >
            {school?.address && (
              <div style={{ marginBottom: '2px' }}>{school.address}{school?.pobox ? `, ${school.pobox}` : ''}</div>
            )}
            {!school?.address && school?.pobox && (
              <div style={{ marginBottom: '2px' }}>{school.pobox}</div>
            )}
            {school?.contact_phone && (
              <div style={{ marginBottom: '2px' }}>Tel: {school.contact_phone}</div>
            )}
            {school?.contact_email && (
              <div style={{ marginBottom: '2px' }}>Email: {school.contact_email}</div>
            )}
            {school?.website && (
              <div style={{ marginBottom: '2px' }}>Web: {school.website}</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Title */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#002B5B',
            letterSpacing: '1px',
            margin: '0 0 12px 0',
            fontFamily: 'Calibri, Times New Roman, sans-serif'
          }}
        >
          STUDENT REPORT CARD
        </h1>

        {/* Decorative Line */}
        <div
          style={{
            width: '80%',
            height: '2px',
            backgroundColor: '#C0C0C0',
            margin: '0 auto'
          }}
        />
      </div>

      {/* Student Information Block - 2 Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px 40px',
          fontSize: '14px',
          color: '#000000',
          marginBottom: '20px',
          marginTop: '20px'
        }}
      >
        <div><strong>Student Name:</strong> {student?.name || '________________'}</div>
        <div><strong>Class:</strong> {student?.current_class || '________________'}</div>
        <div><strong>Age (years):</strong> {studentAgeLabelForReport(student, examSet)}</div>
        <div><strong>Term:</strong> {examSet?.term || '________________'}</div>
        <div><strong>Year:</strong> {examSet?.year || new Date().getFullYear()}</div>
        <div><strong>Index No:</strong> {student?.admission_number || student?.student_id || '________________'}</div>
        <div><strong>Stream:</strong> ________________</div>
      </div>

      {/* SUBJECT TABLE SECTION */}
      <div style={{ marginBottom: '30px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            border: '1px solid #BFBFBF'
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#F3F3F3' }}>
              <th
                style={{
                  border: '1px solid #BFBFBF',
                  padding: '10px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#000000'
                }}
              >
                Subject
              </th>
              <th
                style={{
                  border: '1px solid #BFBFBF',
                  padding: '10px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#000000'
                }}
              >
                Marks
              </th>
              <th
                style={{
                  border: '1px solid #BFBFBF',
                  padding: '10px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#000000'
                }}
              >
                Grade
              </th>
              <th
                style={{
                  border: '1px solid #BFBFBF',
                  padding: '10px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#000000'
                }}
              >
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.length > 0 ? (
              subjects.map((subj, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    height: '30px'
                  }}
                >
                  <td
                    style={{
                      border: '1px solid #BFBFBF',
                      padding: '8px 10px',
                      textAlign: 'left'
                    }}
                  >
                    {subj.subject}
                  </td>
                  <td
                    style={{
                      border: '1px solid #BFBFBF',
                      padding: '8px 10px',
                      textAlign: 'center'
                    }}
                  >
                    {subj.marks || '-'}
                  </td>
                  <td
                    style={{
                      border: '1px solid #BFBFBF',
                      padding: '8px 10px',
                      textAlign: 'center'
                    }}
                  >
                    {subj.grade || '-'}
                  </td>
                  <td
                    style={{
                      border: '1px solid #BFBFBF',
                      padding: '8px 10px',
                      textAlign: 'left'
                    }}
                  >
                    {subj.remarks || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ border: '1px solid #BFBFBF', padding: '15px', textAlign: 'center', color: '#444444' }}>
                  No results available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER SECTION */}
      <div
        style={{
          borderTop: '1px solid #C0C0C0',
          marginTop: '20px',
          paddingTop: '20px',
          fontSize: '13px',
          color: '#000000'
        }}
      >
        {/* Class Teacher's Comment */}
        <div style={{ marginBottom: '25px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            Class Teacher's Comment:
          </div>
          <div
            style={{
              minHeight: '40px',
              borderBottom: '1px solid #BFBFBF',
              paddingBottom: '5px',
              fontStyle: 'italic',
              color: '#444444'
            }}
          >
            {student?.comments?.class_teacher_text || student?.comments?.class_teacher_comment || '________________________________________________________________'}
          </div>
          <div style={{ marginTop: '15px', fontSize: '12px' }}>
            Signature: _____________________________
          </div>
        </div>

        {/* Head Teacher's Comment */}
        <div style={{ marginBottom: '25px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
            Head Teacher's Comment:
          </div>
          <div
            style={{
              minHeight: '40px',
              borderBottom: '1px solid #BFBFBF',
              paddingBottom: '5px',
              fontStyle: 'italic',
              color: '#444444'
            }}
          >
            {student?.comments?.head_teacher_text || student?.comments?.head_teacher_comment || '________________________________________________________________'}
          </div>
          <div style={{ marginTop: '15px', fontSize: '12px' }}>
            Signature: _____________________________
          </div>
        </div>
      </div>
    </div>
  );
}

// Secondary school report preview matching provided structure
function SecondaryReportPreview({ student, examSet, school }: { student: any; examSet: any; school: any }) {
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? 'N/A';
  const totalDays = attendance.totalSchoolDays ?? 'N/A';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : 'N/A';
  const overallPerf = student.summary.performanceRemark ?? 'N/A';
  
  // Ensure only the four core subjects are shown so the preview fits one A4 page
  const coreSubjectNames = ['english', 'mathematics', 'science', 'social studies', 'sst'];
  const coreResults = (student.results || [])
    .filter((r: any) => coreSubjectNames.includes(String(r.subject || '').toLowerCase()))
    .slice(0, 4);

  return (
    <div
      style={{ 
        fontFamily: 'Times New Roman, Arial, sans-serif',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        padding: '15mm',
        boxSizing: 'border-box'
      }}
      className="bg-white text-black print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:min-h-full"
    >
      {/* WATERMARK */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 -z-10 pointer-events-none">
        <div className="w-[864px] h-[864px] border-2 border-gray-300 rounded-full flex items-center justify-center bg-gray-100">
          <div className="text-center text-9xl font-bold text-gray-400">
            SCHOOL<br/>LOGO
          </div>
        </div>
      </div>
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        {/* School Logo */}
        <div className="w-48 h-48 flex items-center justify-center overflow-hidden border-0 flex-shrink-0">
          {(school?.logo_url || school?.logo) ? (
            <img
              src={school.logo_url || school.logo}
              alt="School Logo"
              className="w-full h-full object-cover border-0"
            />
          ) : (
            <div className="text-center text-xs">
              <div className="font-bold">SCHOOL</div>
              <div className="font-bold">LOGO</div>
            </div>
          )}
        </div>
        
        {/* School Info */}
        <div className="text-right flex-1">
        <div className="font-bold text-[18pt] uppercase">{school?.name || 'School Name'}</div>
          <div className="font-bold text-[11pt] mt-0.5">TEL: {school?.phone || 'Phone'} | EMAIL: {school?.email || 'Email'} | {school?.address || 'Address'}</div>
          <div className="font-bold text-[11pt] mt-0.5 italic">SCHOOL MOTTO: {school?.motto || 'Education the Future'}</div>
        </div>
      </div>

      {/* TITLE */}
      <h1 className="text-center text-[13pt] font-bold my-3 uppercase">
        LEARNER'S END OF TERM REPORT CARD FOR TERM {examSet?.term || ''}, {examSet?.year || ''}
      </h1>

      {/* META */}
      <div className="my-2 flex justify-between items-start">
        <div className="flex flex-wrap gap-5 text-[11pt]">
          <div><strong>LNo.</strong> {student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> {student.name}</div>
          <div><strong>CLASS & STREAM:</strong> {student.current_class}</div>
          <div><strong>AGE (YEARS):</strong> {studentAgeLabelForReport(student, examSet)}</div>
        </div>
        
        {/* Student Photo */}
        <div className="w-20 h-24 border-2 border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden">
          {student.profile_photo ? (
            <img
              src={student.profile_photo}
              alt="Student Photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-xs text-gray-500">Photo</div>
          )}
        </div>
      </div>


      {/* SUBJECTS TABLE */}
      <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
        <thead>
          <tr>
            {['SUBJECT & PAPER', 'MARKS OBTAINED', 'TOTAL MARKS', 'GRADE', 'REMARK', 'INITIALS'].map(h => (
              <th key={h} className="text-center font-bold" style={{ border: '1px solid #000', background: '#f0f0f0', padding: '6px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {coreResults.length > 0 ? (
            coreResults.map((result: any, index: number) => {
              const subject = result.subject ?? '';
              const marksObtained = result.marks_obtained ?? '';
              const totalMarks = result.total_marks ?? '';
              const grade = result.grade ?? '';
              const remark = result.remark ?? result.overall_remark ?? '';
              const initials = result.teacher_initials ?? result.teacher_name ?? '';
              
              return (
                <tr key={index}>
                  <td style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>{subject}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{marksObtained}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{totalMarks}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{grade}</td>
                  <td style={{ border: '1px solid #000', padding: '6px' }}>{remark}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{initials}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', color: '#555' }}>N/A - Student did not sit for this term</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* PERFORMANCE SUMMARY (remove average line for primary to match requested format) */}
      <div className="mt-2 text-[11pt]">
        <p><strong>OVERALL PERFORMANCE:</strong> {overallPerf}</p>
      </div>


      {/* COMMENTS */}
      <div className="mt-4 text-[10pt]">
        <h3 className="text-[11pt] font-semibold mb-1">Class Teacher's Comment</h3>
        <p>{student.comments?.class_teacher_text || '..............................................................'}</p>
        <p>
          Name: {student.comments?.class_teacher_name || '__________'} |
          {' '}Signature: {student.comments?.class_teacher_signature || '__________'} |
          {' '}Date: {student.comments?.class_teacher_date || '__________'}
        </p>

        <h3 className="text-[11pt] font-semibold mt-3 mb-1">Head Teacher's Comment</h3>
        <p>{student.comments?.head_teacher_text || '..............................................................'}</p>
        <p>
          Name: {student.comments?.head_teacher_name || '__________'} |
          {' '}Signature: {student.comments?.head_teacher_signature || '__________'} |
          {' '}Date: {student.comments?.head_teacher_date || '__________'}
        </p>
      </div>

      <p className="mt-3 text-[11pt]"><strong>Next Term Begins:</strong> {student?.next_term_begins_date ? new Date(student.next_term_begins_date).toLocaleDateString() : '______________________'}</p>

      {/* Grading system & descriptions */}
      <div className="mt-3">
        <h3 className="text-[11pt] font-semibold">Grading System</h3>
        <ul className="list-disc ml-6 text-[10pt]">
          <li>A (80–100)</li>
          <li>B (70–79)</li>
          <li>C (50–69)</li>
          <li>D (40–49)</li>
          <li>E (0–39)</li>
        </ul>
        <h3 className="text-[11pt] font-semibold mt-2">Grade Descriptions</h3>
        <p className="text-[10pt]">A: Excellent mastery and application of concepts.</p>
        <p className="text-[10pt]">B: Very good understanding with minor gaps.</p>
        <p className="text-[10pt]">C: Satisfactory performance with notable room for improvement.</p>
        <p className="text-[10pt]">D: Below average; needs significant improvement.</p>
        <p className="text-[10pt]">E: Poor performance; urgent intervention required.</p>
      </div>

      {/* FOOTER */}
      <div className="text-center text-[9pt] mt-4">
        Printed from: Pwezacore — School Motto: '{school?.motto || 'Education the Future'}'
      </div>
    </div>
  );
}



export { ReportPreview };
