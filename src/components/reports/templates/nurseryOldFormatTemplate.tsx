import React from 'react';

// Import shared utilities from primary templates
const REPORT_HEADER_DEFAULTS = {
  schoolName: '#1e3a8a',
  subtitle: '#1e40af',
  address: '#1e40af',
  contact: '#1e40af',
  motto: '#1e40af',
  divider: '#3b82f6',
  chipText: '#1e3a8a',
  chipBackground: '#dbeafe',
  chipBorder: '#93c5fd',
  metaLine: '#64748b',
  contactSeparator: '#cbd5e1',
};

const lightenColor = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lighten = (c: number) => Math.min(255, Math.floor(c + (255 - c) * 0.3));
  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`;
};

const studentAgeLabelForReport = (student: any, examSet: any): string => {
  if (student?.age_years !== undefined && student?.age_years !== null) {
    return String(student.age_years);
  }
  if (student?.age !== undefined && student?.age !== null) {
    return String(student.age);
  }
  if (student?.date_of_birth && examSet?.date) {
    try {
      const dob = new Date(student.date_of_birth);
      const examDate = new Date(examSet.date);
      if (!isNaN(dob.getTime()) && !isNaN(examDate.getTime())) {
        let years = examDate.getFullYear() - dob.getFullYear();
        const monthDiff = examDate.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && examDate.getDate() < dob.getDate())) {
          years--;
        }
        return String(years);
      }
    } catch (e) {
      console.warn('Error calculating age:', e);
    }
  }
  return 'N/A';
};

const formatAverageWhole = (avg: any): string => {
  if (avg === null || avg === undefined || avg === '') return 'N/A';
  const num = Number(avg);
  if (isNaN(num)) return 'N/A';
  return Math.round(num).toString();
};

interface AttendanceDetails {
  presentDays?: number;
  absentDays?: number;
  totalSchoolDays?: number;
  lateCount?: number;
  sickDays?: number;
}

const AttendanceCountsSupplement: React.FC<{ attendance: AttendanceDetails; summary: any }> = ({ attendance, summary }) => {
  const lateCount = attendance?.lateCount ?? summary?.lateCount ?? 0;
  const sickDays = attendance?.sickDays ?? summary?.sickDays ?? 0;
  if (lateCount === 0 && sickDays === 0) return null;
  return (
    <>
      {lateCount > 0 && <div>Times Late: {lateCount}</div>}
      {sickDays > 0 && <div>Sick Days: {sickDays}</div>}
    </>
  );
};

// Subject to image mapping for nursery learning areas
const NURSERY_SUBJECT_IMAGE_MAP: Record<string, string> = {
  'relating with others': 'relating_with_others.png',
  'relating and knowing my environment': 'naming.png',
  'taking care of myself': 'taking_care_of_myself.png',
  'development and using mathematical concepts': 'counting_concepts.png',
  'development and using language': 'reading.png',
};

const getNurseryImageKey = (subject: string): string | null => {
  // Normalize: lowercase, remove parentheses content, trim
  const normalized = subject.toLowerCase().trim().replace(/\s*\([^)]*\)\s*/g, '').trim();
  return NURSERY_SUBJECT_IMAGE_MAP[normalized] || null;
};

/**
 * Template2OldNurseryReport - Nursery Old Format (Marks-based)
 * 
 * This template is EXACTLY the same as Template3KyoteraReport (Lower Primary P.1-P.3)
 * with ONLY the subjects table modified to show nursery format with images.
 * 
 * Key differences from lower primary:
 * - Subject column includes small images (32px) next to subject names
 * - No Mid Term / End of Term columns (just MARKS)
 * - Uses nursery learning area names
 */
export function Template2OldNurseryReport({ 
  student, 
  examSet, 
  school, 
  reportTitleSettings, 
  currentTermInfo, 
  examSets, 
  gradeSystem 
}: { 
  student: any; 
  examSet: any; 
  school: any; 
  reportTitleSettings: any; 
  currentTermInfo: any; 
  examSets?: any[]; 
  gradeSystem?: { 
    grades?: Array<{ min: number; max: number; grade: string }>; 
    divisions?: Array<{ min: number; max: number; division: string }> 
  } 
}) {
  const reportDateDisplayLower = (() => {
    const raw = examSet?.date || student?.report_date || student?.summary?.reportDate;
    if (!raw) return 'N/A';
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return String(raw);
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();
  
  const attendance = student.summary.attendanceDetails || {};

  // Resolve comments from result row first, then student.comments
  const endOfTermResult = (() => {
    const results = student?.results || [];
    const resultWithComments = results.find((r: any) => r.headteacher_comment || r.class_teacher_comment);
    if (resultWithComments) return resultWithComments;
    
    const endResults = results.filter((r: any) => {
      const name = String(r.exam_set_name || r.exam_set || '').toLowerCase();
      return name.includes('end') || name.includes('final') || name.includes('eot');
    });
    return endResults[0] || results[0] || null;
  })();
  
  const classTeacherCommentDisplay = (() => {
    const raw = (endOfTermResult?.class_teacher_comment || student?.comments?.class_teacher_text || student?.comments?.class_teacher_comment || (student as any)?.class_teacher_comment || '').toString().trim();
    return raw || 'Good progress. Keep it up.';
  })();
  
  const headTeacherCommentDisplay = (() => {
    const raw = (endOfTermResult?.headteacher_comment || student?.comments?.head_teacher_text || student?.comments?.head_teacher_comment || student?.comments?.headteacher_text || (student as any)?.head_teacher_comment || '').toString().trim();
    return raw || 'Approved.';
  })();

  // Generate report title
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
        {/* PRINT-READY PROFESSIONAL HEADER - EXACT COPY FROM LOWER PRIMARY */}
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
              {/* School Name - Bold Sans-serif Title */}
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

              {/* Subtitle - Serif Font */}
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

              {/* Address with P.O.Box - Serif Font */}
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

              {/* Contact Information - Email | Phone - Serif Font */}
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

              {/* Motto - Serif Font Bold Italic with Quotes */}
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

          {/* Elegant Divider Line */}
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
        {/* STUDENT INFO - EXACT COPY FROM LOWER PRIMARY */}
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

        {/* SUBJECTS TABLE - NURSERY FORMAT WITH LARGE IMAGES (Grid Layout like Colored Report) */}
        <div className="bg-white border border-blue-100/50 rounded-lg shadow-sm overflow-hidden" style={{ marginBottom: '12px' }}>
          {/* Grid of subject boxes with images */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            padding: '10px',
            backgroundColor: '#f8fafc'
          }}>
            {(() => {
              const results = student.results || [];
              if (results.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    No results available
                  </div>
                );
              }
              
              // Group results by subject
              const subjectGroups: { [key: string]: { subject: string; total_marks: number; marks: any; remarks: string; initials: string; imageKey: string | null } } = {};
              
              results.forEach((r: any) => {
                const subject = r.subject ?? '';
                const imageKey = getNurseryImageKey(subject);
                
                if (!subjectGroups[subject]) {
                  subjectGroups[subject] = {
                    subject,
                    total_marks: r.total_marks ?? 100,
                    marks: r.marks_obtained ?? '',
                    remarks: r.teacher_remark ?? r.remarks ?? r.teacher_comment ?? '',
                    initials: r.teacher_initials ?? '',
                    imageKey
                  };
                } else {
                  const hasRemarks = r.teacher_remark || r.remarks || r.teacher_comment;
                  if (hasRemarks && !subjectGroups[subject].remarks) {
                    subjectGroups[subject].marks = r.marks_obtained ?? '';
                    subjectGroups[subject].remarks = r.teacher_remark ?? r.remarks ?? r.teacher_comment ?? '';
                    subjectGroups[subject].initials = r.teacher_initials ?? '';
                  }
                }
              });
              
              const subjects = Object.values(subjectGroups);
              
              return subjects.map((group, idx) => (
                <div
                  key={idx}
                  style={{
                    minHeight: '180px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '2px solid #bfdbfe',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Subject name at top */}
                  <div style={{
                    width: '100%',
                    fontSize: '11pt',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    textAlign: 'center',
                    color: '#1e3a8a',
                    marginBottom: '8px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {group.subject}
                  </div>
                  
                  {/* Large image in middle */}
                  <div style={{
                    flex: '1 1 0',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    minHeight: '80px'
                  }}>
                    {group.imageKey ? (
                      <img 
                        src={`/pre-primary-skill-art/${group.imageKey}`}
                        alt={group.subject}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%', 
                          objectFit: 'contain'
                        }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '8pt' }}>No image</div>
                    )}
                  </div>
                  
                  {/* Marks info at bottom */}
                  <div style={{
                    width: '100%',
                    marginTop: '8px',
                    fontSize: '9pt',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>
                      {group.marks} / {group.total_marks}
                    </div>
                    <div style={{ fontSize: '8pt', color: '#64748b', fontStyle: 'italic', lineHeight: 1.2 }}>
                      {group.remarks || '—'}
                    </div>
                    {group.initials && (
                      <div style={{ fontSize: '7pt', color: '#94a3b8', marginTop: '2px' }}>
                        {group.initials}
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
          
          {/* Summary row below grid */}
          <div style={{
            padding: '10px',
            backgroundColor: '#eff6ff',
            borderTop: '2px solid #bfdbfe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10pt',
            fontWeight: 600
          }}>
            <div style={{ color: '#1e3a8a' }}>
              TOTAL MARKS: {(() => {
                const results = student.results || [];
                const subjectGroups: { [key: string]: any } = {};
                results.forEach((r: any) => {
                  const subject = r.subject ?? '';
                  if (!subjectGroups[subject]) {
                    subjectGroups[subject] = { total_marks: r.total_marks ?? 100, marks: r.marks_obtained ?? 0 };
                  }
                });
                const subjects = Object.values(subjectGroups);
                const totalFullMarks = subjects.reduce((sum: number, g: any) => sum + g.total_marks, 0);
                const totalMarksObtained = subjects.reduce((sum: number, g: any) => sum + Number(g.marks || 0), 0);
                return `${totalMarksObtained} / ${totalFullMarks}`;
              })()}
            </div>
          </div>
        </div>

        {/* SUMMARY SECTION - EXACT COPY FROM LOWER PRIMARY */}
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

        {/* COMMENTS SECTION - EXACT COPY FROM LOWER PRIMARY */}
        <div className="space-y-2.5 text-[9.2pt]">
          <div className="bg-white border border-blue-100/40 rounded-lg shadow-sm px-3.5 py-2.5 text-slate-800">
            <div className="font-semibold text-blue-900 mb-1.5">Class Teacher's Comment:</div>
            <div className="italic">{classTeacherCommentDisplay}</div>
          </div>
          <div className="bg-white border border-blue-100/40 rounded-lg shadow-sm px-3.5 py-2.5 text-slate-800">
            <div className="font-semibold text-blue-900 mb-1.5">Head Teacher's Comment:</div>
            <div className="italic">{headTeacherCommentDisplay}</div>
          </div>
        </div>

        {/* NEXT TERM INFO - EXACT COPY FROM LOWER PRIMARY */}
        {currentTermInfo?.next_term_begins && (
          <div className="text-center text-[9.2pt] text-slate-700 mt-3">
            <strong className="text-blue-900">Next Term Begins:</strong>{' '}
            {new Date(currentTermInfo.next_term_begins).toLocaleDateString('en-GB', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
          </div>
        )}
      </div>
    </div>
  );
}
