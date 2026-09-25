import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { downloadBroadsheetPdf } from '../services/broadsheetPdfGenerator';

export interface BroadsheetSubject {
  code: string;
  title: string;
  creditUnits: number;
}

export interface BroadsheetRow {
  rank: number;
  studentId: string;
  regNo: string;
  studentName: string;
  gender?: string;
  subjectScores: Record<
    string,
    {
      mark: number;
      grade: string;
      gp: number;
      isRetake?: boolean;
    }
  >;
  cgpa: number;
  standing: 'Pass (NP)' | 'Retake' | 'Probation (PB)';
  failedSubjects?: string[];
}

export interface BroadsheetSummary {
  totalStudents: number;
  passedCount: number;
  retakeCount: number;
  highestCGPA: number;
  lowestCGPA: number;
  averageCGPA: number;
}

export interface NoticeBoardBroadsheetProps {
  schoolName: string;
  schoolLogoUrl?: string;
  schoolMotto?: string;
  schoolAddress?: string;
  schoolContact?: string;
  className: string;
  academicYearSession: string;
  examinationTitle?: string;
  subjects: BroadsheetSubject[];
  rows: BroadsheetRow[];
  summary?: BroadsheetSummary;
  onExportCsv?: () => void;
}

export const NoticeBoardBroadsheet: React.FC<NoticeBoardBroadsheetProps> = ({
  schoolName,
  schoolLogoUrl,
  schoolMotto,
  schoolAddress,
  schoolContact,
  className,
  academicYearSession,
  examinationTitle = 'Internal Assessment Semester Examination Results',
  subjects,
  rows,
  summary,
  onExportCsv,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await downloadBroadsheetPdf({
        schoolName: schoolName || 'Health Training Institution',
        schoolLogoUrl,
        schoolMotto,
        schoolAddress,
        schoolContact,
        className,
        academicYearSession,
        examinationTitle,
        subjects,
        rows,
        summary,
      });
    } catch (err) {
      console.error('Failed to generate broadsheet PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }

    // Default CSV exporter
    const headers = [
      'Rank',
      'Reg No',
      'Student Name',
      'Gender',
      ...subjects.flatMap((s) => [`${s.code} Mark`, `${s.code} Grade`, `${s.code} GP`]),
      'CGPA',
      'Standing',
    ];

    const csvRows = [headers.join(',')];

    rows.forEach((r) => {
      const rowData = [
        r.rank,
        `"${r.regNo || ''}"`,
        `"${r.studentName.replace(/"/g, '""')}"`,
        r.gender || '',
        ...subjects.flatMap((s) => {
          const score = r.subjectScores[s.code] || { mark: 0, grade: 'F', gp: 0 };
          return [score.mark, score.grade, score.gp.toFixed(1)];
        }),
        r.cgpa.toFixed(2),
        `"${r.standing}"`,
      ];
      csvRows.push(rowData.join(','));
    });

    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Notice_Board_Broadsheet_${className.replace(/\s+/g, '_')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="w-full rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:rounded-none"
      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
    >
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>Notice Board Master Broadsheet</h2>
          <p className="text-xs" style={{ color: '#64748b' }}>
            Official class broadsheet ranked by CGPA. Optimized for notice board display and academic board review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel / CSV</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF (Landscape)'}</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div ref={containerRef} className="print-broadsheet-container" style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: 8 }}>
        {/* Institutional Header */}
        <div className="border-b-2 border-slate-800 pb-3 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden p-1">
              {schoolLogoUrl ? (
                <img src={schoolLogoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-[10px] font-bold text-slate-400 text-center">CREST</div>
              )}
            </div>

            <div className="flex-1 text-center">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight" style={{ color: '#0b192c' }}>
                {schoolName || 'Health Training Institution'}
              </h1>
              {schoolMotto && <p className="text-[11px] italic" style={{ color: '#475569' }}>"{schoolMotto}"</p>}
              <p className="text-[11px]" style={{ color: '#475569' }}>
                {schoolAddress || 'Uganda'} {schoolContact ? `| Tel: ${schoolContact}` : ''}
              </p>
              <div className="mt-1.5 inline-block px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200">
                {examinationTitle}
              </div>
            </div>

            <div className="w-16 flex-shrink-0 text-right text-[10px]" style={{ color: '#94a3b8' }}>
              <span>Date:</span>
              <div className="font-semibold text-[11px]" style={{ color: '#334155' }}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Metadata Banner */}
          <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs font-medium" style={{ color: '#334155' }}>
            <div>
              <span>Cohort / Class: </span>
              <strong className="uppercase" style={{ color: '#0f172a' }}>{className}</strong>
            </div>
            <div>
              <span>Academic Session: </span>
              <strong style={{ color: '#0f172a' }}>{academicYearSession}</strong>
            </div>
            <div>
              <span>Official Document: </span>
              <strong style={{ color: '#1e3a8a' }}>Notice Board Final Master Marksheet</strong>
            </div>
          </div>
        </div>

        {/* Master Broadsheet Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs border-2 border-slate-800" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
            <thead>
              {/* Row 1: Grouped Subject Headers */}
              <tr style={{ backgroundColor: '#0f2238', color: '#ffffff' }}>
                <th rowSpan={2} style={{ padding: '8px 6px', border: '1px solid #334155', textAlign: 'center', width: '38px', backgroundColor: '#0f2238', color: '#ffffff', fontSize: '11px', fontWeight: 800 }}>
                  RNK
                </th>
                <th rowSpan={2} style={{ padding: '8px 8px', border: '1px solid #334155', textAlign: 'left', width: '110px', backgroundColor: '#0f2238', color: '#ffffff', fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  REG NO.
                </th>
                <th rowSpan={2} style={{ padding: '8px 12px', border: '1px solid #334155', textAlign: 'left', minWidth: '160px', backgroundColor: '#0f2238', color: '#ffffff', fontSize: '11px', fontWeight: 800 }}>
                  STUDENT NAME
                </th>

                {/* Subject Group Columns */}
                {subjects.map((sub) => (
                  <th
                    key={sub.code}
                    colSpan={3}
                    style={{ padding: '6px 4px', border: '1px solid #334155', textAlign: 'center', backgroundColor: '#1e293b', color: '#ffffff' }}
                    title={sub.title}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap' }}>
                      {sub.code} <span style={{ color: '#38bdf8', fontWeight: 700 }}>({sub.creditUnits}CU)</span>
                    </div>
                  </th>
                ))}

                {/* Final Progression Summary Columns */}
                <th rowSpan={2} style={{ padding: '8px 6px', border: '1px solid #334155', textAlign: 'center', width: '55px', backgroundColor: '#451a03', color: '#fef08a', fontSize: '12px', fontWeight: 900 }}>
                  CGPA
                </th>
                <th rowSpan={2} style={{ padding: '8px 8px', border: '1px solid #334155', textAlign: 'center', width: '95px', backgroundColor: '#0f2238', color: '#ffffff', fontSize: '11px', fontWeight: 800 }}>
                  STANDING
                </th>
              </tr>

              {/* Row 2: Sub-headers for each Subject */}
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                {subjects.map((sub) => (
                  <React.Fragment key={`${sub.code}-subheaders`}>
                    <th style={{ padding: '4px 3px', border: '1px solid #334155', textAlign: 'center', fontSize: '10px', fontWeight: 800, backgroundColor: '#0f172a', color: '#f8fafc', width: '40px' }}>
                      Mark
                    </th>
                    <th style={{ padding: '4px 2px', border: '1px solid #334155', textAlign: 'center', fontSize: '10px', fontWeight: 800, backgroundColor: '#0f172a', color: '#2dd4bf', width: '32px' }}>
                      Grd
                    </th>
                    <th style={{ padding: '4px 2px', border: '1px solid #334155', textAlign: 'center', fontSize: '10px', fontWeight: 800, backgroundColor: '#0f172a', color: '#fbbf24', width: '32px' }}>
                      GP
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {rows.map((row, idx) => {
                const isEven = idx % 2 === 0;
                const isFail = row.standing.toLowerCase().includes('retake') || row.standing.toLowerCase().includes('probation');

                return (
                  <tr
                    key={row.studentId || idx}
                    className={`border-b border-slate-300 ${
                      isFail ? 'bg-rose-50/50' : isEven ? 'bg-white' : 'bg-slate-50/70'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-1.5 px-2 border-r border-slate-300 text-center font-bold" style={{ color: '#0f172a' }}>
                      <span style={{ color: '#0f172a' }}>{row.rank}</span>
                    </td>

                    {/* Reg No */}
                    <td className="py-1.5 px-2.5 border-r border-slate-300 font-mono text-[11px] font-semibold whitespace-nowrap" style={{ color: '#334155' }}>
                      <span style={{ color: '#334155' }}>{row.regNo}</span>
                    </td>

                    {/* Student Name */}
                    <td className="py-1.5 px-3 border-r border-slate-300 font-semibold uppercase truncate max-w-[200px]" style={{ color: '#0f172a' }}>
                      <span style={{ color: '#0f172a' }}>{row.studentName}</span>
                    </td>

                    {/* Subject Scores: Mark | Grade | GP */}
                    {subjects.map((sub) => {
                      const sc = row.subjectScores[sub.code] || {
                        mark: 0,
                        grade: 'F',
                        gp: 0,
                        isRetake: true,
                      };
                      const isSubRetake = sc.grade === 'F' || sc.gp === 0 || sc.isRetake;

                      return (
                        <React.Fragment key={`${row.studentId}-${sub.code}`}>
                          <td
                            className={`py-1.5 px-1.5 text-center font-mono font-bold border-r border-slate-200 ${
                              isSubRetake ? 'bg-red-50/40' : ''
                            }`}
                            style={{ color: isSubRetake ? '#dc2626' : '#0f172a' }}
                          >
                            <span style={{ color: isSubRetake ? '#dc2626' : '#0f172a' }}>{sc.mark}</span>
                          </td>
                          <td
                            className="py-1.5 px-1 text-center font-bold text-[11px] border-r border-slate-200"
                            style={{ color: isSubRetake ? '#dc2626' : '#0f766e' }}
                          >
                            <span style={{ color: isSubRetake ? '#dc2626' : '#0f766e' }}>{sc.grade}</span>
                          </td>
                          <td
                            className="py-1.5 px-1 text-center font-mono text-[11px] border-r border-slate-300"
                            style={{ color: isSubRetake ? '#dc2626' : '#475569' }}
                          >
                            <span style={{ color: isSubRetake ? '#dc2626' : '#475569' }}>{sc.gp.toFixed(1)}</span>
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Final CGPA (NO Total or Average marks) */}
                    <td className="py-1.5 px-2 text-center font-mono font-black text-xs border-r border-slate-300 bg-amber-50" style={{ color: '#78350f' }}>
                      <span style={{ color: '#78350f' }}>{row.cgpa.toFixed(2)}</span>
                    </td>

                    {/* Academic Standing */}
                    <td className="py-1.5 px-2 text-center font-bold text-[11px]">
                      {row.standing === 'Pass (NP)' ? (
                        <span style={{ color: '#047857' }}>Pass (NP)</span>
                      ) : (
                        <span style={{ color: '#b91c1c' }}>Retake</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Statistics Strip */}
        <div className="mt-4 p-3 rounded-lg border border-slate-300 bg-slate-50 text-xs" style={{ color: '#1e293b' }}>
          <div className="flex flex-wrap items-center justify-between gap-4 font-medium">
            <div>
              <span style={{ color: '#475569' }}>Total Trainees: </span>
              <strong style={{ color: '#0f172a' }}>{summary?.totalStudents ?? rows.length}</strong>
            </div>
            <div>
              <span style={{ color: '#475569' }}>Normal Progress (NP): </span>
              <strong style={{ color: '#047857' }}>
                {summary?.passedCount ?? rows.filter((r) => r.standing === 'Pass (NP)').length}
              </strong>
            </div>
            <div>
              <span style={{ color: '#475569' }}>Retakes: </span>
              <strong style={{ color: '#dc2626' }}>
                {summary?.retakeCount ?? rows.filter((r) => r.standing !== 'Pass (NP)').length}
              </strong>
            </div>
            <div>
              <span style={{ color: '#475569' }}>Highest CGPA: </span>
              <strong style={{ color: '#1e3a8a' }}>
                {summary?.highestCGPA !== undefined
                  ? summary.highestCGPA.toFixed(2)
                  : rows[0]?.cgpa?.toFixed(2) ?? '—'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#475569' }}>Class Average CGPA: </span>
              <strong style={{ color: '#581c87' }}>
                {summary?.averageCGPA !== undefined
                  ? summary.averageCGPA.toFixed(2)
                  : rows.length > 0
                  ? (rows.reduce((sum, r) => sum + r.cgpa, 0) / rows.length).toFixed(2)
                  : '—'}
              </strong>
            </div>
          </div>
        </div>

        {/* Official Signatures & Notice Board Authorization */}
        <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs" style={{ color: '#334155' }}>
          <div>
            <div className="border-b border-slate-400 h-10 mb-1 flex items-end">
              <span className="text-[10px] italic" style={{ color: '#94a3b8' }}>Signature &amp; Date</span>
            </div>
            <strong className="block" style={{ color: '#0f172a' }}>Head of Department / Tutor in Charge</strong>
            <span className="text-[10px]" style={{ color: '#64748b' }}>School of Nursing &amp; Midwifery</span>
          </div>

          <div>
            <div className="border-b border-slate-400 h-10 mb-1 flex items-end justify-between">
              <span className="text-[10px] italic" style={{ color: '#94a3b8' }}>Signature</span>
              <span className="text-[10px] italic" style={{ color: '#94a3b8' }}>[Official College Stamp]</span>
            </div>
            <strong className="block" style={{ color: '#0f172a' }}>Academic Registrar / Principal</strong>
            <span className="text-[10px]" style={{ color: '#64748b' }}>Oxford School of Nursing</span>
          </div>
        </div>

        {/* Grading Key Note */}
        <div className="mt-4 pt-2 border-t border-slate-200 text-[10px] flex flex-wrap items-center justify-between gap-2" style={{ color: '#64748b' }}>
          <div>
            <strong style={{ color: '#334155' }}>UNMEB / UHPAB Grading Scale: </strong>
            <span>A (80-100%, 5.0 GP) | B+ (75-79%, 4.5 GP) | B (70-74%, 4.0 GP) | C+ (65-69%, 3.5 GP) | C (60-64%, 3.0 GP) | D (50-59%, 2.0 GP) | F (&lt;50%, 0.0 GP - Fail/Retake)</span>
          </div>
          <div className="italic" style={{ color: '#94a3b8' }}>
            NP = Normal Progress | Any alteration invalidates this official notice board broadsheet
          </div>
        </div>
      </div>

      {/* Scoped Styling to guarantee dark text in both dark & light modes */}
      <style>{`
        .print-broadsheet-container {
          color: #0f172a !important;
          background-color: #ffffff !important;
        }
        .print-broadsheet-container table {
          color: #0f172a !important;
          background-color: #ffffff !important;
        }
        .print-broadsheet-container tbody td {
          color: #0f172a !important;
        }
        .print-broadsheet-container tbody td span {
          color: inherit;
        }
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-size: 10px !important;
          }
          .print-broadsheet-container {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NoticeBoardBroadsheet;
