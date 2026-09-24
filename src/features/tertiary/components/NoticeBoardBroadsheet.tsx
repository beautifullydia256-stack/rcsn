import React from 'react';
import { Printer, Download, FileSpreadsheet } from 'lucide-react';

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
  summary?: {
    totalStudents: number;
    passedCount: number;
    retakeCount: number;
    highestCGPA: number;
    lowestCGPA: number;
    averageCGPA: number;
  };
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
  const handlePrint = () => {
    window.print();
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
    <div className="w-full bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 print:p-0 print:border-none print:shadow-none print:rounded-none">
      {/* Action Toolbar (Hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h2 className="text-base font-bold text-slate-900">Notice Board Master Broadsheet</h2>
          <p className="text-xs text-slate-500">
            Official class broadsheet ranked by CGPA. Optimized for notice board display and academic board review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export Excel / CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Broadsheet (Landscape)
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="print-broadsheet-container">
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
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-blue-950 print:text-black">
                {schoolName || 'Health Training Institution'}
              </h1>
              {schoolMotto && <p className="text-[11px] italic text-slate-600">"{schoolMotto}"</p>}
              <p className="text-[11px] text-slate-600">
                {schoolAddress || 'Uganda'} {schoolContact ? `| Tel: ${schoolContact}` : ''}
              </p>
              <div className="mt-1.5 inline-block px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200">
                {examinationTitle}
              </div>
            </div>

            <div className="w-16 flex-shrink-0 text-right text-[10px] text-slate-400">
              <span>Date:</span>
              <div className="font-semibold text-slate-700 text-[11px]">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Metadata Banner */}
          <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 font-medium">
            <div>
              <span>Cohort / Class: </span>
              <strong className="text-slate-900 uppercase">{className}</strong>
            </div>
            <div>
              <span>Academic Session: </span>
              <strong className="text-slate-900">{academicYearSession}</strong>
            </div>
            <div>
              <span>Official Document: </span>
              <strong className="text-blue-900">Notice Board Final Master Marksheet</strong>
            </div>
          </div>
        </div>

        {/* Master Broadsheet Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs border-2 border-slate-800">
            <thead>
              {/* Row 1: Grouped Subject Headers */}
              <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                <th rowSpan={2} className="py-2 px-2 border border-slate-700 text-center w-10">
                  RNK
                </th>
                <th rowSpan={2} className="py-2 px-2.5 border border-slate-700 w-28 whitespace-nowrap">
                  REG NO.
                </th>
                <th rowSpan={2} className="py-2 px-3 border border-slate-700 min-w-[160px]">
                  STUDENT NAME
                </th>

                {/* Subject Group Columns */}
                {subjects.map((sub) => (
                  <th
                    key={sub.code}
                    colSpan={3}
                    className="py-1.5 px-1 border border-slate-700 text-center bg-slate-800"
                    title={sub.title}
                  >
                    <div className="truncate max-w-[150px] mx-auto">
                      {sub.code} ({sub.creditUnits}CU)
                    </div>
                  </th>
                ))}

                {/* Final Progression Summary Columns (NO Total / Average Marks as instructed) */}
                <th rowSpan={2} className="py-2 px-2 border border-slate-700 text-center w-14 bg-amber-950/80 text-amber-200 font-black">
                  CGPA
                </th>
                <th rowSpan={2} className="py-2 px-2.5 border border-slate-700 text-center w-24">
                  STANDING
                </th>
              </tr>

              {/* Row 2: Sub-headers for each Subject */}
              <tr className="bg-slate-800 text-slate-200 text-[10px] font-semibold uppercase text-center">
                {subjects.map((sub) => (
                  <React.Fragment key={`${sub.code}-subheaders`}>
                    <th className="py-1 px-1.5 border border-slate-700 w-11 text-center font-bold text-slate-100">
                      Mark
                    </th>
                    <th className="py-1 px-1 border border-slate-700 w-9 text-center font-bold text-teal-300">
                      Grd
                    </th>
                    <th className="py-1 px-1 border border-slate-700 w-9 text-center font-bold text-amber-300">
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
                    } hover:bg-blue-50/40 transition`}
                  >
                    {/* Rank */}
                    <td className="py-1.5 px-2 border-r border-slate-300 text-center font-bold text-slate-800">
                      {row.rank}
                    </td>

                    {/* Reg No */}
                    <td className="py-1.5 px-2.5 border-r border-slate-300 font-mono text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                      {row.regNo}
                    </td>

                    {/* Student Name */}
                    <td className="py-1.5 px-3 border-r border-slate-300 font-semibold text-slate-900 uppercase truncate max-w-[200px]">
                      {row.studentName}
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
                              isSubRetake ? 'text-red-600 bg-red-50/40' : 'text-slate-900'
                            }`}
                          >
                            {sc.mark}
                          </td>
                          <td
                            className={`py-1.5 px-1 text-center font-bold text-[11px] border-r border-slate-200 ${
                              isSubRetake ? 'text-red-600' : 'text-teal-700'
                            }`}
                          >
                            {sc.grade}
                          </td>
                          <td
                            className={`py-1.5 px-1 text-center font-mono text-[11px] border-r border-slate-300 ${
                              isSubRetake ? 'text-red-600 font-bold' : 'text-slate-600'
                            }`}
                          >
                            {sc.gp.toFixed(1)}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Final CGPA (NO Total or Average marks) */}
                    <td className="py-1.5 px-2 text-center font-mono font-black text-xs border-r border-slate-300 bg-amber-50 text-amber-900">
                      {row.cgpa.toFixed(2)}
                    </td>

                    {/* Academic Standing */}
                    <td className="py-1.5 px-2 text-center font-bold text-[11px]">
                      {row.standing === 'Pass (NP)' ? (
                        <span className="text-emerald-700">Pass (NP)</span>
                      ) : (
                        <span className="text-red-700">Retake</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Statistics Strip */}
        <div className="mt-4 p-3 rounded-lg border border-slate-300 bg-slate-50 text-xs text-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 font-medium">
            <div>
              <span>Total Trainees: </span>
              <strong className="text-slate-900 font-bold">{summary?.totalStudents ?? rows.length}</strong>
            </div>
            <div>
              <span>Normal Progress (NP): </span>
              <strong className="text-emerald-700 font-bold">
                {summary?.passedCount ?? rows.filter((r) => r.standing === 'Pass (NP)').length}
              </strong>
            </div>
            <div>
              <span>Retakes: </span>
              <strong className="text-red-600 font-bold">
                {summary?.retakeCount ?? rows.filter((r) => r.standing !== 'Pass (NP)').length}
              </strong>
            </div>
            <div>
              <span>Highest CGPA: </span>
              <strong className="text-blue-900 font-bold">
                {summary?.highestCGPA !== undefined
                  ? summary.highestCGPA.toFixed(2)
                  : rows[0]?.cgpa?.toFixed(2) ?? '—'}
              </strong>
            </div>
            <div>
              <span>Class Average CGPA: </span>
              <strong className="text-purple-900 font-bold">
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
        <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-800">
          <div>
            <div className="border-b border-slate-400 h-10 mb-1 flex items-end">
              <span className="text-[10px] text-slate-400 italic">Signature & Date</span>
            </div>
            <strong className="block text-slate-900">Head of Department / Tutor in Charge</strong>
            <span className="text-[10px] text-slate-500">School of Nursing & Midwifery</span>
          </div>

          <div>
            <div className="border-b border-slate-400 h-10 mb-1 flex items-end justify-between">
              <span className="text-[10px] text-slate-400 italic">Signature</span>
              <span className="text-[10px] text-slate-400 italic">[Official College Stamp]</span>
            </div>
            <strong className="block text-slate-900">Academic Registrar / Principal</strong>
            <span className="text-[10px] text-slate-500">Oxford School of Nursing</span>
          </div>
        </div>

        {/* Grading Key Note */}
        <div className="mt-4 pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>UNMEB / UHPAB Grading Scale: </strong>
            <span>A (80-100%, 5.0 GP) | B+ (75-79%, 4.5 GP) | B (70-74%, 4.0 GP) | C+ (65-69%, 3.5 GP) | C (60-64%, 3.0 GP) | D (50-59%, 2.0 GP) | F (&lt;50%, 0.0 GP - Fail/Retake)</span>
          </div>
          <div className="italic text-slate-400">
            NP = Normal Progress | Any alteration invalidates this official notice board broadsheet
          </div>
        </div>
      </div>

      {/* Print Landscape CSS Styling */}
      <style>{`
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
