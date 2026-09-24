import React from 'react';
import {
  TertiaryStudentProfile,
  SemesterStage,
  AlphabeticalGrade,
  HospitalWardPosting,
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
  wardPostings?: HospitalWardPosting[];
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
  wardPostings = [],
  showFeesBalance = false,
  nextSemesterStartDate,
  registrarRemarks,
}) => {
  const isRetakeStanding = academicStanding.toUpperCase().includes('PROBATION') || academicStanding.toUpperCase().includes('RETAKE');
  const stageLabel = STAGE_LABELS[semesterStage] || semesterStage;

  const totalCredits = units.reduce((sum, u) => sum + (Number(u.creditUnits) || 0), 0);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-4 print:max-w-none text-sm font-sans">
      {/* Institution Header */}
      <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
        <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1">
          {schoolLogoUrl ? (
            <img src={schoolLogoUrl} alt="School Logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="text-center font-bold text-xs text-slate-400">SCHOOL CREST</div>
          )}
        </div>

        <div className="text-center flex-1 px-4">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-blue-900 print:text-black">
            {schoolName || 'Health Training Institution'}
          </h1>
          {schoolMotto && <p className="text-xs italic text-slate-600 mt-0.5">"{schoolMotto}"</p>}
          <p className="text-xs text-slate-600 mt-1">
            {schoolAddress || 'Kampala, Uganda'} {schoolContact ? `| Tel: ${schoolContact}` : ''}
          </p>
          <div className="mt-2 inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
            {mode === 'uhpab' || mode === 'unmeb'
              ? 'Official UHPAB Semester Examination Results Slip'
              : 'Continuous Assessment & Internal Examination Slip'}
          </div>
        </div>

        <div className="w-24 h-28 flex-shrink-0 border-2 border-slate-300 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-[10px] text-slate-400 font-semibold p-1">PASSPORT PHOTO</div>
          )}
        </div>
      </div>

      {/* Candidate Profile Info Grid */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
        <div>
          <span className="text-slate-500 block font-medium">Student Name:</span>
          <span className="font-bold text-slate-900 text-sm uppercase">{student.fullName}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">College Reg Number:</span>
          <span className="font-bold text-slate-900">{student.collegeRegNo || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">UHPAB Exam Number:</span>
          <span className="font-bold text-blue-700">{student.uhpabExamNo || student.unmebExamNo || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">NSIN Number:</span>
          <span className="font-bold text-slate-900">{student.nsinNumber || '—'}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Programme:</span>
          <span className="font-bold text-slate-900">{student.programmeName || student.programmeCode || 'Certificate in Nursing'}</span>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Current Stage & Session:</span>
          <span className="font-bold text-slate-900">{stageLabel} ({academicYearSession})</span>
        </div>
      </div>

      {/* Course Units Performance Table */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs border border-slate-300">
          <thead>
            <tr className="bg-slate-800 text-white font-semibold">
              <th className="py-2.5 px-3 border border-slate-700 w-24">Code</th>
              <th className="py-2.5 px-3 border border-slate-700">Course Unit Title</th>
              <th className="py-2.5 px-2 border border-slate-700 text-center w-12">CU</th>
              {mode === 'internal' && (
                <>
                  <th className="py-2.5 px-2 border border-slate-700 text-center w-16">CAT (30%)</th>
                  <th className="py-2.5 px-2 border border-slate-700 text-center w-16">EXAM (70%)</th>
                </>
              )}
              <th className="py-2.5 px-2 border border-slate-700 text-center w-16">Total %</th>
              <th className="py-2.5 px-2 border border-slate-700 text-center w-12">Grade</th>
              <th className="py-2.5 px-2 border border-slate-700 text-center w-12">GP</th>
              <th className="py-2.5 px-3 border border-slate-700 text-center w-20">Status</th>
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
                  <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">{u.code}</td>
                  <td className="py-2.5 px-3 text-slate-800 border-r border-slate-200 font-medium">{u.title}</td>
                  <td className="py-2.5 px-2 text-center text-slate-700 border-r border-slate-200">
                    {u.creditUnits.toFixed(1)}
                  </td>
                  {mode === 'internal' && (
                    <>
                      <td className="py-2.5 px-2 text-center text-slate-700 border-r border-slate-200">
                        {u.courseworkScore !== undefined ? u.courseworkScore : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-700 border-r border-slate-200">
                        {u.examScore !== undefined ? u.examScore : '—'}
                      </td>
                    </>
                  )}
                  <td className="py-2.5 px-2 text-center font-bold text-slate-900 border-r border-slate-200">
                    {u.totalScore !== undefined ? u.totalScore : '—'}
                  </td>
                  <td className={`py-2.5 px-2 text-center font-black border-r border-slate-200 ${isRetake ? 'text-red-600' : 'text-slate-900'}`}>
                    {u.grade}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-800 border-r border-slate-200">
                    {u.gradePoint.toFixed(1)}
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

      {/* Clinical Ward Practicum & Logbook Status */}
      {wardPostings && wardPostings.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-4 mb-6 bg-blue-50/40">
          <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900 mb-2">
            Hospital Ward Practicum & Physical Logbook Verification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {wardPostings.map((p, idx) => (
              <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-800 block">{p.wardName}</span>
                  <span className="text-slate-500 text-[11px]">{p.hospitalName}</span>
                </div>
                <div className="text-right">
                  {p.physicalLogbookVerified ? (
                    <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Logbook Cleared
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Pending Inspection
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remarks & Fees Clearance */}
      <div className="border-t border-slate-200 pt-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <span className="font-bold text-slate-700 block mb-1">Academic Registrar Remarks:</span>
          <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">
            {registrarRemarks || (isRetakeStanding ? 'Advised to register for supplementary / retake examination in the failed paper(s).' : 'Satisfactory academic progress. Cleared to proceed to the next semester.')}
          </p>
        </div>

        <div>
          {showFeesBalance && (
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-2">
              <span className="font-bold text-slate-700 block">Financial Account Status:</span>
              <span className="text-slate-600">
                {student.feesCleared
                  ? 'All tuition and examination fees cleared.'
                  : `Outstanding Balance: UGX ${(student.feesBalance || 0).toLocaleString()}`}
              </span>
            </div>
          )}
          {nextSemesterStartDate && (
            <p className="text-slate-600 text-xs">
              <span className="font-bold text-slate-700">Next Semester Reporting Date:</span> {nextSemesterStartDate}
            </p>
          )}
        </div>
      </div>

      {/* Official Signatures Block */}
      <div className="flex justify-between items-end border-t border-slate-200 pt-8 mt-6">
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-10 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">[Official Stamp]</span>
          </div>
          <span className="font-bold text-xs text-slate-800 block">Academic Registrar</span>
        </div>

        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-10 flex items-end justify-center pb-1">
            <span className="text-[10px] text-slate-400 italic">[Signature / Date]</span>
          </div>
          <span className="font-bold text-xs text-slate-800 block">Principal / Dean</span>
        </div>
      </div>

      {/* Grading Key Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-500">
        <span className="font-bold block text-slate-700 mb-0.5">UHPAB 5.0 Grading Key:</span>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {UHPAB_STANDARD_GRADING_SCALE.map((s) => (
            <span key={s.grade}>
              <strong>{s.grade}</strong> ({s.gradePoint.toFixed(1)} GP: {s.minScore}-{s.maxScore}%)
            </span>
          ))}
        </div>
        <p className="mt-1 italic text-slate-400">
          * A score below 50.0% in any course unit constitutes a fail and must be retaken. Any alteration renders this slip invalid.
        </p>
      </div>
    </div>
  );
};

export default SemesterResultSlip;
