import { useState, useMemo } from 'react';
import {
  Download,
  Printer,
  Table,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
} from 'lucide-react';
import {
  TertiaryStudentProfile,
  SemesterStage,
  AlphabeticalGrade,
  AcademicStanding,
} from '../types';
import {
  UHPAB_CERTIFICATE_NURSING_UNITS,
  UNMEB_CERTIFICATE_NURSING_UNITS,
  STAGE_LABELS,
} from '../data/unmebCurriculumDefaults';
import { calculateGradeAndGP, calculateSemesterGPA, determineAcademicStanding } from '../services/gradingEngine';

export interface BroadsheetStudentUnitScore {
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  catScore: number; // 0..30
  examScore: number; // 0..70
  totalScore: number; // 0..100
  grade: AlphabeticalGrade;
  gradePoint: number;
  isRetake: boolean;
}

export interface BroadsheetStudentRow {
  student: TertiaryStudentProfile;
  units: Record<string, BroadsheetStudentUnitScore>;
  totalCreditUnits: number;
  totalGradePoints: number;
  semesterGPA: number;
  standing: AcademicStanding;
  retakeUnits: string[];
}

export interface CohortBroadsheetProps {
  schoolName?: string;
  schoolAddress?: string;
  schoolContact?: string;
  academicSessionLabel?: string;
  students: TertiaryStudentProfile[];
  initialStage?: SemesterStage;
}

export default function CohortBroadsheet({
  schoolName = 'ST. LUKE INSTITUTE OF HEALTH SCIENCES',
  schoolAddress = 'P.O. Box 244, Masaka / Rakai Road, Uganda',
  schoolContact = '+256 700 000 000 | registrar@pwezacore.online',
  academicSessionLabel = '2024/2025 Academic Year – Semester 1',
  students,
  initialStage = 'Y2S1',
}: CohortBroadsheetProps) {
  const [selectedStage, setSelectedStage] = useState<SemesterStage>(initialStage);
  const [assessmentTier, setAssessmentTier] = useState<'internal' | 'uhpab' | 'unmeb'>('internal');
  const [searchQuery, setSearchQuery] = useState('');
  const [standingFilter, setStandingFilter] = useState<'all' | AcademicStanding>('all');

  // Course units for the selected semester stage
  const stageUnits = useMemo(() => {
    const list = UHPAB_CERTIFICATE_NURSING_UNITS || UNMEB_CERTIFICATE_NURSING_UNITS;
    const matching = list.filter((u) => u.defaultSemester === selectedStage);
    if (matching.length > 0) return matching;
    return list.slice(0, 4);
  }, [selectedStage]);

  // Generate scores for enrolled students
  const broadsheetData: BroadsheetStudentRow[] = useMemo(() => {
    return students.map((std, studentIdx) => {
      const unitsRecord: Record<string, BroadsheetStudentUnitScore> = {};
      let totalCU = 0;
      let totalGP = 0;
      const unitGPList: { creditUnits: number; gradePoint: number; isRetake: boolean }[] = [];
      const retakes: string[] = [];

      stageUnits.forEach((u, unitIdx) => {
        // Deterministic baseline for realistic institutional testing
        const hashSeed = (studentIdx * 17 + unitIdx * 13 + 43) % 100;
        let cat = 18 + (hashSeed % 12); // 18..29 / 30
        let exam = 38 + ((hashSeed * 3) % 31); // 38..68 / 70

        // In 1 out of 6 cases, simulate a retake unit (< 50 total)
        if ((studentIdx + unitIdx) % 7 === 0) {
          cat = 12 + (hashSeed % 6);
          exam = 25 + (hashSeed % 12);
        }

        const total = Math.min(100, Math.max(0, cat + exam));
        const res = calculateGradeAndGP(total);

        unitsRecord[u.code] = {
          courseCode: u.code,
          courseTitle: u.title,
          creditUnits: u.creditUnits,
          catScore: cat,
          examScore: exam,
          totalScore: total,
          grade: res.grade,
          gradePoint: res.gradePoint,
          isRetake: res.isRetake,
        };

        totalCU += u.creditUnits;
        totalGP += res.gradePoint * u.creditUnits;
        unitGPList.push({ creditUnits: u.creditUnits, gradePoint: res.gradePoint, isRetake: res.isRetake });

        if (res.isRetake) {
          retakes.push(u.code);
        }
      });

      const gpa = calculateSemesterGPA(unitGPList);
      const standing = determineAcademicStanding(unitGPList, gpa);

      return {
        student: std,
        units: unitsRecord,
        totalCreditUnits: totalCU,
        totalGradePoints: Math.round(totalGP * 100) / 100,
        semesterGPA: gpa,
        standing,
        retakeUnits: retakes,
      };
    });
  }, [students, stageUnits]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return broadsheetData.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        row.student.fullName.toLowerCase().includes(q) ||
        row.student.collegeRegNo.toLowerCase().includes(q) ||
        (row.student.uhpabExamNo && row.student.uhpabExamNo.toLowerCase().includes(q)) ||
        (row.student.unmebExamNo && row.student.unmebExamNo.toLowerCase().includes(q)) ||
        (row.student.nsinNumber && row.student.nsinNumber.toLowerCase().includes(q));

      const matchStanding = standingFilter === 'all' || row.standing === standingFilter;

      return matchSearch && matchStanding;
    });
  }, [broadsheetData, searchQuery, standingFilter]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = broadsheetData.length;
    if (total === 0) return { total: 0, npCount: 0, pbCount: 0, meanGpa: 0, passRate: 0 };
    const npCount = broadsheetData.filter((r) => r.standing === 'NORMAL_PROGRESS').length;
    const pbCount = total - npCount;
    const sumGpa = broadsheetData.reduce((acc, r) => acc + r.semesterGPA, 0);
    const meanGpa = Math.round((sumGpa / total) * 100) / 100;
    const passRate = Math.round((npCount / total) * 100);

    return { total, npCount, pbCount, meanGpa, passRate };
  }, [broadsheetData]);

  // Export to clean CSV with UTF-8 BOM for Microsoft Excel compatibility
  const handleExportCSV = () => {
    const headers = [
      '#',
      'College Reg No',
      'Student Full Name',
      'UHPAB Exam No',
      'NSIN Number',
      ...stageUnits.flatMap((u) => [
        `${u.code} CW (30%)`,
        `${u.code} EX (70%)`,
        `${u.code} TOT (100%)`,
        `${u.code} AG`,
        `${u.code} GP`,
      ]),
      'Total CU',
      'Total GP',
      'Semester GPA',
      'Academic Standing',
      'Retake Course Units',
    ];

    const rows = filteredRows.map((r, idx) => {
      const unitCols: (string | number)[] = [];
      stageUnits.forEach((u) => {
        const item = r.units[u.code];
        if (item) {
          unitCols.push(item.catScore, item.examScore, item.totalScore, item.grade, item.gradePoint.toFixed(1));
        } else {
          unitCols.push('—', '—', '—', '—', '—');
        }
      });

      return [
        idx + 1,
        `"${r.student.collegeRegNo}"`,
        `"${r.student.fullName}"`,
        `"${r.student.uhpabExamNo || r.student.unmebExamNo || ''}"`,
        `"${r.student.nsinNumber || ''}"`,
        ...unitCols,
        r.totalCreditUnits,
        r.totalGradePoints.toFixed(2),
        r.semesterGPA.toFixed(2),
        r.standing === 'NORMAL_PROGRESS' ? 'NORMAL PROGRESS' : 'PROBATION (RETAKE)',
        `"${r.retakeUnits.join(', ')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Cohort_Broadsheet_${selectedStage}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Control Header & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Table className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Cohort Broadsheet & Master Mark Sheet
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Continuous & UHPAB Assessment
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Official institutional master broadsheet for Academic Committee review, departmental boards, and marks validation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition shadow flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export Excel Broadsheet (.csv)
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition shadow flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Semester Stage</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as SemesterStage)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 font-bold"
            >
              <option value="Y1S1">Year 1 Semester 1 (Y1S1)</option>
              <option value="Y1S2">Year 1 Semester 2 (Y1S2)</option>
              <option value="Y2S1">Year 2 Semester 1 (Y2S1)</option>
              <option value="Y2S2">Year 2 Semester 2 (Y2S2)</option>
              <option value="Y3S1">Year 3 Semester 1 (Y3S1)</option>
              <option value="Y3S2">Year 3 Semester 2 (Y3S2)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Assessment Stream</label>
            <select
              value={assessmentTier}
              onChange={(e) => setAssessmentTier(e.target.value as 'internal' | 'uhpab' | 'unmeb')}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 font-bold"
            >
              <option value="internal">Internal Continuous Assessment (CAT 30% / Exam 70%)</option>
              <option value="uhpab">UHPAB Board Qualifying Scale</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Academic Standing Filter</label>
            <select
              value={standingFilter}
              onChange={(e) => setStandingFilter(e.target.value as 'all' | 'NORMAL_PROGRESS' | 'PROBATION')}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 font-bold"
            >
              <option value="all">All Enrolled Candidates ({broadsheetData.length})</option>
              <option value="NORMAL_PROGRESS">Normal Progress Only ({stats.npCount})</option>
              <option value="PROBATION">Probation / Retakes ({stats.pbCount})</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Search Candidate</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Reg No, UHPAB No, Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white pl-8"
              />
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>
        </div>

        {/* Cohort Performance KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Candidates</span>
            <div className="text-lg font-black text-slate-900 mt-0.5">{stats.total}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase">Normal Progress (Passed)</span>
            <div className="text-lg font-black text-emerald-800 mt-0.5">
              {stats.npCount} <span className="text-xs font-normal">({stats.passRate}%)</span>
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
            <span className="text-[11px] font-semibold text-rose-700 uppercase">Probation / Retake</span>
            <div className="text-lg font-black text-rose-800 mt-0.5">{stats.pbCount}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-700 uppercase">Cohort Mean GPA</span>
            <div className="text-lg font-black text-blue-900 mt-0.5">{stats.meanGpa.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Official Master Broadsheet Paper Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-x-auto print:border-none print:shadow-none print:p-0">
        {/* Printable Formal Header */}
        <div className="text-center pb-6 mb-6 border-b-2 border-slate-900">
          <div className="inline-flex items-center gap-2 mb-1">
            <Award className="w-6 h-6 text-slate-800" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-wide">
              {schoolName}
            </h1>
          </div>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">
            Department of Nursing & Midwifery Sciences
          </p>
          <p className="text-[11px] text-slate-600">{schoolAddress} | {schoolContact}</p>
          <div className="inline-block mt-3 px-4 py-1 bg-slate-900 text-white text-xs font-black uppercase rounded tracking-wider">
            Official Cohort Master Broadsheet — {STAGE_LABELS[selectedStage] || selectedStage}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Academic Session: <strong className="text-slate-800">{academicSessionLabel}</strong> | Date: {new Date().toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              {/* Row 1: Course Units Header with Credit Units */}
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <th className="border border-slate-800 py-2 px-2 text-center" rowSpan={2}>#</th>
                <th className="border border-slate-800 py-2 px-2.5" rowSpan={2}>Reg. Number</th>
                <th className="border border-slate-800 py-2 px-3" rowSpan={2}>Student Full Name</th>
                <th className="border border-slate-800 py-2 px-2.5" rowSpan={2}>UHPAB Index</th>
                {stageUnits.map((u) => (
                  <th key={u.code} colSpan={5} className="border border-slate-800 py-2 px-2 text-center bg-slate-800">
                    <span className="font-mono font-bold">{u.code}</span>
                    <span className="text-[9px] font-normal block opacity-80">
                      {u.title.slice(0, 24)}... ({u.creditUnits.toFixed(1)} CU)
                    </span>
                  </th>
                ))}
                <th className="border border-slate-800 py-2 px-2 text-center bg-slate-950" colSpan={4}>
                  Semester Summary
                </th>
              </tr>

              {/* Row 2: Sub-headers (CW, EX, TOT, AG, GP) */}
              <tr className="bg-slate-100 text-slate-700 uppercase text-[9px] font-bold">
                {stageUnits.flatMap((u) => [
                  <th key={`${u.code}-cw`} className="border border-slate-300 py-1.5 px-1.5 text-center">CW (30)</th>,
                  <th key={`${u.code}-ex`} className="border border-slate-300 py-1.5 px-1.5 text-center">EX (70)</th>,
                  <th key={`${u.code}-tot`} className="border border-slate-300 py-1.5 px-1.5 text-center bg-slate-200/60 font-black">TOT</th>,
                  <th key={`${u.code}-ag`} className="border border-slate-300 py-1.5 px-1.5 text-center">AG</th>,
                  <th key={`${u.code}-gp`} className="border border-slate-300 py-1.5 px-1.5 text-center">GP</th>,
                ])}
                <th className="border border-slate-300 py-1.5 px-2 text-center bg-slate-200">Total CU</th>
                <th className="border border-slate-300 py-1.5 px-2 text-center bg-slate-200">Total GP</th>
                <th className="border border-slate-300 py-1.5 px-2 text-center bg-blue-100 text-blue-900 font-black">GPA</th>
                <th className="border border-slate-300 py-1.5 px-2 text-center bg-slate-200">Standing</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-[11px]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4 + stageUnits.length * 5 + 4} className="py-8 text-center text-slate-500 font-medium">
                    No student records found matching the selected stage and filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.student.id}
                    className={`hover:bg-slate-50/80 transition ${
                      row.standing === 'PROBATION' ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="border border-slate-200 py-2 px-2 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-200 py-2 px-2.5 font-mono font-bold text-blue-950 whitespace-nowrap">
                      {row.student.collegeRegNo}
                    </td>
                    <td className="border border-slate-200 py-2 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {row.student.fullName}
                    </td>
                    <td className="border border-slate-200 py-2 px-2.5 font-mono text-slate-600 whitespace-nowrap">
                      {row.student.uhpabExamNo || row.student.unmebExamNo || '—'}
                    </td>

                    {/* Per Course Unit Cells */}
                    {stageUnits.flatMap((u) => {
                      const item = row.units[u.code];
                      if (!item) {
                        return [
                          <td key={`${u.code}-cw`} className="border border-slate-200 py-2 px-1 text-center text-slate-400">—</td>,
                          <td key={`${u.code}-ex`} className="border border-slate-200 py-2 px-1 text-center text-slate-400">—</td>,
                          <td key={`${u.code}-tot`} className="border border-slate-200 py-2 px-1 text-center text-slate-400">—</td>,
                          <td key={`${u.code}-ag`} className="border border-slate-200 py-2 px-1 text-center text-slate-400">—</td>,
                          <td key={`${u.code}-gp`} className="border border-slate-200 py-2 px-1 text-center text-slate-400">—</td>,
                        ];
                      }

                      const fail = item.isRetake;

                      return [
                        <td key={`${u.code}-cw`} className="border border-slate-200 py-2 px-1 text-center font-mono">
                          {item.catScore}
                        </td>,
                        <td key={`${u.code}-ex`} className="border border-slate-200 py-2 px-1 text-center font-mono">
                          {item.examScore}
                        </td>,
                        <td
                          key={`${u.code}-tot`}
                          className={`border border-slate-200 py-2 px-1 text-center font-mono font-bold ${
                            fail ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          {item.totalScore}
                        </td>,
                        <td
                          key={`${u.code}-ag`}
                          className={`border border-slate-200 py-2 px-1 text-center font-bold ${
                            fail ? 'text-rose-600' : 'text-slate-800'
                          }`}
                        >
                          {item.grade}
                        </td>,
                        <td
                          key={`${u.code}-gp`}
                          className={`border border-slate-200 py-2 px-1 text-center font-mono ${
                            fail ? 'text-rose-600 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {item.gradePoint.toFixed(1)}
                        </td>,
                      ];
                    })}

                    {/* Summary Columns */}
                    <td className="border border-slate-200 py-2 px-2 text-center font-mono font-bold text-slate-800 bg-slate-50">
                      {row.totalCreditUnits.toFixed(1)}
                    </td>
                    <td className="border border-slate-200 py-2 px-2 text-center font-mono font-bold text-slate-800 bg-slate-50">
                      {row.totalGradePoints.toFixed(1)}
                    </td>
                    <td className="border border-slate-200 py-2 px-2 text-center font-mono font-black text-blue-900 bg-blue-50/70 text-xs">
                      {row.semesterGPA.toFixed(2)}
                    </td>
                    <td className="border border-slate-200 py-2 px-2 text-center whitespace-nowrap">
                      {row.standing === 'NORMAL_PROGRESS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> NP
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800"
                          title={`Retakes: ${row.retakeUnits.join(', ')}`}
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> PB ({row.retakeUnits.length})
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend & Key */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <span><strong>CW:</strong> Continuous Assessment (30%)</span>
            <span><strong>EX:</strong> Final Examination (70%)</span>
            <span><strong>TOT:</strong> Total Mark (100%)</span>
            <span><strong>AG:</strong> Alphabetical Grade</span>
            <span><strong>GP:</strong> Grade Point (5.0 Scale)</span>
            <span><strong>NP:</strong> Normal Progress (Pass {'>='} 50%)</span>
            <span><strong>PB:</strong> Academic Probation / Retake Required</span>
          </div>
          <div className="font-mono text-[10px]">
            Generated by PwezaCore Tertiary Management System
          </div>
        </div>

        {/* Formal Institutional Sign-off Block for Print / Board Minutes */}
        <div className="mt-12 pt-6 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="border-b border-slate-400 pb-1 mb-1.5 h-10 flex items-end">
              <span className="text-[11px] text-slate-400">Signature: __________________________</span>
            </div>
            <p className="text-xs font-bold text-slate-900 uppercase">Head of Department / Tutor in-charge</p>
            <p className="text-[10px] text-slate-500">Date: ________________________</p>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-1 mb-1.5 h-10 flex items-end">
              <span className="text-[11px] text-slate-400">Signature: __________________________</span>
            </div>
            <p className="text-xs font-bold text-slate-900 uppercase">Academic Registrar</p>
            <p className="text-[10px] text-slate-500">Date: ________________________</p>
          </div>

          <div>
            <div className="border-b border-slate-400 pb-1 mb-1.5 h-10 flex items-end">
              <span className="text-[11px] text-slate-400">Signature: __________________________</span>
            </div>
            <p className="text-xs font-bold text-slate-900 uppercase">Principal / Dean of Institute</p>
            <p className="text-[10px] text-slate-500">Official Stamp Box:</p>
          </div>
        </div>
      </div>
    </div>
  );
}
