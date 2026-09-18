import React from 'react';
import {
  TertiaryStudentProfile,
  SemesterStage,
  AlphabeticalGrade,
  AwardClassification,
} from '../types';
import {
  STAGE_LABELS,
  UNMEB_STANDARD_GRADING_SCALE,
} from '../data/unmebCurriculumDefaults';
import { formatAwardLabel } from '../services/gradingEngine';

export interface TranscriptSemesterBlock {
  stage: SemesterStage;
  stageLabel: string;
  semesterGPA: number;
  cumulativeCGPA: number;
  units: {
    code: string;
    title: string;
    gradePoint: number;
    grade: AlphabeticalGrade;
  }[];
}

export interface AcademicTranscriptProps {
  schoolName: string;
  schoolLogoUrl?: string;
  schoolAddress?: string;
  schoolContact?: string;
  schoolEmail?: string;
  student: TertiaryStudentProfile;
  serialNumber: string; // e.g. "0020095"
  yearOfEntry: string; // e.g. "Jan-2022"
  yearOfCompletion: string; // e.g. "Jun-2024"
  awardConferred: string; // e.g. "CERTIFICATE IN NURSING"
  awardClassification: AwardClassification;
  finalCGPA: number;
  semesters: TranscriptSemesterBlock[];
  issueDate?: string;
  verificationUrl?: string;
  printMode?: 'full' | 'preprinted'; // 'full' prints borders/headers; 'preprinted' overlays on stationery
}

export const AcademicTranscript: React.FC<AcademicTranscriptProps> = ({
  schoolName,
  schoolLogoUrl,
  schoolAddress,
  schoolContact,
  schoolEmail,
  student,
  serialNumber,
  yearOfEntry,
  yearOfCompletion,
  awardConferred,
  awardClassification,
  finalCGPA,
  semesters,
  issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  verificationUrl,
  printMode = 'full',
}) => {
  const isPreprinted = printMode === 'preprinted';

  return (
    <div className="w-full max-w-4xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-300 print:border-none print:shadow-none print:p-2 print:max-w-none font-serif text-xs">
      {/* Official Security Border (Suppressed in preprinted mode) */}
      <div className={`${isPreprinted ? '' : 'border-4 border-double border-blue-900 p-6 sm:p-8 rounded-lg'}`}>
        {/* Header Block */}
        {!isPreprinted && (
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
            <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center p-1 bg-slate-50 border border-slate-200 rounded-lg">
              {schoolLogoUrl ? (
                <img src={schoolLogoUrl} alt="Institution Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-[10px] font-bold text-slate-400 text-center">OFFICIAL CREST</div>
              )}
            </div>

            <div className="text-center flex-1 px-4 font-sans">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-blue-950">
                {schoolName || 'Health Training Institution'}
              </h1>
              <p className="text-xs font-semibold text-slate-700 tracking-wide uppercase mt-0.5">
                Office of the Academic Registrar
              </p>
              <p className="text-[11px] text-slate-500">
                {schoolAddress || 'P.O. Box 5, Uganda'} {schoolContact ? `| Tel: ${schoolContact}` : ''} {schoolEmail ? `| Email: ${schoolEmail}` : ''}
              </p>
              <h2 className="text-xl font-extrabold uppercase tracking-widest text-slate-900 mt-2 border-y border-slate-900 py-0.5 inline-block">
                Academic Transcript
              </h2>
            </div>

            <div className="w-20 h-24 flex-shrink-0 border border-slate-400 rounded overflow-hidden bg-slate-100 flex items-center justify-center">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="text-[9px] text-slate-400 text-center font-sans font-bold p-1">PASSPORT PHOTO</div>
              )}
            </div>
          </div>
        )}

        {/* Serial Number & Verification Bar */}
        <div className="flex justify-between items-center text-[11px] font-mono font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
          <span>SERIAL NO: {serialNumber || '0020095'}</span>
          <span>DATE OF ISSUE: {issueDate}</span>
          <span>PROGRAMME CODE: {student.programmeCode || 'CN'}</span>
        </div>

        {/* Candidate Credentials Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-sans text-xs mb-6 bg-slate-50/70 p-3 rounded border border-slate-200">
          <div>
            <span className="font-semibold text-slate-600">CANDIDATE NAME:</span>{' '}
            <span className="font-extrabold text-slate-900 uppercase">{student.fullName}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">YEAR OF ENTRY:</span>{' '}
            <span className="font-bold text-slate-900">{yearOfEntry}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">UNMEB EXAM NO:</span>{' '}
            <span className="font-black text-blue-900">{student.unmebExamNo || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">YEAR OF COMPLETION:</span>{' '}
            <span className="font-bold text-slate-900">{yearOfCompletion}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">NSIN NUMBER:</span>{' '}
            <span className="font-bold text-slate-900">{student.nsinNumber || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">COLLEGE REG NO:</span>{' '}
            <span className="font-bold text-slate-900">{student.collegeRegNo || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">DATE OF BIRTH:</span>{' '}
            <span className="font-bold text-slate-900">{student.dateOfBirth || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">PROGRAMME AWARD:</span>{' '}
            <span className="font-extrabold text-slate-900 uppercase">{awardConferred}</span>
          </div>
        </div>

        {/* Multi-Semester Academic Progression Grid (The UNMEB 2-Column / Sequential Format) */}
        <div className="space-y-4 mb-6">
          {semesters.map((sem, sIdx) => (
            <div key={sIdx} className="border-t border-slate-300 pt-2">
              <div className="font-sans font-black text-xs uppercase tracking-wider text-blue-950 mb-1">
                {sem.stageLabel || STAGE_LABELS[sem.stage] || sem.stage}
              </div>

              <div className="space-y-1">
                {sem.units.map((u, uIdx) => (
                  <div key={uIdx} className="flex justify-between items-center text-xs py-0.5 hover:bg-slate-50">
                    <span className="font-mono font-bold text-slate-900 w-20">{u.code}</span>
                    <span className="flex-1 text-slate-800 pr-4">{u.title}</span>
                    <span className="font-mono font-bold w-12 text-right text-slate-800">{u.gradePoint.toFixed(1)}</span>
                    <span className="font-mono font-black w-10 text-right text-slate-900">{u.grade}</span>
                  </div>
                ))}
              </div>

              {/* Semester Summary Line */}
              <div className="flex justify-end gap-6 font-sans font-bold text-[11px] pt-1 mt-1 border-t border-dotted border-slate-300 text-slate-700">
                <span>SEMESTER GPA: <strong className="text-slate-900">{sem.semesterGPA.toFixed(2)}</strong></span>
                <span>CUMULATIVE CGPA: <strong className="text-slate-900">{sem.cumulativeCGPA.toFixed(2)}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Final Conferred Award Banner */}
        <div className="bg-slate-100 border-2 border-slate-800 rounded p-3 mb-6 font-sans text-center">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Final Award Conferred</div>
          <div className="text-base font-black text-blue-950 uppercase mt-0.5">{awardConferred}</div>
          <div className="text-xs font-bold text-slate-800 mt-1">
            CLASSIFICATION OF AWARD:{' '}
            <span className="text-blue-900 font-extrabold">{formatAwardLabel(awardClassification)}</span>
            {' '}| FINAL CUMULATIVE CGPA: <span className="font-extrabold">{finalCGPA.toFixed(2)}</span>
          </div>
        </div>

        {/* Official Signatures & Verification Block */}
        <div className="flex justify-between items-end pt-6 border-t border-slate-400 font-sans">
          <div className="text-center w-52">
            <div className="border-b border-slate-500 mb-1 h-12 flex items-end justify-center pb-1">
              <span className="text-[10px] text-slate-400 italic">[Official Stamp & Signature]</span>
            </div>
            <span className="font-bold text-xs text-slate-900 block">Academic Registrar</span>
            <span className="text-[10px] text-slate-500">{schoolName}</span>
          </div>

          {/* Optional Verification QR Code Placeholder */}
          <div className="text-center px-4">
            <div className="w-16 h-16 mx-auto bg-slate-100 border border-slate-300 rounded flex items-center justify-center p-1">
              <span className="text-[8px] font-mono font-bold text-slate-400 text-center leading-tight">
                VERIFY AUTHENTICITY
              </span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-1">Scan to Verify Online</span>
          </div>

          <div className="text-center w-52">
            <div className="border-b border-slate-500 mb-1 h-12 flex items-end justify-center pb-1">
              <span className="text-[10px] text-slate-400 italic">[Official Stamp & Signature]</span>
            </div>
            <span className="font-bold text-xs text-slate-900 block">Principal / Executive Head</span>
            <span className="text-[10px] text-slate-500">Board Examination Authority</span>
          </div>
        </div>

        {/* Official Security Disclaimer */}
        <div className="mt-6 pt-3 border-t border-slate-300 text-[9px] text-slate-500 font-sans text-center">
          <p className="font-semibold text-slate-700">
            NOT VALID WITHOUT OFFICIAL EMBOSSED STAMP AND AUTHORIZED SIGNATURES.
          </p>
          <p className="italic">
            Any erasure, alteration, or fraudulent presentation renders this transcript completely invalid.
            For key to grades, abbreviations, and regulatory remarks, see reverse side.
          </p>
        </div>
      </div>

      {/* Reverse Side (Page 2) - Key to Grades & Legend */}
      <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-400 font-sans print:page-break-before">
        <h3 className="text-sm font-black uppercase text-center text-slate-900 tracking-wider mb-4">
          KEY TO GRADES, ABBREVIATIONS AND REGULATIONS (REVERSE SIDE)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs mb-4">
          <div>
            <h4 className="font-bold text-slate-800 mb-1.5">1. UNMEB 5.0 National Grading Scale</h4>
            <table className="w-full border-collapse text-[11px] border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 p-1 text-left">Percentage</th>
                  <th className="border border-slate-300 p-1 text-center">Grade (AG)</th>
                  <th className="border border-slate-300 p-1 text-center">Grade Point (GP)</th>
                  <th className="border border-slate-300 p-1 text-left">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {UNMEB_STANDARD_GRADING_SCALE.map((s) => (
                  <tr key={s.grade} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-1">{s.minScore}-{s.maxScore}%</td>
                    <td className="border border-slate-300 p-1 text-center font-bold">{s.grade}</td>
                    <td className="border border-slate-300 p-1 text-center">{s.gradePoint.toFixed(1)}</td>
                    <td className="border border-slate-300 p-1">{s.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-1.5">2. Classification of Conferred Awards</h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700">
              <li><strong>Class I (Distinction):</strong> Final CGPA 4.40 – 5.00</li>
              <li><strong>Class II (Credit - Upper Division):</strong> Final CGPA 3.60 – 4.39</li>
              <li><strong>Class II (Credit - Lower Division):</strong> Final CGPA 2.80 – 3.59</li>
              <li><strong>Pass:</strong> Final CGPA 2.00 – 2.79</li>
              <li><strong>Fail:</strong> Final CGPA below 2.00</li>
            </ul>

            <h4 className="font-bold text-slate-800 mt-4 mb-1">3. Common Acronyms</h4>
            <ul className="space-y-0.5 text-[11px] text-slate-600">
              <li><strong>GP:</strong> Grade Point (0.0 to 5.0)</li>
              <li><strong>AG:</strong> Alphabetical Grade (A to F)</li>
              <li><strong>GPA:</strong> Semester Grade Point Average</li>
              <li><strong>CGPA:</strong> Cumulative Grade Point Average</li>
              <li><strong>NSIN:</strong> National Student Identification Number</li>
              <li><strong>UNMEB:</strong> Uganda Nurses and Midwives Examinations Board</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicTranscript;
