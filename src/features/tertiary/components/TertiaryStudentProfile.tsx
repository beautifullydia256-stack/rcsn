import React, { useState } from 'react';
import { FileText, GraduationCap, Building2, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import {
  TertiaryStudentProfile as StudentType,
  InternalAssessmentRecord,
  UnmebResultRecord,
  SemesterStage,
} from '../types';
import { STAGE_LABELS } from '../data/unmebCurriculumDefaults';

export interface TertiaryStudentProfileProps {
  student: StudentType;
  internalRecords: InternalAssessmentRecord[];
  unmebRecords: UnmebResultRecord[];
  onOpenResultSlip?: (mode: 'internal' | 'unmeb', stage: SemesterStage) => void;
  onOpenTranscript?: () => void;
}

export const TertiaryStudentProfileView: React.FC<TertiaryStudentProfileProps> = ({
  student,
  internalRecords,
  unmebRecords,
  onOpenResultSlip,
  onOpenTranscript,
}) => {
  const [activeTab, setActiveTab] = useState<'unmeb' | 'internal'>('unmeb');
  const [selectedStage, setSelectedStage] = useState<SemesterStage>(student.currentStage || 'Y1S1');

  const filteredInternals = internalRecords.filter((r) => r.semesterStage === selectedStage);
  const filteredUnmeb = unmebRecords.filter((r) => r.semesterStage === selectedStage);

  const stagesList: SemesterStage[] = ['Y1S1', 'Y1S2', 'Y2S1', 'Y2S2', 'Y3S1', 'Y3S2'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-900">
      {/* Student Banner Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-28 rounded-xl border-2 border-white/30 overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-xs font-bold text-white/50 text-center p-2">PASSPORT PHOTO</div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h1 className="text-2xl font-black uppercase tracking-tight">{student.fullName}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 border border-blue-400/40 text-blue-200">
              {student.programmeCode || 'CN'}
            </span>
          </div>

          <p className="text-sm text-blue-100 mb-3">{student.programmeName || 'Certificate in Nursing'}</p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-blue-200">
            <div>
              <span className="text-blue-300">College Reg:</span>{' '}
              <strong className="text-white">{student.collegeRegNo || '—'}</strong>
            </div>
            <div>
              <span className="text-blue-300">UNMEB Exam No:</span>{' '}
              <strong className="text-amber-300 font-mono font-black">{student.unmebExamNo || '—'}</strong>
            </div>
            <div>
              <span className="text-blue-300">NSIN:</span>{' '}
              <strong className="text-white">{student.nsinNumber || '—'}</strong>
            </div>
            <div>
              <span className="text-blue-300">Cohort:</span>{' '}
              <strong className="text-white">{student.cohortName || 'Jan 2024 Intake'}</strong>
            </div>
            <div>
              <span className="text-blue-300">Current Stage:</span>{' '}
              <strong className="text-emerald-300">{STAGE_LABELS[student.currentStage] || student.currentStage}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {onOpenResultSlip && (
            <button
              onClick={() => onOpenResultSlip(activeTab, selectedStage)}
              className="px-4 py-2 bg-white text-blue-900 rounded-xl font-bold text-xs hover:bg-blue-50 shadow transition flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-blue-900" /> Print Semester Slip
            </button>
          )}
          {onOpenTranscript && (
            <button
              onClick={onOpenTranscript}
              className="px-4 py-2 bg-amber-400 text-slate-950 rounded-xl font-black text-xs hover:bg-amber-300 shadow transition flex items-center justify-center gap-1.5"
            >
              <GraduationCap className="w-4 h-4 text-slate-950" /> Official Transcript
            </button>
          )}
        </div>
      </div>

      {/* Navigation & Controls Bar */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* The Two-Tier Results Toggle */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('unmeb')}
            className={`px-5 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
              activeTab === 'unmeb'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" /> Official UNMEB Board Results
          </button>
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-5 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
              activeTab === 'internal'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" /> Internal School Assessments
          </button>
        </div>

        {/* Semester Stage Picker */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-600">Select Semester:</span>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value as SemesterStage)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-bold text-slate-800"
          >
            {stagesList.map((st) => (
              <option key={st} value={st}>
                {STAGE_LABELS[st] || st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Content Area */}
      <div className="p-6">
        {activeTab === 'unmeb' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Official UNMEB Examination Results ({STAGE_LABELS[selectedStage] || selectedStage})
                </h3>
                <p className="text-xs text-slate-500">
                  Certified board grades imported from official UNMEB results records.
                </p>
              </div>
              {filteredUnmeb.length > 0 && (
                <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Board Record
                </span>
              )}
            </div>

            {filteredUnmeb.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No official UNMEB board results imported yet for {STAGE_LABELS[selectedStage] || selectedStage}.
                <br />
                <span className="text-slate-500 mt-1 block">
                  Use the Academic Registrar Excel Importer to upload the semester spreadsheet.
                </span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-y border-slate-200 uppercase text-[11px]">
                    <th className="py-2.5 px-3">Course Code</th>
                    <th className="py-2.5 px-3">Course Unit Title</th>
                    <th className="py-2.5 px-3 text-center">Credit Units</th>
                    <th className="py-2.5 px-3 text-center">Grade Point (GP)</th>
                    <th className="py-2.5 px-3 text-center">Alphabetical Grade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnmeb.map((r, idx) => {
                    const isRetake = r.isRetake || r.gradePoint < 2.0;
                    return (
                      <tr key={idx} className={isRetake ? 'bg-red-50/50' : 'hover:bg-slate-50/50'}>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.courseUnitCode}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{r.courseUnitTitle}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{r.creditUnits.toFixed(1)}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                          {r.gradePoint.toFixed(1)}
                        </td>
                        <td className={`py-3 px-3 text-center font-mono font-black ${isRetake ? 'text-red-600' : 'text-slate-900'}`}>
                          {r.letterGrade}
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
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
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Internal School Continuous Assessments ({STAGE_LABELS[selectedStage] || selectedStage})
                </h3>
                <p className="text-xs text-slate-500">
                  Internal coursework, skills lab practicals, and preparation mock marks entered by tutors.
                </p>
              </div>
            </div>

            {filteredInternals.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No internal continuous assessment marks entered for {STAGE_LABELS[selectedStage] || selectedStage}.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-y border-slate-200 uppercase text-[11px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Course Unit Title</th>
                    <th className="py-2.5 px-2 text-center">CU</th>
                    <th className="py-2.5 px-2 text-center">CAT (30%)</th>
                    <th className="py-2.5 px-2 text-center">Exam (70%)</th>
                    <th className="py-2.5 px-2 text-center">Total %</th>
                    <th className="py-2.5 px-2 text-center">Grade</th>
                    <th className="py-2.5 px-2 text-center">GP</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInternals.map((r, idx) => (
                    <tr key={idx} className={r.isRetake ? 'bg-red-50/50' : 'hover:bg-slate-50/50'}>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.courseUnitCode}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{r.courseUnitTitle}</td>
                      <td className="py-3 px-2 text-center text-slate-700 font-bold">{r.creditUnits.toFixed(1)}</td>
                      <td className="py-3 px-2 text-center text-slate-600">{r.courseworkScore ?? '—'}</td>
                      <td className="py-3 px-2 text-center text-slate-600">{r.examScore ?? '—'}</td>
                      <td className="py-3 px-2 text-center font-bold text-slate-900">{r.totalScore}%</td>
                      <td className={`py-3 px-2 text-center font-mono font-black ${r.isRetake ? 'text-red-600' : 'text-slate-900'}`}>
                        {r.grade}
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-900">{r.gradePoint.toFixed(1)}</td>
                      <td className="py-3 px-3 text-center font-bold">
                        {r.isRetake ? (
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
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TertiaryStudentProfileView;
