import React from 'react';
import {
  TertiaryStudentProfile,
  SemesterStage,
  AlphabeticalGrade,
} from '../types';
import { STAGE_LABELS, UHPAB_STANDARD_GRADING_SCALE, UNMEB_STANDARD_GRADING_SCALE } from '../data/unmebCurriculumDefaults';

export interface ResultSlipUnitItem {
  code: string;
  title: string;
  creditUnits: number;
  courseworkScore?: number; // e.g. 24/30
  examScore?: number; // e.g. 52/70
  totalScore?: number; // e.g. 76%
  grade: AlphabeticalGrade;
  gradePoint: number;
  status: 'PASS' | 'RETAKE';
}

export interface SemesterResultSlipProps {
  schoolName: string;
  schoolLogoUrl?: string;
  schoolMotto?: string;
  schoolAddress?: string;
  schoolContact?: string;
  mode: 'internal' | 'uhpab' | 'unmeb';
  student: TertiaryStudentProfile;
  semesterStage: SemesterStage;
  academicYearSession: string; // e.g. "2024/2025 Semester 1"
  units: ResultSlipUnitItem[];
  semesterGPA: number;
  cumulativeCGPA: number;
  academicStanding: string; // e.g. "NORMAL PROGRESS (NP)" or "PROBATION (PB)"
  wardPostings?: any[];
  showFeesBalance?: boolean;
  nextSemesterStartDate?: string;
  registrarRemarks?: string;
}

export const SemesterResultSlip: React.FC<SemesterResultSlipProps> = ({
  schoolName,
  schoolLogoUrl,
  schoolMotto,
  schoolAddress,
  schoolContact,
  mode,
  student,
  semesterStage,
  academicYearSession,
  units,
  semesterGPA,
  cumulativeCGPA,
  academicStanding,
  showFeesBalance = false,
  nextSemesterStartDate,
}) => {
  const isRetakeStanding = academicStanding.toLowerCase().includes('retake') || academicStanding.toLowerCase().includes('probation');
  const stageDisplay = STAGE_LABELS[semesterStage] || semesterStage;

  const totalCredits = units.reduce((acc, u) => acc + u.creditUnits, 0);

  return (
    <div
      className="print-result-slip-container max-w-4xl mx-auto rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl"
      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
    >
      {/* Institutional Letterhead Header */}
      <div className="border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden p-1">
            {schoolLogoUrl ? (
              <img src={schoolLogoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-xs font-bold text-slate-400 text-center">INSTITUTION CREST</div>
            )}
          </div>

          <div className="flex-1 text-center">
            <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: '#0b192c' }}>
              {schoolName || 'Oxford School of Nursing & Midwifery'}
            </h1>
            {schoolMotto && <p className="text-xs italic" style={{ color: '#475569' }}>"{schoolMotto}"</p>}
            <p className="text-xs" style={{ color: '#475569' }}>
              {schoolAddress || 'P.O. Box 712, Uganda'} {schoolContact ? `| Tel: ${schoolContact}` : ''}
            </p>
            <div className="mt-2 inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200">
              {mode === 'internal'
                ? 'Internal Semester Assessment Result Slip'
                : 'Uganda UNMEB / UHPAB Formal Semester Result Slip'}
            </div>
          </div>

          <div className="w-20 flex-shrink-0 text-right text-xs" style={{ color: '#64748b' }}>
            <span>Date:</span>
            <div className="font-semibold text-slate-700">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Trainee Particulars Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6" style={{ color: '#1e293b' }}>
        <div>
          <span className="block text-[11px]" style={{ color: '#64748b' }}>Trainee Name</span>
          <strong className="text-sm uppercase block truncate" style={{ color: '#0f172a' }}>{student.fullName}</strong>
        </div>
        <div>
          <span className="block text-[11px]" style={{ color: '#64748b' }}>College Reg. No.</span>
          <strong className="text-sm font-mono block" style={{ color: '#0f172a' }}>{student.collegeRegNo}</strong>
        </div>
        <div>
          <span className="block text-[11px]" style={{ color: '#64748b' }}>Academic Programme</span>
          <strong className="text-sm block truncate" style={{ color: '#0f172a' }}>{student.programmeName}</strong>
        </div>
        <div>
          <span className="block text-[11px]" style={{ color: '#64748b' }}>Semester Stage</span>
          <strong className="text-sm block" style={{ color: '#0f172a' }}>{stageDisplay} ({academicYearSession})</strong>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse text-left text-xs border border-slate-300" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
          <thead>
            <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 border border-slate-700 w-24 text-white">Course Code</th>
              <th className="py-2.5 px-3 border border-slate-700 text-white">Course Unit Title</th>
              <th className="py-2.5 px-2 border border-slate-700 text-center w-14 text-white">CU</th>
              {mode === 'internal' && (
                <>
                  <th className="py-2.5 px-2 border border-slate-700 text-center w-16 text-white">CAT (30%)</th>
                  <th className="py-2.5 px-2 border border-slate-700 text-center w-16 text-white">EXAM (70%)</th>
                </>
              )}
              <th className="py-2.5 px-2 border border-slate-700 text-center w-16 text-white">Total %</th>
              <th className="py-2.5 px-2 border border-slate-700 text-center w-12 text-white">Grade</th>
              <th className="py-2.5 px-2 border border-slate-700 text-center w-12 text-white">GP</th>
              <th className="py-2.5 px-3 border border-slate-700 text-center w-20 text-white">Status</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u, idx) => {
              const isRetake = u.status === 'RETAKE' || u.gradePoint < 2.0;
              return (
                <tr
                  key={u.code || idx}
                  className={`border-b border-slate-200 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  } ${isRetake ? 'bg-red-50/60' : ''}`}
                >
                  <td className="py-2.5 px-3 font-bold border-r border-slate-200" style={{ color: '#0f172a' }}>
                    <span style={{ color: '#0f172a' }}>{u.code}</span>
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-200 font-medium" style={{ color: '#1e293b' }}>
                    <span style={{ color: '#1e293b' }}>{u.title}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center border-r border-slate-200" style={{ color: '#334155' }}>
                    <span style={{ color: '#334155' }}>{u.creditUnits.toFixed(1)}</span>
                  </td>
                  {mode === 'internal' && (
                    <>
                      <td className="py-2.5 px-2 text-center border-r border-slate-200" style={{ color: '#334155' }}>
                        <span style={{ color: '#334155' }}>{u.courseworkScore !== undefined ? u.courseworkScore : '—'}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-slate-200" style={{ color: '#334155' }}>
                        <span style={{ color: '#334155' }}>{u.examScore !== undefined ? u.examScore : '—'}</span>
                      </td>
                    </>
                  )}
                  <td className="py-2.5 px-2 text-center font-bold border-r border-slate-200" style={{ color: '#0f172a' }}>
                    <span style={{ color: '#0f172a' }}>{u.totalScore !== undefined ? u.totalScore : '—'}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-black border-r border-slate-200" style={{ color: isRetake ? '#dc2626' : '#0f766e' }}>
                    <span style={{ color: isRetake ? '#dc2626' : '#0f766e' }}>{u.grade}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold border-r border-slate-200" style={{ color: isRetake ? '#dc2626' : '#334155' }}>
                    <span style={{ color: isRetake ? '#dc2626' : '#334155' }}>{u.gradePoint.toFixed(1)}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    {isRetake ? (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-red-100 text-red-700 border border-red-200">
                        RETAKE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-700 border border-emerald-200">
                        PASS
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Progression Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 text-white rounded-xl p-4 mb-6">
        <div>
          <span className="text-slate-400 text-xs block">Total Credits Enrolled</span>
          <span className="text-xl font-bold">{totalCredits.toFixed(1)} CU</span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Semester GPA / Cumulative CGPA</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-amber-400">GPA {semesterGPA.toFixed(2)}</span>
            <span className="text-sm font-semibold text-slate-300">| CGPA {cumulativeCGPA.toFixed(2)}</span>
          </div>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Academic Progress Standing</span>
          <span className={`text-sm font-bold uppercase ${isRetakeStanding ? 'text-red-400' : 'text-emerald-400'}`}>
            {academicStanding}
          </span>
        </div>
      </div>

      {/* Fees Clearance & Next Semester Date (No Conduct Comments for Tertiary) */}
      {(showFeesBalance || nextSemesterStartDate) && (
        <div className="border-t border-slate-200 pt-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs" style={{ color: '#334155' }}>
          {showFeesBalance && (
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="font-bold block" style={{ color: '#0f172a' }}>Financial Account Status:</span>
              <span style={{ color: '#475569' }}>
                {student.feesCleared
                  ? 'All tuition and examination fees cleared.'
                  : `Outstanding Balance: UGX ${(student.feesBalance || 0).toLocaleString()}`}
              </span>
            </div>
          )}
          {nextSemesterStartDate && (
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center">
              <p className="text-xs" style={{ color: '#475569' }}>
                <span className="font-bold" style={{ color: '#0f172a' }}>Next Semester Reporting Date:</span> {nextSemesterStartDate}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Official Signatures Block */}
      <div className="flex justify-between items-end border-t border-slate-200 pt-8 mt-6">
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-10 flex items-end justify-center pb-1">
            <span className="text-[10px] italic" style={{ color: '#94a3b8' }}>[Official Stamp]</span>
          </div>
          <span className="font-bold text-xs block" style={{ color: '#0f172a' }}>Academic Registrar</span>
        </div>

        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-10 flex items-end justify-center pb-1">
            <span className="text-[10px] italic" style={{ color: '#94a3b8' }}>[Signature / Date]</span>
          </div>
          <span className="font-bold text-xs block" style={{ color: '#0f172a' }}>Principal / Dean</span>
        </div>
      </div>

      {/* Grading Key Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-[10px]" style={{ color: '#64748b' }}>
        <span className="font-bold block mb-0.5" style={{ color: '#1e293b' }}>
          {mode === 'unmeb' ? 'UNMEB' : 'UHPAB'} 5.0 Grading Key:
        </span>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {(mode === 'unmeb' ? UNMEB_STANDARD_GRADING_SCALE : UHPAB_STANDARD_GRADING_SCALE).map((s) => (
            <span key={s.grade}>
              <strong style={{ color: '#0f172a' }}>{s.grade}</strong> ({s.gradePoint.toFixed(1)} GP: {s.minScore}-{s.maxScore}%)
            </span>
          ))}
        </div>
        <p className="mt-1 italic" style={{ color: '#94a3b8' }}>
          * A score below 50.0% in any course unit constitutes a fail and must be retaken. Any alteration renders this slip invalid.
        </p>
      </div>

      {/* Scoped CSS for Dark Mode Overrides */}
      <style>{`
        .print-result-slip-container {
          color: #0f172a !important;
          background-color: #ffffff !important;
        }
        .print-result-slip-container table {
          color: #0f172a !important;
          background-color: #ffffff !important;
        }
        .print-result-slip-container tbody td {
          color: #0f172a !important;
        }
        .print-result-slip-container tbody td span {
          color: inherit;
        }
      `}</style>
    </div>
  );
};

export default SemesterResultSlip;
