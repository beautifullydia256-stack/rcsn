import React, { useState, useEffect, useMemo } from 'react';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  GraduationCap,
  FileText,
  Building2,
  Download,
  AlertCircle,
  Eye,
  Check,
  X,
  XCircle,
  Plus,
  RefreshCw,
  Phone,
  ShieldCheck,
  UserCheck,
  Loader2,
  Receipt,
  CheckSquare,
  Square,
  Sliders,
  Award,
  Send,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import {
  fetchApplications,
  updateApplication,
  scheduleInterview,
  batchScheduleInterviews,
  recordInterviewResults,
  evaluateInterviewCandidate,
  issueAdmissionOffer,
  rejectApplication,
  type AdmissionApplicationRecord,
  type ApplicationStatus,
} from '@/services/admissionsService';
import MatriculateStudentModal from './MatriculateStudentModal';
import { generateInterviewSlipPdf } from '@/lib/generateInterviewSlipPdf';
import { generateAdmissionLetterPdf } from '@/lib/generateAdmissionLetterPdf';
import { generateAdmissionInvoicePdf } from '@/lib/generateAdmissionInvoicePdf';
import { AVAILABLE_PROGRAMS } from '@/components/website/AdmissionsModal';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

export default function AdmissionsManagementPage() {
  const [applications, setApplications] = useState<AdmissionApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'interview_scheduled' | 'admitted' | 'enrolled'>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

  // View Mode: 'pipeline' (Datagrid Table) | 'scoring' (Oral & Practical Scoring Sheet)
  const [viewMode, setViewMode] = useState<'pipeline' | 'scoring'>('pipeline');

  // Multi-Selection State
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [batchScheduleModalOpen, setBatchScheduleModalOpen] = useState(false);

  // Batch Scheduling Form
  const [batchDate, setBatchDate] = useState('');
  const [batchTime, setBatchTime] = useState('09:00 AM');
  const [batchVenue, setBatchVenue] = useState('RCSN Main Campus, Rakai Town');
  const [batchPanel, setBatchPanel] = useState('Senior Nursing Faculty Panel');

  // Dedicated Scoring Sheet State
  const [passMarkThreshold, setPassMarkThreshold] = useState<number>(60);
  const [autoAdmitOnPass, setAutoAdmitOnPass] = useState<boolean>(true);
  const [candidateScores, setCandidateScores] = useState<Record<string, { score: number | ''; notes: string }>>({});
  const [scoringBatchLoading, setScoringBatchLoading] = useState(false);
  const [rowProcessing, setRowProcessing] = useState<Record<string, boolean>>({});

  // Modal States
  const [inspectApp, setInspectApp] = useState<AdmissionApplicationRecord | null>(null);
  const [scheduleApp, setScheduleApp] = useState<AdmissionApplicationRecord | null>(null);
  const [scoreApp, setScoreApp] = useState<AdmissionApplicationRecord | null>(null);
  const [admitApp, setAdmitApp] = useState<AdmissionApplicationRecord | null>(null);
  const [matriculateApp, setMatriculateApp] = useState<AdmissionApplicationRecord | null>(null);

  // Scheduling Form
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('09:00 AM');
  const [schedVenue, setSchedVenue] = useState('RCSN Main Campus, Rakai Town');
  const [schedPanel, setSchedPanel] = useState('Senior Nursing Faculty Panel');

  // Scoring Form
  const [interviewScore, setInterviewScore] = useState<number>(75);
  const [interviewDecision, setInterviewDecision] = useState<'passed' | 'waitlisted' | 'failed'>('passed');
  const [interviewNotes, setInterviewNotes] = useState('');

  // Admit Form
  const [admittedProgramChoice, setAdmittedProgramChoice] = useState('');
  const [admitResidency, setAdmitResidency] = useState<'Resident' | 'Non-Resident'>('Resident');

  // Action Loading
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchApplications();
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Metrics
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => ['submitted', 'under_review'].includes(a.status)).length;
    const interviews = applications.filter((a) => a.status === 'interview_scheduled').length;
    const admitted = applications.filter((a) => ['interview_passed', 'admitted', 'offer_accepted'].includes(a.status)).length;
    const enrolled = applications.filter((a) => a.status === 'enrolled').length;
    return { total, pending, interviews, admitted, enrolled };
  }, [applications]);

  // Filtered List
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Tab filter
      if (activeTab === 'pending' && !['submitted', 'under_review'].includes(app.status)) return false;
      if (activeTab === 'interview_scheduled' && app.status !== 'interview_scheduled') return false;
      if (activeTab === 'admitted' && !['interview_passed', 'admitted', 'offer_accepted'].includes(app.status)) return false;
      if (activeTab === 'enrolled' && app.status !== 'enrolled') return false;

      // Program filter
      if (selectedProgram !== 'all') {
        const matchesProgram =
          app.admitted_program === selectedProgram || app.programs?.includes(selectedProgram);
        if (!matchesProgram) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = app.full_name?.toLowerCase().includes(q);
        const matchesNumber = app.application_number?.toLowerCase().includes(q);
        const matchesPhone = app.phone?.includes(q);
        const matchesIndex = app.index_number?.toLowerCase().includes(q);
        if (!matchesName && !matchesNumber && !matchesPhone && !matchesIndex) return false;
      }

      return true;
    });
  }, [applications, activeTab, selectedProgram, searchQuery]);

  // Action Handlers
  const handleVettingApproval = async (app: AdmissionApplicationRecord) => {
    setActionLoading(true);
    try {
      await updateApplication(app.id, { status: 'shortlisted' });
      showNotification(`Application ${app.application_number} shortlisted for interview.`);
      await loadData();
      if (inspectApp?.id === app.id) setInspectApp(null);
    } catch {
      showNotification('Failed to update vetting status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVettingRejection = async (app: AdmissionApplicationRecord) => {
    const reason = window.prompt('Specify reason for candidate ineligibility (e.g. Inadequate UCE science passes):');
    if (!reason) return;

    setActionLoading(true);
    try {
      await rejectApplication(app.id, reason);
      showNotification(`Application ${app.application_number} rejected. Official decision email dispatched.`);
      await loadData();
      if (inspectApp?.id === app.id) setInspectApp(null);
    } catch {
      showNotification('Failed to reject application.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleApp || !schedDate) return;

    setActionLoading(true);
    try {
      await scheduleInterview(scheduleApp.id, {
        interviewDate: schedDate,
        interviewTime: schedTime,
        interviewVenue: schedVenue,
        interviewPanel: schedPanel,
      });
      showNotification(`Interview scheduled for ${scheduleApp.full_name} on ${schedDate}. Invitation email dispatched.`);
      setScheduleApp(null);
      await loadData();
    } catch {
      showNotification('Failed to schedule interview.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreApp) return;

    setActionLoading(true);
    try {
      await recordInterviewResults(scoreApp.id, {
        score: Number(interviewScore),
        decision: interviewDecision,
        notes: interviewNotes.trim() || undefined,
      });

      if (interviewDecision === 'passed') {
        if (autoAdmitOnPass) {
          const prog = scoreApp.admitted_program || scoreApp.programs[0] || 'Certificate in Nursing';
          await issueAdmissionOffer(scoreApp.id, {
            admittedProgram: prog,
            residentialPreference: scoreApp.residential_preference || 'Resident',
          });
          await updateApplication(scoreApp.id, {
            interview_score: Number(interviewScore),
            interview_notes: interviewNotes.trim() || undefined,
          });
          showNotification(
            `Candidate scored ${interviewScore}% (Passed). Official Provisional Admission Offer & Fee Invoice issued & emailed!`
          );
        } else {
          await recordInterviewResults(scoreApp.id, {
            score: Number(interviewScore),
            decision: 'passed',
            notes: interviewNotes.trim() || undefined,
          });
          showNotification(`Interview score saved. Candidate marked as Passed.`);
        }
      } else if (interviewDecision === 'waitlisted') {
        await recordInterviewResults(scoreApp.id, {
          score: Number(interviewScore),
          decision: 'waitlisted',
          notes: interviewNotes.trim() || undefined,
        });
        showNotification(`Candidate placed on Waitlist. Notice email dispatched.`);
      } else {
        await rejectApplication(
          scoreApp.id,
          interviewNotes.trim() || `Score ${interviewScore}% was below the required interview passing threshold.`
        );
        await updateApplication(scoreApp.id, {
          interview_score: Number(interviewScore),
          interview_notes: interviewNotes.trim() || undefined,
        });
        showNotification(`Candidate scored ${interviewScore}%. Unsuccessful verdict recorded & regret email dispatched.`);
      }
      setScoreApp(null);
      await loadData();
    } catch {
      showNotification('Failed to record interview score.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitApp) return;

    const prog = admittedProgramChoice || admitApp.admitted_program || admitApp.programs[0];

    setActionLoading(true);
    try {
      await issueAdmissionOffer(admitApp.id, {
        admittedProgram: prog,
        residentialPreference: admitResidency,
      });
      showNotification(`Provisional admission offer issued for ${admitApp.full_name}. Official offer email dispatched.`);
      setAdmitApp(null);
      await loadData();
    } catch {
      showNotification('Failed to issue admission offer.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Multi-Selection Computations
  const isAllSelected = useMemo(() => {
    if (filteredApplications.length === 0) return false;
    return filteredApplications.every((app) => selectedAppIds.has(app.id));
  }, [filteredApplications, selectedAppIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAppIds(new Set());
    } else {
      const next = new Set<string>();
      filteredApplications.forEach((app) => next.add(app.id));
      setSelectedAppIds(next);
    }
  };

  const toggleSelectApp = (id: string) => {
    setSelectedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenBatchScheduleModal = () => {
    if (selectedAppIds.size === 0) {
      showNotification('Please select at least one candidate to schedule.', 'error');
      return;
    }
    setBatchDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setBatchScheduleModalOpen(true);
  };

  const handleBatchScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAppIds.size === 0 || !batchDate) return;
    setActionLoading(true);
    try {
      const { successCount, failureCount } = await batchScheduleInterviews(
        Array.from(selectedAppIds),
        {
          interviewDate: batchDate,
          interviewTime: batchTime,
          interviewVenue: batchVenue,
          interviewPanel: batchPanel,
        }
      );
      showNotification(
        `Batch schedule complete: ${successCount} candidates scheduled & invited via email (${failureCount} failed).`
      );
      setBatchScheduleModalOpen(false);
      setSelectedAppIds(new Set());
      await loadData();
    } catch {
      showNotification('Batch scheduling encountered an unexpected error.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchShortlist = async () => {
    if (selectedAppIds.size === 0) return;
    setActionLoading(true);
    try {
      for (const id of Array.from(selectedAppIds)) {
        await updateApplication(id, { status: 'shortlisted' });
      }
      showNotification(`${selectedAppIds.size} candidates shortlisted for interview.`);
      setSelectedAppIds(new Set());
      await loadData();
    } catch {
      showNotification('Failed to batch shortlist candidates.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedAppIds.size === 0) return;
    const reason = window.prompt(
      `Specify reason for rejecting ${selectedAppIds.size} candidates (official regret email will be sent to each):`,
      'Did not meet this intake entry requirements or quota limit.'
    );
    if (!reason) return;

    setActionLoading(true);
    try {
      for (const id of Array.from(selectedAppIds)) {
        await rejectApplication(id, reason);
      }
      showNotification(`${selectedAppIds.size} candidates rejected and regret notifications dispatched.`);
      setSelectedAppIds(new Set());
      await loadData();
    } catch {
      showNotification('Failed to batch reject candidates.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Scoring Sheet Candidates
  const scoringCandidates = useMemo(() => {
    return applications.filter((app) => {
      const isEligible = ['interview_scheduled', 'shortlisted', 'interview_passed', 'interview_failed'].includes(app.status);
      if (!isEligible) return false;
      if (selectedProgram !== 'all') {
        const matchesProgram = app.admitted_program === selectedProgram || app.programs?.includes(selectedProgram);
        if (!matchesProgram) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          app.full_name?.toLowerCase().includes(q) ||
          app.application_number?.toLowerCase().includes(q) ||
          app.phone?.includes(q) ||
          app.index_number?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [applications, selectedProgram, searchQuery]);

  const handleScoreInputChange = (id: string, score: number | '', notes?: string) => {
    setCandidateScores((prev) => ({
      ...prev,
      [id]: {
        score,
        notes: notes !== undefined ? notes : prev[id]?.notes || '',
      },
    }));
  };

  const handleSingleCandidateEvaluate = async (app: AdmissionApplicationRecord) => {
    const entry = candidateScores[app.id];
    const scoreVal = entry?.score !== undefined ? entry.score : (app.interview_score ?? '');
    if (scoreVal === '' || isNaN(Number(scoreVal))) {
      showNotification('Please enter a valid numeric interview score between 0 and 100.', 'error');
      return;
    }

    setRowProcessing((prev) => ({ ...prev, [app.id]: true }));
    try {
      const res = await evaluateInterviewCandidate(app, {
        score: Number(scoreVal),
        passThreshold: passMarkThreshold,
        notes: entry?.notes || app.interview_notes || '',
        autoAdmitOnPass,
      });

      if (res.success) {
        showNotification(
          res.verdict === 'passed'
            ? `${app.full_name} scored ${scoreVal}% — ${autoAdmitOnPass ? 'Admitted! Offer & Invoice dispatched.' : 'Interview Marked as Passed.'}`
            : `${app.full_name} scored ${scoreVal}% (< ${passMarkThreshold}%) — Regret notice dispatched.`
        );
        await loadData();
      }
    } catch {
      showNotification('Failed to evaluate candidate.', 'error');
    } finally {
      setRowProcessing((prev) => ({ ...prev, [app.id]: false }));
    }
  };

  const handleBatchProcessAllScored = async () => {
    const candidateIdsWithScores = Object.entries(candidateScores)
      .filter(([_, v]) => v.score !== '' && v.score !== undefined && !isNaN(Number(v.score)))
      .map(([id]) => id);

    if (candidateIdsWithScores.length === 0) {
      showNotification('No candidates currently have scores entered on the sheet.', 'error');
      return;
    }

    setScoringBatchLoading(true);
    let passedCount = 0;
    let failedCount = 0;

    try {
      for (const id of candidateIdsWithScores) {
        const app = applications.find((a) => a.id === id);
        if (!app) continue;
        const entry = candidateScores[id];
        const res = await evaluateInterviewCandidate(app, {
          score: Number(entry.score),
          passThreshold: passMarkThreshold,
          notes: entry.notes || '',
          autoAdmitOnPass,
        });
        if (res.verdict === 'passed') passedCount++;
        else failedCount++;
      }

      showNotification(
        `Scoring Run Complete: ${passedCount} passed & admitted with offers, ${failedCount} regret notices dispatched.`
      );
      await loadData();
    } catch {
      showNotification('Error processing batch scores.', 'error');
    } finally {
      setScoringBatchLoading(false);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'submitted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Submitted</span>;
      case 'under_review':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Under Vetting</span>;
      case 'shortlisted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Shortlisted</span>;
      case 'interview_scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">Interview Scheduled</span>;
      case 'interview_passed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Interview Passed</span>;
      case 'admitted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">Admitted (Pending Enrolment)</span>;
      case 'offer_accepted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-600 text-white">Offer Accepted</span>;
      case 'enrolled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-emerald-400 dark:bg-emerald-950 dark:text-emerald-300">Active Student</span>;
      case 'waitlisted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">Waitlisted</span>;
      case 'interview_failed':
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">Unsuccessful</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <AdminPageWrapper
      eyebrow="ADMISSIONS & INTAKE"
      title="Candidate Admissions & Matriculation Desk"
      subtitle="Vet UNEB science credentials, schedule candidate oral interviews, record interview scores, issue official admission letters, and execute 1-click student matriculation."
    >
      <div className="space-y-6">
        {/* Toast Notification */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-lg transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                viewMode === 'pipeline'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Applications Pipeline</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  viewMode === 'pipeline'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {filteredApplications.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('scoring')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                viewMode === 'scoring'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
              }`}
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Oral & Practical Scoring Sheet</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  viewMode === 'scoring'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold'
                }`}
              >
                {scoringCandidates.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden md:inline">
              {viewMode === 'pipeline'
                ? 'Select multiple candidates for bulk interview invitation'
                : `Automated Pass/Regret at ${passMarkThreshold}% threshold`}
            </span>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Refresh application records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* VIEW 1: APPLICATIONS PIPELINE */}
        {viewMode === 'pipeline' && (
          <>
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
              <div className={`${adminCardClass} flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Received</span>
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {stats.total}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Online & Walk-in</div>
                </div>
              </div>

              <div className={`${adminCardClass} flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending Vetting</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                    {stats.pending}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Awaiting Review</div>
                </div>
              </div>

              <div className={`${adminCardClass} flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Interviews</span>
                  <Calendar className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                    {stats.interviews}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Slips Generated</div>
                </div>
              </div>

              <div className={`${adminCardClass} flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Admitted</span>
                  <GraduationCap className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {stats.admitted}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Offer Letters Issued</div>
                </div>
              </div>

              <div className={`${adminCardClass} flex flex-col justify-between col-span-2 sm:col-span-1`}>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Enrolled</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-500" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {stats.enrolled}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Active in System</div>
                </div>
              </div>
            </div>

            {/* Floating / Pinned Batch Selection Action Bar */}
            {selectedAppIds.size > 0 && (
              <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-bold text-emerald-300 text-sm">
                    {selectedAppIds.size}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{selectedAppIds.size} Candidate{selectedAppIds.size > 1 ? 's' : ''} Selected</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    </div>
                    <div className="text-[11px] text-white/60">
                      Apply bulk interview invitation or status updates across all selected
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenBatchScheduleModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:brightness-110 text-emerald-950 font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Invite to Interview ({selectedAppIds.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchShortlist}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-semibold text-xs border border-purple-400/30 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Shortlist ({selectedAppIds.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchReject}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-semibold text-xs border border-rose-400/30 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject ({selectedAppIds.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAppIds(new Set())}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium transition-all"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Filters & Search Toolbar */}
            <div className={`${adminCardClass} space-y-4`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Sub-tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                  {[
                    { id: 'all', label: 'All Applications', count: stats.total },
                    { id: 'pending', label: 'Pending Vetting', count: stats.pending },
                    { id: 'interview_scheduled', label: 'Interview Scheduled', count: stats.interviews },
                    { id: 'admitted', label: 'Admitted / Ready to Enroll', count: stats.admitted },
                    { id: 'enrolled', label: 'Enrolled Active', count: stats.enrolled },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                          activeTab === tab.id
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search and Program Selector */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="md:col-span-8 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name, Application ID, phone number, or UNEB index..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="md:col-span-4">
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Academic Programs</option>
                    {AVAILABLE_PROGRAMS.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Datagrid Table */}
            <div className={`${adminCardClass} !p-0 overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="p-1 hover:text-emerald-500 transition-colors"
                          title={isAllSelected ? 'Deselect all' : 'Select all'}
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-4">Application ID</th>
                      <th className="py-3.5 px-4">Candidate Details</th>
                      <th className="py-3.5 px-4">Program & Intake</th>
                      <th className="py-3.5 px-4">UNEB Background</th>
                      <th className="py-3.5 px-4">Status & Interview</th>
                      <th className="py-3.5 px-4 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                            <span>Loading applications pipeline...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <AlertCircle className="w-6 h-6 text-slate-400" />
                            <span>No applications found matching the selected criteria.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredApplications.map((app) => (
                        <tr
                          key={app.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            selectedAppIds.has(app.id) ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''
                          }`}
                        >
                          {/* Row Multi-Select Checkbox */}
                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectApp(app.id)}
                              className="p-1 hover:text-emerald-500 transition-colors"
                            >
                              {selectedAppIds.has(app.id) ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>

                          {/* Application ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setInspectApp(app)}
                              className="hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>{app.application_number}</span>
                              <Eye className="w-3.5 h-3.5 opacity-60" />
                            </button>
                            <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                              {new Date(app.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Candidate Name & Contact */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-[13px]">
                              {app.full_name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{app.gender}</span>
                              <span>•</span>
                              <span>{app.phone}</span>
                            </div>
                          </td>

                          {/* Program & Intake */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {app.admitted_program || app.programs[0]}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {app.intake} • <span className="font-medium text-slate-600 dark:text-slate-300">{app.residential_preference || 'Resident'}</span>
                            </div>
                          </td>

                          {/* UNEB Credentials */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-slate-800 dark:text-slate-200">
                              {app.index_number || 'N/A'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {app.previous_school || 'Secondary School'}
                            </div>
                          </td>

                          {/* Status & Interview Details */}
                          <td className="py-3.5 px-4 space-y-1">
                            <div>{getStatusBadge(app.status)}</div>
                            {app.interview_date && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-emerald-600" />
                                <span>{app.interview_date} ({app.interview_time || '09:00 AM'})</span>
                              </div>
                            )}
                            {app.interview_score !== null && app.interview_score !== undefined && (
                              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                Score: {app.interview_score}/100
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {/* 1-Click Fast Enroll Button (When Admitted!) */}
                            {['admitted', 'offer_accepted'].includes(app.status) && (
                              <button
                                type="button"
                                onClick={() => setMatriculateApp(app)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00873E] hover:bg-[#007033] text-white font-bold text-xs shadow-sm transition-all"
                                title="1-Click Enroll Student into active system"
                              >
                                <GraduationCap className="w-3.5 h-3.5" />
                                <span>1-Click Enroll</span>
                              </button>
                            )}

                            {/* Schedule Interview (When submitted or shortlisted) */}
                            {['submitted', 'under_review', 'shortlisted'].includes(app.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setScheduleApp(app);
                                  setSchedDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                                title="Schedule Oral Interview"
                              >
                                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Schedule</span>
                              </button>
                            )}

                            {/* Record Marks (When interview is scheduled) */}
                            {app.status === 'interview_scheduled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setScoreApp(app);
                                  setInterviewScore(78);
                                  setInterviewDecision('passed');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold"
                                title="Record Interview Score & Outcome"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Score</span>
                              </button>
                            )}

                            {/* Issue Admission Offer (When interview is passed) */}
                            {app.status === 'interview_passed' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAdmitApp(app);
                                  setAdmittedProgramChoice(app.admitted_program || app.programs[0]);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                                title="Issue Provisional Admission Letter"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Issue Offer</span>
                              </button>
                            )}

                            {/* Download Interview Slip */}
                            {app.interview_date && (
                              <button
                                type="button"
                                onClick={() => generateInterviewSlipPdf(app)}
                                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                title="Download Interview Slip PDF"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Download Admission Letter */}
                            {['admitted', 'offer_accepted', 'enrolled'].includes(app.status) && (
                              <button
                                type="button"
                                onClick={() => generateAdmissionLetterPdf(app)}
                                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                title="Download Official Admission Letter PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Download Official Tuition & Fees Invoice */}
                            {['admitted', 'offer_accepted', 'enrolled'].includes(app.status) && (
                              <button
                                type="button"
                                onClick={() => generateAdmissionInvoicePdf(app)}
                                className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 transition-all"
                                title="Download Official Tuition & Requirements Fee Invoice (PDF)"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Detail Inspector */}
                            <button
                              type="button"
                              onClick={() => setInspectApp(app)}
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                              title="Inspect Candidate Record"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* VIEW 2: ORAL & PRACTICAL INTERVIEW SCORING SHEET */}
        {viewMode === 'scoring' && (
          <div className="space-y-6">
            {/* Scoring Desk Configuration Header Card */}
            <div className={`${adminCardClass} bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border-indigo-500/20`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Live Automated Evaluation Engine
                    </span>
                    <span className="text-white/40 text-xs">•</span>
                    <span className="text-white/70 text-xs font-semibold">
                      Official Resend Dispatch Enabled
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-400" />
                    <span>Oral & Practical Scoring Ledger</span>
                  </h3>
                  <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
                    Score interviewed candidates on clinical communication, UNEB sciences, and nursing aptitude.
                    Candidates achieving the configured pass threshold will automatically be awarded Provisional Admission,
                    issued a student pro-forma tuition invoice, and sent official verification via email.
                  </p>
                </div>

                {/* Configuration Controls */}
                <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  {/* Pass Mark Threshold Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider block">
                      Pass Threshold (0-100%)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="30"
                        max="100"
                        value={passMarkThreshold}
                        onChange={(e) => setPassMarkThreshold(Math.max(1, Math.min(100, Number(e.target.value))))}
                        className="w-20 px-3 py-2 rounded-xl bg-black/40 border border-emerald-400/50 text-emerald-300 font-black text-base text-center outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <span className="text-xs font-bold text-white/70">%</span>
                    </div>
                  </div>

                  {/* Auto-Admit Toggle */}
                  <div className="flex items-center gap-2.5 pt-4 sm:pt-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAdmitOnPass}
                        onChange={(e) => setAutoAdmitOnPass(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">Auto-Admit on Pass</div>
                      <div className="text-[10px] text-white/50">Dispatches offer letter & fee invoice</div>
                    </div>
                  </div>

                  {/* Batch Process All Button */}
                  <button
                    type="button"
                    onClick={handleBatchProcessAllScored}
                    disabled={scoringBatchLoading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 text-emerald-950 font-black text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    {scoringBatchLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Process All Scored Candidates</span>
                  </button>
                </div>
              </div>

              {/* Scoring Desk Search Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 pt-4 border-t border-white/10">
                <div className="md:col-span-8 relative">
                  <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name, Application ID, phone number, or index number..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="md:col-span-4">
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="all">All Academic Programs</option>
                    {AVAILABLE_PROGRAMS.map((p) => (
                      <option key={p.name} value={p.name} className="text-slate-900">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Candidate Scoring Sheet Table */}
            <div className={`${adminCardClass} !p-0 overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Candidate & App ID</th>
                      <th className="py-3.5 px-4">Program & Residence</th>
                      <th className="py-3.5 px-4">Interview Schedule</th>
                      <th className="py-3.5 px-4 w-28 text-center">Score (0-100)</th>
                      <th className="py-3.5 px-4 w-44">Live Verdict</th>
                      <th className="py-3.5 px-4">Panel Remarks</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {scoringCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <ClipboardList className="w-8 h-8 text-slate-400" />
                            <span className="font-semibold">No candidates found awaiting interview scoring.</span>
                            <span className="text-xs text-slate-400">
                              Shortlist candidates and schedule interviews in the Applications Pipeline first.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      scoringCandidates.map((app) => {
                        const entry = candidateScores[app.id];
                        const currentScore = entry?.score !== undefined ? entry.score : (app.interview_score ?? '');
                        const currentNotes = entry?.notes !== undefined ? entry.notes : (app.interview_notes ?? '');
                        const isNumeric = currentScore !== '' && !isNaN(Number(currentScore));
                        const numScore = Number(currentScore);
                        const isPassed = isNumeric && numScore >= passMarkThreshold;
                        const isProcessing = !!rowProcessing[app.id];

                        return (
                          <tr
                            key={app.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Candidate Info */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white text-sm">
                                {app.full_name}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {app.application_number} • {app.phone}
                              </div>
                              <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                                UNEB: {app.index_number || 'N/A'} ({app.gender})
                              </div>
                            </td>

                            {/* Program & Residence */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {app.admitted_program || app.programs[0]}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {app.residential_preference || 'Resident'} Boarding
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Intake: {app.intake}
                              </div>
                            </td>

                            {/* Interview Appointment */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                <span>{app.interview_date || 'Not set'}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {app.interview_time || '09:00 AM'} • {app.interview_venue || 'RCSN Main Campus'}
                              </div>
                              <div className="mt-1">
                                {getStatusBadge(app.status)}
                              </div>
                            </td>

                            {/* Score Input (0-100) */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="0-100"
                                  value={currentScore}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                    handleScoreInputChange(app.id, val, currentNotes);
                                  }}
                                  className={`w-20 px-2.5 py-2 rounded-xl text-center font-black text-sm border outline-none transition-all ${
                                    isNumeric
                                      ? isPassed
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Live Computed Verdict */}
                            <td className="py-3.5 px-4">
                              {!isNumeric ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  <span>Awaiting Score</span>
                                </span>
                              ) : isPassed ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-500/30">
                                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>PASS (≥ {passMarkThreshold}%)</span>
                                  </span>
                                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pl-1">
                                    {autoAdmitOnPass ? '→ Auto-Admit & Invoice' : '→ Pass Recorded'}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-500/30">
                                    <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                    <span>FAIL (&lt; {passMarkThreshold}%)</span>
                                  </span>
                                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold pl-1">
                                    → Regret Notice
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Panel Remarks Input */}
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                placeholder="Panel remarks (e.g. Excellent bedside manner, verified UCE passes)"
                                value={currentNotes}
                                onChange={(e) => handleScoreInputChange(app.id, currentScore, e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                              />
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleSingleCandidateEvaluate(app)}
                                disabled={isProcessing || !isNumeric}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                  isPassed
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                                }`}
                                title="Submit verdict, record score, and dispatch official email"
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                <span>Evaluate</span>
                              </button>

                              {/* Download Invoice if Admitted */}
                              {['admitted', 'offer_accepted', 'enrolled'].includes(app.status) && (
                                <button
                                  type="button"
                                  onClick={() => generateAdmissionInvoicePdf(app)}
                                  className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 transition-all"
                                  title="Download Tuition & Fees Invoice (PDF)"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Download Interview Slip */}
                              {app.interview_date && (
                                <button
                                  type="button"
                                  onClick={() => generateInterviewSlipPdf(app)}
                                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                  title="Download Interview Slip PDF"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BATCH INTERVIEW SCHEDULING MODAL */}
      <NativeModal
        isOpen={batchScheduleModalOpen}
        onClose={() => setBatchScheduleModalOpen(false)}
        title={`Batch Schedule Interviews (${selectedAppIds.size} Candidates)`}
        subtitle="Set appointment date, reporting time, and campus venue for all selected candidates."
        icon={Calendar}
        size="lg"
      >
        <form onSubmit={handleBatchScheduleSubmit} className="p-6 space-y-4 text-xs text-white">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-400/20 space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="font-bold text-sm text-white">
                Selected Candidates: {selectedAppIds.size}
              </span>
            </div>
            <p className="text-white/70 text-[11px] leading-relaxed">
              Every selected candidate will be updated to "Interview Scheduled", their unique interview slip will be generated,
              and an official branded interview invitation email will be dispatched to each candidate from admissions@rcsn.ac.ug.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
                Interview Date *
              </label>
              <input
                type="date"
                required
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white font-semibold focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
                Reporting Time *
              </label>
              <input
                type="text"
                required
                value={batchTime}
                onChange={(e) => setBatchTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white font-semibold placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
              Campus Venue *
            </label>
            <input
              type="text"
              required
              value={batchVenue}
              onChange={(e) => setBatchVenue(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
              Interview Panel / Special Instructions
            </label>
            <input
              type="text"
              value={batchPanel}
              onChange={(e) => setBatchPanel(e.target.value)}
              placeholder="e.g. Senior Nursing Faculty Panel - Candidates must report in smart official attire with original UNEB slips"
              className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
            />
          </div>

          <div className="pt-3 border-t border-white/15 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setBatchScheduleModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold transition-all backdrop-blur-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Invitations...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirm & Send {selectedAppIds.size} Invitations</span>
                </>
              )}
            </button>
          </div>
        </form>
      </NativeModal>

      {/* 1-Click Matriculation Modal */}
      <MatriculateStudentModal
        application={matriculateApp}
        isOpen={!!matriculateApp}
        onClose={() => setMatriculateApp(null)}
        onSuccess={() => {
          showNotification('Student successfully matriculated into Active Student Directory.');
          loadData();
        }}
      />

      {/* Schedule Interview Modal */}
      <NativeModal
        isOpen={!!scheduleApp}
        onClose={() => setScheduleApp(null)}
        title="Schedule Oral Interview"
        subtitle="Set appointment date, reporting time, and campus venue for candidate."
        icon={Calendar}
        size="md"
      >
        {scheduleApp && (
          <form onSubmit={handleConfirmSchedule} className="p-6 space-y-4 text-xs text-white">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-1">
              <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Candidate</span>
              <span className="font-bold text-sm text-white block">
                {scheduleApp.full_name} ({scheduleApp.application_number})
              </span>
              <span className="text-emerald-400 font-semibold block mt-0.5">
                {scheduleApp.admitted_program || scheduleApp.programs[0]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
                  Interview Date *
                </label>
                <input
                  type="date"
                  required
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white font-semibold focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
                  Reporting Time *
                </label>
                <input
                  type="text"
                  required
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  placeholder="09:00 AM"
                  className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white font-semibold placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
                Campus Venue *
              </label>
              <input
                type="text"
                required
                value={schedVenue}
                onChange={(e) => setSchedVenue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
                Interview Panel / Notes
              </label>
              <input
                type="text"
                value={schedPanel}
                onChange={(e) => setSchedPanel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
              />
            </div>

            <div className="pt-3 border-t border-white/15 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setScheduleApp(null)}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold transition-all backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {actionLoading ? 'Scheduling...' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        )}
      </NativeModal>

      {/* Record Interview Score Modal */}
      <NativeModal
        isOpen={!!scoreApp}
        onClose={() => setScoreApp(null)}
        title="Record Interview Results"
        subtitle="Assess candidate scores, panel recommendation verdict, and remarks."
        icon={UserCheck}
        size="md"
      >
        {scoreApp && (
          <form onSubmit={handleConfirmScore} className="p-6 space-y-4 text-xs text-white">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-1">
              <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Candidate</span>
              <span className="font-bold text-sm text-white block">
                {scoreApp.full_name} ({scoreApp.application_number})
              </span>
              <span className="text-emerald-400 font-semibold block mt-0.5">
                Interview Date: {scoreApp.interview_date}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-[30] focus-within:z-[50]">
              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
                  Interview Score (0 - 100) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={interviewScore}
                  onChange={(e) => setInterviewScore(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-emerald-400 font-bold text-base focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Panel Recommendation *
                </label>
                <LiquidGlassSelect
                  value={interviewDecision}
                  onChange={(val) => setInterviewDecision(val as typeof interviewDecision)}
                  options={[
                    { value: 'passed', label: 'Passed (Recommended)' },
                    { value: 'waitlisted', label: 'Waitlisted' },
                    { value: 'failed', label: 'Unsuccessful / Failed' },
                  ]}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold uppercase tracking-wider text-[11px] text-white/70 block">
                Panel Assessment Notes & Remarks
              </label>
              <textarea
                rows={3}
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                placeholder="e.g. Fluent oral communication, clear passion for clinical nursing, verified original UCE passes."
                className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none resize-none no-scrollbar"
              />
            </div>

            <div className="pt-3 border-t border-white/15 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setScoreApp(null)}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold transition-all backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Record Results'}
              </button>
            </div>
          </form>
        )}
      </NativeModal>

      {/* Issue Admission Offer Modal */}
      <NativeModal
        isOpen={!!admitApp}
        onClose={() => setAdmitApp(null)}
        title="Issue Provisional Admission Offer"
        subtitle="Confirm admitted academic program and approved residential boarding status."
        icon={FileText}
        size="md"
      >
        {admitApp && (
          <form onSubmit={handleConfirmAdmit} className="p-6 space-y-4 text-xs text-white">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-1">
              <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Candidate</span>
              <span className="font-bold text-sm text-white block">
                {admitApp.full_name} ({admitApp.application_number})
              </span>
              <span className="text-emerald-400 font-semibold block mt-0.5">
                Interview Score: {admitApp.interview_score ?? 80}/100 (Passed)
              </span>
            </div>

            <div className="relative z-[35] focus-within:z-[50]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Admitted Program *
              </label>
              <LiquidGlassSelect
                value={admittedProgramChoice}
                onChange={(val) => setAdmittedProgramChoice(val)}
                options={AVAILABLE_PROGRAMS.map((p) => ({ value: p.name, label: p.name }))}
              />
            </div>

            <div className="relative z-[30] focus-within:z-[50]">
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Approved Residential Status *
              </label>
              <LiquidGlassSelect
                value={admitResidency}
                onChange={(val) => setAdmitResidency(val as typeof admitResidency)}
                options={[
                  { value: 'Resident', label: 'Resident (Full Boarder on Campus)' },
                  { value: 'Non-Resident', label: 'Non-Resident (Day Scholar)' },
                ]}
              />
            </div>

            <div className="pt-3 border-t border-white/15 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAdmitApp(null)}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold transition-all backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {actionLoading ? 'Issuing...' : 'Issue Official Admission Offer'}
              </button>
            </div>
          </form>
        )}
      </NativeModal>

      {/* Candidate Full Inspector Drawer / Modal */}
      <NativeModal
        isOpen={!!inspectApp}
        onClose={() => setInspectApp(null)}
        title={inspectApp ? `Candidate Dossier: ${inspectApp.application_number}` : 'Candidate Dossier'}
        subtitle="Complete bio details, UNEB results slips, next-of-kin, and payment status."
        icon={ShieldCheck}
        size="xl"
      >
        {inspectApp && (
          <div className="p-6 space-y-5 text-xs text-white flex flex-col max-h-[75vh] overflow-y-auto no-scrollbar">
            {/* Header Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-white">
                  {inspectApp.full_name}
                </h4>
                <p className="text-white/60 mt-0.5">
                  {inspectApp.gender} • DOB: {inspectApp.date_of_birth} • Tel: {inspectApp.phone}
                </p>
              </div>
              <div>{getStatusBadge(inspectApp.status)}</div>
            </div>

            {/* Quick Actions (PDF Downloads) */}
            <div className="flex flex-wrap gap-2">
              {inspectApp.interview_date && (
                <button
                  type="button"
                  onClick={() => generateInterviewSlipPdf(inspectApp)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold transition-all"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download Interview Slip (PDF)</span>
                </button>
              )}

              {['admitted', 'offer_accepted', 'enrolled'].includes(inspectApp.status) && (
                <>
                  <button
                    type="button"
                    onClick={() => generateAdmissionLetterPdf(inspectApp)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-semibold transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Admission Offer (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => generateAdmissionInvoicePdf(inspectApp)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-300 font-semibold transition-all"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Download Fee Invoice (PDF)</span>
                  </button>
                </>
              )}
            </div>

            {/* Programs Applied */}
            <div className="space-y-1.5">
              <span className="font-bold text-white/70 uppercase tracking-wider block text-[11px]">
                Chosen Academic Programs
              </span>
              <div className="flex flex-wrap gap-2">
                {inspectApp.programs.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Academic Background & UNEB Subject Passes */}
            <div className="space-y-2">
              <span className="font-bold text-white/70 uppercase tracking-wider block text-[11px]">
                UNEB Science Grades & Academic Background
              </span>
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white/90">
                    Previous School: {inspectApp.previous_school || 'N/A'}
                  </span>
                  <span className="font-mono font-bold text-white/60">
                    Index: {inspectApp.index_number || 'N/A'}
                  </span>
                </div>
                {inspectApp.subject_grades && inspectApp.subject_grades.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                    {inspectApp.subject_grades.map((sg, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-black/30 border border-white/20 font-mono font-bold"
                      >
                        {sg.subject}: <span className="text-emerald-400">{sg.grade}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Next of Kin & Payment */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-1">
                <span className="font-bold text-white/50 uppercase tracking-wider block text-[10px]">
                  Next of Kin / Guardian
                </span>
                <div className="font-bold text-white">
                  {inspectApp.guardian_name || 'N/A'}
                </div>
                <div className="text-white/60">{inspectApp.guardian_phone || 'No phone'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-1">
                <span className="font-bold text-white/50 uppercase tracking-wider block text-[10px]">
                  Application Fee (UGX 50,000)
                </span>
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Paid & Verified</span>
                </div>
                <div className="text-white/60 font-mono text-[10px]">
                  Ref: {inspectApp.payment_reference || 'RCSN-MOMO-TXN'}
                </div>
              </div>
            </div>

            {/* Attached UNEB Slips */}
            {inspectApp.attached_document_name && (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/15 backdrop-blur-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white/90">
                    {inspectApp.attached_document_name}
                  </span>
                  <span className="text-[10px] text-white/50">({inspectApp.attached_document_size || 'Attached'})</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-400">Document Uploaded</span>
              </div>
            )}

            {/* Vetting Decisions */}
            {['submitted', 'under_review'].includes(inspectApp.status) && (
              <div className="pt-3 border-t border-white/15 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleVettingRejection(inspectApp)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-bold transition-all"
                >
                  Reject Candidate
                </button>
                <button
                  type="button"
                  onClick={() => handleVettingApproval(inspectApp)}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Approve for Interview
                </button>
              </div>
            )}
          </div>
        )}
      </NativeModal>
    </AdminPageWrapper>
  );
}
