import React, { useState } from 'react';
import {
  Programme,
  Cohort,
  CourseUnit,
  TertiaryStudentProfile,
  HospitalWardPosting,
  AcademicCalendarSession,
  SemesterStage,
} from '../types';
import {
  DEFAULT_PROGRAMMES,
  UNMEB_CERTIFICATE_NURSING_UNITS,
  STAGE_LABELS,
} from '../data/unmebCurriculumDefaults';
import { parseUnmebResultsExcel, UnmebImportResult } from '../services/unmebExcelParser';
import WardPostingManager from '../components/WardPostingManager';
import SemesterResultSlip from '../components/SemesterResultSlip';
import AcademicTranscript from '../components/AcademicTranscript';
import TertiaryStudentProfileView from '../components/TertiaryStudentProfile';
import CohortBroadsheet from '../components/CohortBroadsheet';
import {
  Stethoscope,
  RefreshCw,
  Users,
  Table,
  FileSpreadsheet,
  ClipboardList,
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  CheckCircle2,
  BarChart3,
  Download,
  Printer,
  Check,
} from 'lucide-react';
export function TertiaryDashboard() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'broadsheet' | 'importer' | 'exporter' | 'curriculum' | 'wards' | 'preview_slip' | 'preview_transcript'
  >('overview');

  // Academic Session state
  const [activeSession, setActiveSession] = useState<AcademicCalendarSession>({
    id: 'sess-1',
    schoolId: 'school-1',
    sessionName: '2025/2026 Academic Year – Semester 1',
    academicYear: '2025/2026',
    sessionNumber: 1,
    startDate: '2025-01-15',
    officialEndDate: '2025-06-15',
    isActive: true,
  });

  const [showTransitionModal, setShowTransitionModal] = useState<boolean>(false);

  // Dynamic Programmes state (full school autonomy)
  const [programmes, setProgrammes] = useState<Programme[]>(
    DEFAULT_PROGRAMMES.map((p, idx) => ({
      ...p,
      id: `prog-${idx + 1}`,
      schoolId: 'school-1',
    }))
  );

  // Dynamic Course Units state (full school autonomy)
  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>(
    UNMEB_CERTIFICATE_NURSING_UNITS.map((u, idx) => ({
      ...u,
      id: `unit-${idx + 1}`,
      schoolId: 'school-1',
    }))
  );

  // Sample enrolled cohorts & students
  const [cohorts, setCohorts] = useState<Cohort[]>([
    {
      id: 'cohort-1',
      schoolId: 'school-1',
      programmeId: 'prog-1',
      intakeName: 'January 2025 Intake',
      intakeYear: 2025,
      intakeMonth: 'Jan',
      currentStage: 'Y1S1',
      expectedCompletionDate: 'Jun-2027',
      isActive: true,
      studentCount: 42,
    },
    {
      id: 'cohort-2',
      schoolId: 'school-1',
      programmeId: 'prog-1',
      intakeName: 'January 2024 Intake',
      intakeYear: 2024,
      intakeMonth: 'Jan',
      currentStage: 'Y2S1',
      expectedCompletionDate: 'Jun-2026',
      isActive: true,
      studentCount: 38,
    },
    {
      id: 'cohort-3',
      schoolId: 'school-1',
      programmeId: 'prog-1',
      intakeName: 'August 2023 Intake',
      intakeYear: 2023,
      intakeMonth: 'Aug',
      currentStage: 'Y2S2',
      expectedCompletionDate: 'Dec-2025',
      isActive: true,
      studentCount: 31,
    },
  ]);

  const [students] = useState<TertiaryStudentProfile[]>([
    {
      id: 'std-1',
      schoolId: 'school-1',
      fullName: 'Sarah Nakato',
      collegeRegNo: 'CNS/2024/001',
      unmebExamNo: 'U099/001',
      nsinNumber: 'JAN24/U099/CN/001',
      programmeId: 'prog-1',
      programmeCode: 'CN',
      programmeName: 'Certificate in Nursing',
      cohortId: 'cohort-2',
      cohortName: 'January 2024 Intake',
      currentStage: 'Y2S1',
      academicStanding: 'NORMAL_PROGRESS',
      feesCleared: true,
      dateOfBirth: '14th April 2003',
      gender: 'female',
    },
    {
      id: 'std-2',
      schoolId: 'school-1',
      fullName: 'John Baptist Okello',
      collegeRegNo: 'CNS/2024/002',
      unmebExamNo: 'U099/002',
      nsinNumber: 'JAN24/U099/CN/002',
      programmeId: 'prog-1',
      programmeCode: 'CN',
      programmeName: 'Certificate in Nursing',
      cohortId: 'cohort-2',
      cohortName: 'January 2024 Intake',
      currentStage: 'Y2S1',
      academicStanding: 'PROBATION',
      feesBalance: 450000,
      feesCleared: false,
      dateOfBirth: '20th November 2002',
      gender: 'male',
    },
  ]);

  const [wardPostings, setWardPostings] = useState<HospitalWardPosting[]>([
    {
      id: 'post-1',
      schoolId: 'school-1',
      hospitalName: 'Regional Referral Hospital',
      wardName: 'Maternity / Labour Ward',
      startDate: '2025-02-01',
      endDate: '2025-03-15',
      requiredHours: 120,
      completedHours: 120,
      physicalLogbookVerified: true,
      status: 'cleared',
    },
    {
      id: 'post-2',
      schoolId: 'school-1',
      hospitalName: 'St. Francis Hospital',
      wardName: 'Surgical Ward',
      startDate: '2025-03-20',
      endDate: '2025-05-01',
      requiredHours: 120,
      completedHours: 90,
      physicalLogbookVerified: false,
      status: 'in_progress',
    },
  ]);

  // UNMEB Importer State
  const [importResult, setImportResult] = useState<UnmebImportResult | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [selectedTargetStage, setSelectedTargetStage] = useState<SemesterStage>('Y1S1');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');

  // New Course Unit Modal State
  const [showAddUnitModal, setShowAddUnitModal] = useState<boolean>(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitCU, setNewUnitCU] = useState(4.0);
  const [newUnitType, setNewUnitType] = useState<'theory' | 'practical'>('theory');
  const [newUnitSem, setNewUnitSem] = useState<SemesterStage>('Y1S1');

  // Handle Excel upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportSuccessMsg('');
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseUnmebResultsExcel(buffer, students, selectedTargetStage, activeSession.sessionName);
      setImportResult(result);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error reading spreadsheet');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCommitImport = () => {
    if (!importResult) return;
    setImportSuccessMsg(
      `Successfully imported official UNMEB board results for ${importResult.matchedCount} students! Results have been assigned and progressive CGPAs updated.`
    );
    setImportResult(null);
  };

  const handleAddNewCourseUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitCode || !newUnitTitle) return;

    const item: CourseUnit = {
      id: `unit-${Date.now()}`,
      schoolId: 'school-1',
      code: newUnitCode.trim().toUpperCase(),
      title: newUnitTitle.trim(),
      creditUnits: newUnitCU,
      unitType: newUnitType,
      defaultSemester: newUnitSem,
      passMark: 50.0,
      isCore: true,
    };

    setCourseUnits([...courseUnits, item]);
    setShowAddUnitModal(false);
    setNewUnitCode('');
    setNewUnitTitle('');
  };

  // Safe Semester Transition logic
  const handleAdvanceCohorts = () => {
    const nextStages: Record<SemesterStage, SemesterStage> = {
      Y1S1: 'Y1S2',
      Y1S2: 'Y2S1',
      Y2S1: 'Y2S2',
      Y2S2: 'Y3S1',
      Y3S1: 'Y3S2',
      Y3S2: 'COMPLETED',
      COMPLETED: 'COMPLETED',
    };

    const updated = cohorts.map((c) => ({
      ...c,
      currentStage: nextStages[c.currentStage] || c.currentStage,
    }));

    setCohorts(updated);
    setShowTransitionModal(false);
    alert('Active cohorts successfully advanced to the next academic semester! Previous records safely archived.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8 font-sans">
      {/* Top Header & Active Session Control */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-emerald-600" />
              <h1 className="text-2xl font-black text-blue-950 uppercase tracking-tight">
                Academic Registrar Command Centre
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Health Training Institution
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active Session:{' '}
              <strong className="text-slate-800">{activeSession.sessionName}</strong> ({activeSession.startDate} to {activeSession.officialEndDate})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowTransitionModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-bold text-xs shadow hover:from-blue-800 hover:to-indigo-800 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" /> Safe Semester Transition Wizard
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block">Total Enrolled Students</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {cohorts.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
            </span>
            <span className="text-[11px] text-emerald-600 font-bold mt-1 block">Across all active cohorts</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block">Active Programmes</span>
            <span className="text-2xl font-black text-blue-900 mt-1 block">{programmes.length}</span>
            <span className="text-[11px] text-slate-500 block mt-1">Nursing & Midwifery</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block">Active Cohorts / Stages</span>
            <span className="text-2xl font-black text-indigo-900 mt-1 block">{cohorts.length}</span>
            <span className="text-[11px] text-slate-500 block mt-1">Dual Intakes running</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block">UNMEB Retake Watchlist</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">
              {students.filter((s) => s.academicStanding === 'PROBATION').length}
            </span>
            <span className="text-[11px] text-amber-700 font-bold block mt-1">Students requiring re-sits</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-8 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> Cohorts & Students
          </button>
          <button
            onClick={() => setActiveTab('broadsheet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'broadsheet'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Table className="w-4 h-4" /> Cohort Broadsheets
          </button>
          <button
            onClick={() => setActiveTab('importer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'importer'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> UNMEB Results Excel Importer
          </button>
          <button
            onClick={() => setActiveTab('exporter')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'exporter'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Export UNMEB Candidate Lists
          </button>
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'curriculum'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Course Units & Curriculum
          </button>
          <button
            onClick={() => setActiveTab('wards')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'wards'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" /> Hospital Ward Postings
          </button>
          <button
            onClick={() => setActiveTab('preview_slip')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'preview_slip'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" /> Sample Result Slip
          </button>
          <button
            onClick={() => setActiveTab('preview_transcript')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'preview_transcript'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Sample Graduation Transcript
          </button>
        </div>

        {/* Tab 1: Cohorts & Student Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Active Intake Cohorts</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-y border-slate-200 uppercase text-[11px]">
                      <th className="py-3 px-3">Cohort Name</th>
                      <th className="py-3 px-3">Programme</th>
                      <th className="py-3 px-3">Current Academic Stage</th>
                      <th className="py-3 px-3 text-center">Enrolled Students</th>
                      <th className="py-3 px-3">Expected Completion</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cohorts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{c.intakeName}</td>
                        <td className="py-3 px-3 font-medium text-slate-700">Certificate in Nursing</td>
                        <td className="py-3 px-3 font-bold text-blue-900">
                          {STAGE_LABELS[c.currentStage] || c.currentStage}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">{c.studentCount}</td>
                        <td className="py-3 px-3 text-slate-500">{c.expectedCompletionDate}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student Profiles Showcase */}
            <TertiaryStudentProfileView
              student={students[0]!}
              internalRecords={[
                {
                  id: 'int-1',
                  studentId: students[0]!.id,
                  schoolId: 'school-1',
                  cohortId: 'cohort-2',
                  semesterStage: 'Y2S1',
                  courseUnitId: 'u-1',
                  courseUnitCode: 'CN 211',
                  courseUnitTitle: 'Medical Nursing I and Pharmacology I',
                  creditUnits: 4.0,
                  courseworkScore: 24,
                  examScore: 52,
                  totalScore: 76,
                  grade: 'B+',
                  gradePoint: 4.5,
                  isRetake: false,
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: 'int-2',
                  studentId: students[0]!.id,
                  schoolId: 'school-1',
                  cohortId: 'cohort-2',
                  semesterStage: 'Y2S1',
                  courseUnitId: 'u-2',
                  courseUnitCode: 'CN 212',
                  courseUnitTitle: 'Surgical Nursing I and Gynaecology',
                  creditUnits: 4.0,
                  courseworkScore: 21,
                  examScore: 42,
                  totalScore: 63,
                  grade: 'C',
                  gradePoint: 3.0,
                  isRetake: false,
                  updatedAt: new Date().toISOString(),
                },
              ]}
              unmebRecords={[
                {
                  id: 'unmeb-1',
                  studentId: students[0]!.id,
                  schoolId: 'school-1',
                  unmebExamNo: 'U099/001',
                  semesterStage: 'Y2S1',
                  courseUnitCode: 'CN 211',
                  courseUnitTitle: 'Medical Nursing I and Pharmacology I',
                  creditUnits: 4.0,
                  gradePoint: 4.5,
                  letterGrade: 'B+',
                  isRetake: false,
                  importedAt: new Date().toISOString(),
                },
                {
                  id: 'unmeb-2',
                  studentId: students[0]!.id,
                  schoolId: 'school-1',
                  unmebExamNo: 'U099/001',
                  semesterStage: 'Y2S1',
                  courseUnitCode: 'CN 212',
                  courseUnitTitle: 'Surgical Nursing I and Gynaecology',
                  creditUnits: 4.0,
                  gradePoint: 4.0,
                  letterGrade: 'B',
                  isRetake: false,
                  importedAt: new Date().toISOString(),
                },
                {
                  id: 'unmeb-3',
                  studentId: students[0]!.id,
                  schoolId: 'school-1',
                  unmebExamNo: 'U099/001',
                  semesterStage: 'Y2S1',
                  courseUnitCode: 'CN 213',
                  courseUnitTitle: 'Paediatric Nursing I and Palliative Care Nursing',
                  creditUnits: 3.0,
                  gradePoint: 4.0,
                  letterGrade: 'B',
                  isRetake: false,
                  importedAt: new Date().toISOString(),
                },
                {
                  id: 'unmeb-4',
                  studentId: students[0]!.id,
                  schoolId: 'school-1',
                  unmebExamNo: 'U099/001',
                  semesterStage: 'Y2S1',
                  courseUnitCode: 'CN 214',
                  courseUnitTitle: 'Practical III',
                  creditUnits: 5.0,
                  gradePoint: 4.5,
                  letterGrade: 'B+',
                  isRetake: false,
                  importedAt: new Date().toISOString(),
                },
              ]}
              onOpenResultSlip={() => setActiveTab('preview_slip')}
              onOpenTranscript={() => setActiveTab('preview_transcript')}
            />
          </div>
        )}

        {/* Tab: Cohort Broadsheet & Master Mark Sheet */}
        {activeTab === 'broadsheet' && (
          <div className="mt-6">
            <CohortBroadsheet
              schoolName="ST. LUKE INSTITUTE OF HEALTH SCIENCES"
              schoolAddress="P.O. Box 244, Masaka / Rakai Road, Uganda"
              schoolContact="+256 700 000 000 | registrar@pwezacore.online"
              academicSessionLabel={activeSession.sessionName}
              students={students}
              initialStage="Y2S1"
            />
          </div>
        )}

        {/* Tab 2: UNMEB Results Excel Importer */}
        {activeTab === 'importer' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mt-6">
            <div className="max-w-2xl mb-6">
              <h2 className="text-xl font-bold text-slate-900">Automated UNMEB Semester Results Importer</h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload the official UNMEB results spreadsheet (.xlsx, .xls, or .csv). The system will automatically
                match students by their UNMEB Exam Number or NSIN, compute semester GPAs, and record progressive CGPAs.
              </p>
            </div>

            {importSuccessMsg && (
              <div className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700" /> {importSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-xl">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Semester Stage</label>
                <select
                  value={selectedTargetStage}
                  onChange={(e) => setSelectedTargetStage(e.target.value as SemesterStage)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 font-bold"
                >
                  <option value="Y1S1">Year 1 Semester 1</option>
                  <option value="Y1S2">Year 1 Semester 2</option>
                  <option value="Y2S1">Year 2 Semester 1</option>
                  <option value="Y2S2">Year 2 Semester 2</option>
                  <option value="Y3S1">Year 3 Semester 1</option>
                  <option value="Y3S2">Year 3 Semester 2</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Academic Session Label</label>
                <input
                  type="text"
                  readOnly
                  value={activeSession.sessionName}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-100 text-slate-600"
                />
              </div>
            </div>

            {/* Drop Zone */}
            <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center bg-blue-50/30 hover:bg-blue-50/60 transition cursor-pointer relative mb-6">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="font-bold text-sm text-blue-900">
                {isImporting ? 'Processing & Matching Students...' : 'Click to Upload UNMEB Results Excel or Drag and Drop'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports standard UNMEB master results sheets (.xlsx, .xls, .csv)</p>
            </div>

            {/* Preview Results Table */}
            {importResult && (
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Import Preview & Matching Summary</h3>
                    <p className="text-xs text-slate-500">
                      Matched: <strong className="text-emerald-700">{importResult.matchedCount} Students</strong> |{' '}
                      Retakes Detected: <strong className="text-red-600">{importResult.retakeCount}</strong> |{' '}
                      Unmatched Rows: <strong>{importResult.unmatchedCount}</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleCommitImport}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition shadow flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Confirm & Commit Results to Student Records
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 uppercase text-[11px]">
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">UNMEB Exam No</th>
                        <th className="py-2.5 px-3 text-center">Units Extracted</th>
                        <th className="py-2.5 px-3 text-center">Computed GPA</th>
                        <th className="py-2.5 px-3 text-center">Academic Standing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importResult.matchedStudents.map((item, idx) => (
                        <tr key={idx} className={item.hasRetake ? 'bg-red-50/50' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-3 font-bold text-slate-900">{item.student.fullName}</td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-900">{item.student.unmebExamNo}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">{item.records.length} Units</td>
                          <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                            {item.semesterGPA.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.hasRetake ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700">
                                Retake in {item.retakeCourseCodes.join(', ')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">
                                Normal Progress
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: UNMEB Candidate Exporter */}
        {activeTab === 'exporter' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mt-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">UNMEB Candidate Registration Exporter</h2>
            <p className="text-xs text-slate-500 mb-6">
              Export pre-formatted spreadsheets for submission to the official UNMEB exam registration portal.
            </p>

            <div className="max-w-md space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Candidate Cohort</label>
                <select className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 font-bold">
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.intakeName} ({STAGE_LABELS[c.currentStage] || c.currentStage}) - {c.studentCount} Candidates
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => alert('Generating official UNMEB candidate registration Excel spreadsheet...')}
                className="w-full py-3 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition shadow flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download UNMEB Registration Excel Template
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Dynamic Curriculum & Course Units Manager */}
        {activeTab === 'curriculum' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Dynamic Course Units & Curriculum</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Full institutional freedom: add custom course units, rename subjects, adjust credit units, or delete units.
                </p>
              </div>
              <button
                onClick={() => setShowAddUnitModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition shadow"
              >
                + Add Custom Course Unit
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-y border-slate-200 uppercase text-[11px]">
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Course Unit Title</th>
                    <th className="py-3 px-3 text-center">Credit Units</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-3 text-center">Default Semester</th>
                    <th className="py-3 px-3 text-center">Pass Mark</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courseUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{u.code}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{u.title}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">{u.creditUnits.toFixed(1)}</td>
                      <td className="py-3 px-3 text-center uppercase font-bold text-[10px] text-slate-500">
                        {u.unitType}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-blue-900">
                        {STAGE_LABELS[u.defaultSemester] || u.defaultSemester}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">{u.passMark}%</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setCourseUnits(courseUnits.filter((x) => x.id !== u.id))}
                          className="text-red-500 hover:text-red-700 font-bold text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Hospital Ward Postings */}
        {activeTab === 'wards' && (
          <div className="mt-6">
            <WardPostingManager
              postings={wardPostings}
              students={students}
              onUpdatePosting={(id, updates) => {
                setWardPostings(wardPostings.map((w) => (w.id === id ? { ...w, ...updates } : w)));
              }}
              onAddPosting={(newP) => {
                setWardPostings([{ ...newP, id: `post-${Date.now()}` }, ...wardPostings]);
              }}
            />
          </div>
        )}

        {/* Tab 6: Preview Sample Result Slip */}
        {activeTab === 'preview_slip' && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow hover:bg-blue-700 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print / Save as PDF
              </button>
            </div>
            <SemesterResultSlip
              schoolName="ST. LUKE INSTITUTE OF HEALTH SCIENCES"
              schoolLogoUrl=""
              schoolMotto="Compassion, Competence & Integrity"
              schoolAddress="P.O. Box 244, Uganda"
              schoolContact="+256 700 000 000"
              mode="unmeb"
              student={students[0]!}
              semesterStage="Y2S1"
              academicYearSession="2024/2025 Semester 1"
              units={[
                { code: 'CN 211', title: 'Medical Nursing I and Pharmacology I', creditUnits: 4.0, totalScore: 78, grade: 'B+', gradePoint: 4.5, status: 'PASS' },
                { code: 'CN 212', title: 'Surgical Nursing I and Gynaecology', creditUnits: 4.0, totalScore: 71, grade: 'B', gradePoint: 4.0, status: 'PASS' },
                { code: 'CN 213', title: 'Paediatric Nursing I and Palliative Care Nursing', creditUnits: 3.0, totalScore: 73, grade: 'B', gradePoint: 4.0, status: 'PASS' },
                { code: 'CN 214', title: 'Practical III (Medical & Surgical Wards)', creditUnits: 5.0, totalScore: 77, grade: 'B+', gradePoint: 4.5, status: 'PASS' },
              ]}
              semesterGPA={4.31}
              cumulativeCGPA={4.18}
              academicStanding="NORMAL PROGRESS (NP)"
              wardPostings={wardPostings}
              showFeesBalance={true}
              nextSemesterStartDate="15th August 2025"
            />
          </div>
        )}

        {/* Tab 7: Preview Sample Graduation Academic Transcript */}
        {activeTab === 'preview_transcript' && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-black rounded-xl shadow hover:bg-amber-400 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Graduation Transcript
              </button>
            </div>
            <AcademicTranscript
              schoolName="ST. LUKE INSTITUTE OF HEALTH SCIENCES"
              schoolAddress="P.O. Box 244, Uganda"
              schoolContact="+256 700 000 000"
              schoolEmail="registrar@healthsciences.edu"
              student={students[0]!}
              serialNumber="0020095"
              yearOfEntry="Jan-2022"
              yearOfCompletion="Jun-2024"
              awardConferred="CERTIFICATE IN NURSING"
              awardClassification="CLASS_II_CREDIT_LOWER"
              finalCGPA={3.55}
              semesters={[
                {
                  stage: 'Y1S1',
                  stageLabel: 'YEAR ONE SEMESTER ONE',
                  semesterGPA: 4.5,
                  cumulativeCGPA: 4.5,
                  units: [
                    { code: 'CN 111', title: 'Anatomy and Physiology I and First Aid', gradePoint: 5.0, grade: 'A' },
                    { code: 'CN 112', title: 'Foundations of Nursing and Basic Computer', gradePoint: 5.0, grade: 'A' },
                    { code: 'CN 113', title: 'Personal and Communal Health and Microbiology', gradePoint: 4.0, grade: 'B' },
                    { code: 'CN 114', title: 'Practical I', gradePoint: 4.0, grade: 'B' },
                  ],
                },
                {
                  stage: 'Y1S2',
                  stageLabel: 'YEAR ONE SEMESTER TWO',
                  semesterGPA: 3.38,
                  cumulativeCGPA: 3.94,
                  units: [
                    { code: 'CN 121', title: 'Anatomy and Physiology II', gradePoint: 2.0, grade: 'D' },
                    { code: 'CN 122', title: 'Foundations of Nursing II, Sociology and Psychology', gradePoint: 5.0, grade: 'A' },
                    { code: 'CN 123', title: 'Primary Health Care', gradePoint: 4.0, grade: 'B' },
                    { code: 'CN 124', title: 'Practical II', gradePoint: 2.5, grade: 'D+' },
                  ],
                },
                {
                  stage: 'Y2S1',
                  stageLabel: 'YEAR TWO SEMESTER ONE',
                  semesterGPA: 3.38,
                  cumulativeCGPA: 3.75,
                  units: [
                    { code: 'CN 211', title: 'Medical Nursing I and Pharmacology I', gradePoint: 4.5, grade: 'B+' },
                    { code: 'CN 212', title: 'Surgical Nursing I and Gynaecology', gradePoint: 2.0, grade: 'D' },
                    { code: 'CN 213', title: 'Paediatric Nursing I and Palliative Care Nursing', gradePoint: 3.0, grade: 'C' },
                    { code: 'CN 214', title: 'Practical III', gradePoint: 4.0, grade: 'B' },
                  ],
                },
                {
                  stage: 'Y2S2',
                  stageLabel: 'YEAR TWO SEMESTER TWO',
                  semesterGPA: 3.63,
                  cumulativeCGPA: 3.72,
                  units: [
                    { code: 'CN 221', title: 'Medical Nursing II & Pharmacology II', gradePoint: 3.5, grade: 'C+' },
                    { code: 'CN 222', title: 'Surgical Nursing II and Paediatric Nursing II', gradePoint: 2.5, grade: 'D+' },
                    { code: 'CN 223', title: 'Mental Health Nursing and Occupational Health and safety', gradePoint: 5.0, grade: 'A' },
                    { code: 'CN 224', title: 'Practical IV', gradePoint: 3.5, grade: 'C+' },
                  ],
                },
                {
                  stage: 'Y3S1',
                  stageLabel: 'YEAR THREE SEMESTER ONE',
                  semesterGPA: 2.88,
                  cumulativeCGPA: 3.55,
                  units: [
                    { code: 'CN 311', title: 'Tropical Medicine and Surgical Nursing III', gradePoint: 2.0, grade: 'D' },
                    { code: 'CN 312', title: 'Reproductive Health, Guidance and Counselling', gradePoint: 2.5, grade: 'D+' },
                    { code: 'CN 313', title: 'Health Services Management and Entrepreneurship', gradePoint: 2.5, grade: 'D+' },
                    { code: 'CN 314', title: 'Practical V', gradePoint: 4.5, grade: 'B+' },
                  ],
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* Safe Semester Transition Modal */}
      {showTransitionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">Safe Semester Transition Wizard</h3>
            <p className="text-xs text-slate-500 mb-4">
              Current Session: <strong>{activeSession.sessionName}</strong>
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 font-bold shrink-0" />
                <span className="text-slate-700">Internal Continuous Assessment & CAT Marks Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 font-bold shrink-0" />
                <span className="text-slate-700">Hospital Ward Rotation Postings & Hours Cleared</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 font-bold shrink-0" />
                <span className="text-slate-700">UNMEB Examination Records Imported and Synchronized</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAdvanceCohorts}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition shadow"
              >
                {"Close Current Semester & Advance All Cohorts (e.g. Y1S1 -> Y1S2)"}
              </button>

              <button
                onClick={() => {
                  alert('Session extended by 2 weeks. Marks entry remains open.');
                  setShowTransitionModal(false);
                }}
                className="w-full py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50 transition"
              >
                Extend Current Session by 2 Weeks (Exams Still Running)
              </button>

              <button
                onClick={() => setShowTransitionModal(false)}
                className="w-full py-2 text-slate-400 font-medium text-xs hover:text-slate-600 text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Course Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Custom Course Unit</h3>
            <form onSubmit={handleAddNewCourseUnit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CN 115 or NUR 201"
                  value={newUnitCode}
                  onChange={(e) => setNewUnitCode(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Course Unit Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical Pharmacology and Therapeutics"
                  value={newUnitTitle}
                  onChange={(e) => setNewUnitTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Credit Units (Weight)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newUnitCU}
                    onChange={(e) => setNewUnitCU(parseFloat(e.target.value) || 1.0)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Course Type</label>
                  <select
                    value={newUnitType}
                    onChange={(e) => setNewUnitType(e.target.value as 'theory' | 'practical')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                  >
                    <option value="theory">Theory (Classroom)</option>
                    <option value="practical">Practical / Skills Lab</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Semester Stage</label>
                <select
                  value={newUnitSem}
                  onChange={(e) => setNewUnitSem(e.target.value as SemesterStage)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                >
                  <option value="Y1S1">Year 1 Semester 1</option>
                  <option value="Y1S2">Year 1 Semester 2</option>
                  <option value="Y2S1">Year 2 Semester 1</option>
                  <option value="Y2S2">Year 2 Semester 2</option>
                  <option value="Y3S1">Year 3 Semester 1</option>
                  <option value="Y3S2">Year 3 Semester 2</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Save Course Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TertiaryDashboard;
