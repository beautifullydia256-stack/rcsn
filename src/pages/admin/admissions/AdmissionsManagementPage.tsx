import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ArrowLeft,
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
  Camera,
  FileCheck,
  ExternalLink,
  Mail,
  CalendarCheck,
  ChevronDown,
  Layers,
} from 'lucide-react';
import {
  fetchApplications,
  updateApplication,
  matriculateApplicantToStudent,
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
import { generateAdmissionApplicationPdf } from '@/lib/generateAdmissionApplicationPdf';
import type { AdmissionApplication } from '@/services/schoolPublicService';
import { AVAILABLE_PROGRAMS } from '@/components/website/AdmissionsModal';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

export default function AdmissionsManagementPage() {
  const [applications, setApplications] = useState<AdmissionApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'to_be_invited' | 'interview_scheduled' | 'admitted' | 'enrolled'>('pending');
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
  const [scheduleCandidates, setScheduleCandidates] = useState<AdmissionApplicationRecord[]>([]);
  const [scoreApp, setScoreApp] = useState<AdmissionApplicationRecord | null>(null);
  const [admitApp, setAdmitApp] = useState<AdmissionApplicationRecord | null>(null);
  const [matriculateApp, setMatriculateApp] = useState<AdmissionApplicationRecord | null>(null);

  // Candidate Documents Modal State (Two-Tier: List Mode & Preview Mode)
  const [candidateDocsModal, setCandidateDocsModal] = useState<{
    isOpen: boolean;
    app: AdmissionApplicationRecord;
    docs: { name: string; url: string; size?: string; isImage: boolean }[];
    selectedDocIndex: number | null; // null = List of documents, number = Previewing specific document
  } | null>(null);

  // Scheduling Form
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('09:00 AM');
  const [schedVenue, setSchedVenue] = useState('RCSN Main Campus, Kalisizo / Rakai District');
  const [schedPanel, setSchedPanel] = useState('Senior Nursing & Midwifery Faculty Panel');

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
    const toBeInvited = applications.filter((a) => a.status === 'shortlisted').length;
    const interviews = applications.filter((a) => a.status === 'interview_scheduled').length;
    const admitted = applications.filter((a) => ['interview_passed', 'admitted', 'offer_accepted'].includes(a.status)).length;
    const enrolled = applications.filter((a) => a.status === 'enrolled').length;
    return { total, pending, toBeInvited, interviews, admitted, enrolled };
  }, [applications]);

  // Filtered List
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Tab filter
      if (activeTab === 'pending' && !['submitted', 'under_review'].includes(app.status)) return false;
      if (activeTab === 'to_be_invited' && app.status !== 'shortlisted') return false;
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
      showNotification(`${app.full_name} approved for interview! Added to 'To Be Invited'. Set an interview day to dispatch invitations.`);
      if (inspectApp?.id === app.id) setInspectApp(null);
      await loadData();
      setActiveTab('to_be_invited');
    } catch {
      showNotification('Failed to update vetting approval status.', 'error');
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
    if (scheduleCandidates.length === 0 || !schedDate) return;

    setActionLoading(true);
    try {
      const candidateIds = scheduleCandidates.map((c) => c.id);
      const { successCount, failureCount } = await batchScheduleInterviews(candidateIds, {
        interviewDate: schedDate,
        interviewTime: schedTime,
        interviewVenue: schedVenue,
        interviewPanel: schedPanel,
      });

      showNotification(
        `Interview date set for ${schedDate}! Official invitations sent to ${successCount} candidate(s)${failureCount > 0 ? ` (${failureCount} failed)` : ''}. Candidates moved to 'Interview Scheduled' and the Interview Results Desk.`
      );
      setScheduleCandidates([]);
      setSelectedAppIds(new Set());
      setActiveTab('interview_scheduled');
      await loadData();
    } catch {
      showNotification('Failed to schedule interview appointments.', 'error');
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

  // Admitted Candidates Selected in Multi-Selection
  const admittedSelectedCandidates = useMemo(() => {
    return filteredApplications.filter(
      (app) => selectedAppIds.has(app.id) && ['admitted', 'offer_accepted'].includes(app.status)
    );
  }, [filteredApplications, selectedAppIds]);

  const handleBatchEnrollAdmitted = async () => {
    if (admittedSelectedCandidates.length === 0) return;

    if (admittedSelectedCandidates.length === 1) {
      setMatriculateApp(admittedSelectedCandidates[0]);
      return;
    }

    const confirmMsg = `Enroll all ${admittedSelectedCandidates.length} selected admitted candidates into the active student directory?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      let successCount = 0;
      for (const app of admittedSelectedCandidates) {
        const year = new Date().getFullYear();
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const regNo = `RCSN/${year}/${randomSuffix}`;
        const res = await matriculateApplicantToStudent(app, {
          registrationNumber: regNo,
          currentClass: app.admitted_program?.includes('Diploma') ? 'Year 1 Diploma' : 'Year 1 Certificate',
          boardingType: app.residential_preference || 'Resident',
        });
        if (res.success) successCount++;
      }
      showNotification(`Enrolled ${successCount} candidates into active student registry.`);
      setSelectedAppIds(new Set());
      await loadData();
    } catch (err) {
      console.error('Batch enrollment error:', err);
      showNotification('Batch enrollment encountered an error.', 'error');
    } finally {
      setActionLoading(false);
    }
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
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700">Approved • To Be Invited</span>;
      case 'interview_scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">Interview Scheduled</span>;
      case 'interview_passed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Interview Passed</span>;
      case 'admitted':
      case 'offer_accepted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white whitespace-nowrap">Admitted</span>;
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



  const handleDownloadDocument = (docUrl?: string | null, docName?: string | null) => {
    if (!docUrl) {
      showNotification('No document file is available for download.', 'error');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = docUrl;
      link.download = docName || `candidate_document_${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification(`Downloading ${docName || 'document'}...`);
    } catch (err) {
      console.error('Download error:', err);
      window.open(docUrl, '_blank');
    }
  };

  const isPdfDoc = (url: string, name: string) => {
    return (
      url.startsWith('data:application/pdf') ||
      /\.pdf(\?.*)?$/i.test(name) ||
      /\.pdf(\?.*)?$/i.test(url)
    );
  };

  const isImgDoc = (url: string, name: string) => {
    if (isPdfDoc(url, name)) return false;
    return (
      url.startsWith('data:image/') ||
      /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(name) ||
      /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(url)
    );
  };

  const getCandidateDocuments = (app: AdmissionApplicationRecord) => {
    const docs: { name: string; url: string; size?: string; isImage: boolean }[] = [];

    // 1. Direct attached_documents array if present
    if (app.attached_documents && Array.isArray(app.attached_documents) && app.attached_documents.length > 0) {
      app.attached_documents.forEach((d, idx) => {
        const dUrl = d.data || d.url;
        if (dUrl) {
          const dName = d.name || `Document #${idx + 1}`;
          docs.push({
            name: dName,
            url: dUrl,
            size: d.size,
            isImage: isImgDoc(dUrl, dName),
          });
        }
      });
    }

    // 2. If attached_document_url is a serialized JSON array
    const rawUrl = (app.attached_document_data || app.attached_document_url || '').trim();
    if (docs.length === 0 && rawUrl.startsWith('[') && rawUrl.endsWith(']')) {
      try {
        const parsed = JSON.parse(rawUrl);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((d: any, idx: number) => {
            const dUrl = d.data || d.url || '';
            if (dUrl) {
              const dName = d.name || `Document #${idx + 1}`;
              docs.push({
                name: dName,
                url: dUrl,
                size: d.size,
                isImage: isImgDoc(dUrl, dName),
              });
            }
          });
        }
      } catch (_) {}
    }

    // 3. Fallback single document
    if (docs.length === 0 && rawUrl) {
      let dName = app.attached_document_name || 'Candidate Academic Document';
      if (dName.includes(',')) {
        dName = dName.split(',')[0].trim();
      }
      docs.push({
        name: dName,
        url: rawUrl,
        size: app.attached_document_size || undefined,
        isImage: isImgDoc(rawUrl, dName),
      });
    }

    return docs;
  };

  const handleOpenInNewTab = (url: string, name: string) => {
    if (url.startsWith('data:')) {
      const win = window.open('');
      if (win) {
        if (url.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/i.test(name)) {
          win.document.write(`
            <!DOCTYPE html>
            <html>
              <head><title>${name}</title><style>body,html{margin:0;padding:0;height:100%;overflow:hidden;background:#525659;}</style></head>
              <body><iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe></body>
            </html>
          `);
        } else {
          win.document.write(`
            <!DOCTYPE html>
            <html>
              <head><title>${name}</title><style>body,html{margin:0;padding:20px;display:flex;align-items:center;justify-content:center;background:#0f172a;min-height:100vh;}</style></head>
              <body><img src="${url}" alt="${name}" style="max-width:100%;max-height:95vh;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);" /></body>
            </html>
          `);
        }
        win.document.close();
        return;
      }
    }
    window.open(url, '_blank');
  };

  const handleOpenCandidateDocs = (app: AdmissionApplicationRecord, initialIndex: number | null = null) => {
    const docs = getCandidateDocuments(app);
    if (docs.length === 0) {
      showNotification('No digital documents attached for this candidate.', 'error');
      return;
    }

    const validIndex =
      initialIndex !== null && initialIndex >= 0 && initialIndex < docs.length
        ? initialIndex
        : (docs.length === 1 ? 0 : null);

    setCandidateDocsModal({
      isOpen: true,
      app,
      docs,
      selectedDocIndex: validIndex,
    });
  };

  return (
    <AdminPageWrapper
      eyebrow="ADMISSIONS & INTAKE"
      title="Candidate Admissions & Matriculation Desk"
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

        {/* Page Selection: Two Distinct Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Two Page Buttons */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            {/* Button 1: Applications Pipeline */}
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 ${
                viewMode === 'pipeline'
                  ? 'bg-[#00873E] hover:bg-[#007033] text-white shadow-md ring-2 ring-emerald-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Applications Pipeline</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  viewMode === 'pipeline'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {filteredApplications.length}
              </span>
            </button>

            {/* Button 2: Interview Results */}
            <button
              type="button"
              onClick={() => setViewMode('scoring')}
              className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 ${
                viewMode === 'scoring'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 text-white shadow-md ring-2 ring-emerald-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Award className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-300" />
              <span className="truncate">Interview Results</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  viewMode === 'scoring'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}
              >
                {scoringCandidates.length}
              </span>
            </button>
          </div>

          {/* Right Status Indicator & Refresh */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate hidden md:inline">
              {viewMode === 'pipeline'
                ? `${filteredApplications.length} candidate(s) listed`
                : `${scoringCandidates.length} awaiting evaluation`}
            </span>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shadow-sm transition-colors shrink-0"
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
                    </div>
                    <div className="text-[11px] text-white/60">
                      Apply bulk interview invitation, enrollment, or status updates
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Enroll Admitted Candidates (when selected candidates are admitted) */}
                  {admittedSelectedCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (admittedSelectedCandidates.length === 1) {
                          setMatriculateApp(admittedSelectedCandidates[0]);
                        } else {
                          handleBatchEnrollAdmitted();
                        }
                      }}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-emerald-950 font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Enroll Candidate{admittedSelectedCandidates.length > 1 ? `s (${admittedSelectedCandidates.length})` : ''}</span>
                    </button>
                  )}

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
                {/* Mobile Stage Filter Dropdown */}
                <div className="sm:hidden w-full space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Filter by Stage:
                  </label>
                  <div className="relative">
                    <select
                      value={activeTab}
                      onChange={(e) => setActiveTab(e.target.value as typeof activeTab)}
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                    >
                      <option value="all">All Applications ({stats.total})</option>
                      <option value="pending">Pending Vetting ({stats.pending})</option>
                      <option value="to_be_invited">To Be Invited ({stats.toBeInvited})</option>
                      <option value="interview_scheduled">Interview Scheduled ({stats.interviews})</option>
                      <option value="admitted">Admitted / Ready to Enroll ({stats.admitted})</option>
                      <option value="enrolled">Enrolled Active ({stats.enrolled})</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Desktop Sub-tabs */}
                <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                  {[
                    { id: 'all', label: 'All Applications', count: stats.total },
                    { id: 'pending', label: 'Pending Vetting', count: stats.pending },
                    { id: 'to_be_invited', label: 'To Be Invited', count: stats.toBeInvited },
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="md:col-span-8 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name, Application ID, phone number, or UNEB index..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="md:col-span-4">
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Academic Programs</option>
                    {AVAILABLE_PROGRAMS.map((p) => (
                      <option key={p.name} value={p.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* To Be Invited Call-to-Action Action Banner */}
            {activeTab === 'to_be_invited' && stats.toBeInvited > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-purple-500/15 border-2 border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                      {stats.toBeInvited} Candidate{stats.toBeInvited === 1 ? '' : 's'} Approved &amp; Waiting to be Invited
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      The admissions committee has approved these candidates. Set the official interview day and campus venue to dispatch invitation letters and slips.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const allShortlisted = applications.filter((a) => a.status === 'shortlisted');
                      setSchedDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                      setSchedTime('09:00 AM');
                      setSchedVenue('RCSN Main Campus, Kalisizo / Rakai District');
                      setSchedPanel('Senior Nursing & Midwifery Faculty Panel');
                      setScheduleCandidates(allShortlisted);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Set Interview Day &amp; Invite All ({stats.toBeInvited})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Card View (Screens < 768px) */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs font-bold">Loading applications pipeline...</span>
                  </div>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-slate-400" />
                    <span className="text-xs font-semibold">No applications found matching the selected criteria.</span>
                  </div>
                </div>
              ) : (
                filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all space-y-3 shadow-sm ${
                      selectedAppIds.has(app.id)
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Top Row: Select Checkbox, Photo, Candidate Name & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectApp(app.id);
                          }}
                          className="mt-0.5 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                        >
                          {selectedAppIds.has(app.id) ? (
                            <CheckSquare className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        {app.passport_photo_url ? (
                          <img
                            src={app.passport_photo_url}
                            alt={app.full_name}
                            className="w-10 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-12 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                            <Users className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setInspectApp(app)}
                            className="text-left font-bold text-slate-900 dark:text-white text-sm hover:text-emerald-600 block truncate"
                          >
                            {app.full_name}
                          </button>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {app.application_number}
                          </div>
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                            {app.admitted_program || app.programs[0]}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(app.status)}</div>
                    </div>

                    {/* Meta Info: Phone, UNEB Index, Interview Date */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact</span>
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{app.phone || 'No phone'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">UNEB Index</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono font-semibold">{app.index_number || 'N/A'}</span>
                      </div>
                      {app.interview_date && (
                        <div className="col-span-2 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>Interview: {app.interview_date} ({app.interview_time || '09:00 AM'})</span>
                        </div>
                      )}
                      {app.interview_score !== null && app.interview_score !== undefined && (
                        <div className="col-span-2 text-emerald-700 dark:text-emerald-400 font-bold">
                          Interview Score: {app.interview_score}/100
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectApp(app)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs hover:bg-black transition-colors"
                        >
                          Dossier
                        </button>
                        {getCandidateDocuments(app).length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenCandidateDocs(app)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Docs ({getCandidateDocuments(app).length})</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {['submitted', 'under_review'].includes(app.status) && (
                          <button
                            type="button"
                            onClick={() => handleVettingApproval(app)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-sm"
                          >
                            Approve
                          </button>
                        )}
                        {app.status === 'shortlisted' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSchedDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                              setSchedTime('09:00 AM');
                              setSchedVenue('RCSN Main Campus, Kalisizo / Rakai District');
                              setSchedPanel('Senior Nursing & Midwifery Faculty Panel');
                              setScheduleCandidates([app]);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 shadow-sm flex items-center gap-1"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>Invite</span>
                          </button>
                        )}
                        {app.status === 'interview_scheduled' && (
                          <button
                            type="button"
                            onClick={() => {
                              setScoreApp(app);
                              setInterviewScore(app.interview_score ?? 75);
                              setInterviewNotes(app.interview_notes ?? '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-500 shadow-sm"
                          >
                            Score
                          </button>
                        )}
                        {app.status === 'admitted' && (
                          <button
                            type="button"
                            onClick={() => setMatriculateApp(app)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 shadow-sm"
                          >
                            Enroll
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Datagrid Table (Screens >= 768px) */}
            <div className={`hidden md:block ${adminCardClass} !p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
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
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[190px]">Status & Interview</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap w-36">Workflow Actions</th>
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
                          onClick={() => setInspectApp(app)}
                          className={`cursor-pointer hover:bg-emerald-50/70 dark:hover:bg-slate-800/60 transition-colors ${
                            selectedAppIds.has(app.id) ? 'bg-emerald-500/10 dark:bg-emerald-500/15' : ''
                          }`}
                        >
                          {/* Row Multi-Select Checkbox */}
                          <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
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

                          {/* Candidate Name & Contact with Passport Thumbnail */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {app.passport_photo_url ? (
                                <img
                                  src={app.passport_photo_url}
                                  alt={app.full_name}
                                  className="w-10 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 bg-slate-100 dark:bg-slate-800"
                                />
                              ) : (
                                <div className="w-10 h-11 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shrink-0 text-slate-400">
                                  <Users className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-[13px]">
                                  {app.full_name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>{app.gender}</span>
                                  <span>•</span>
                                  <span>{app.phone}</span>
                                </div>
                              </div>
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
                          <td className="py-3.5 px-4 whitespace-nowrap min-w-[190px]">
                            <div className="space-y-1">
                              <div>{getStatusBadge(app.status)}</div>
                              {app.interview_date && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>{app.interview_date} ({app.interview_time || '09:00 AM'})</span>
                                </div>
                              )}
                              {app.interview_score !== null && app.interview_score !== undefined && (
                                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                  Score: {app.interview_score}/100
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Workflow Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {/* Approve Button for Pending Candidates (Adds to To Be Invited) */}
                              {['submitted', 'under_review'].includes(app.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleVettingApproval(app)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all active:scale-95"
                                  title="Approve candidate qualifications for interview (adds to To Be Invited pool)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                              )}

                              {/* Set Day & Invite Button for Shortlisted Candidates */}
                              {app.status === 'shortlisted' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSchedDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                                    setSchedTime('09:00 AM');
                                    setSchedVenue('RCSN Main Campus, Kalisizo / Rakai District');
                                    setSchedPanel('Senior Nursing & Midwifery Faculty Panel');
                                    setScheduleCandidates([app]);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition-all active:scale-95"
                                  title="Set Interview Day and Send Official Invitation"
                                >
                                  <CalendarCheck className="w-3.5 h-3.5" />
                                  <span>Set Day &amp; Invite</span>
                                </button>
                              )}

                              {/* Direct Score Candidate Button for Scheduled Candidates */}
                              {app.status === 'interview_scheduled' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setScoreApp(app);
                                    setInterviewScore(app.interview_score ?? 75);
                                    setInterviewNotes(app.interview_notes ?? '');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-all active:scale-95"
                                  title="Record Interview Score & Panel Evaluation"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Score Candidate</span>
                                </button>
                              )}

                              {/* Quick Document Viewer Button */}
                              {getCandidateDocuments(app).length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCandidateDocs(app)}
                                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all"
                                  title={`View Candidate Documents (${getCandidateDocuments(app).length} uploaded)`}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Download Interview Slip */}
                              {app.interview_date && (
                                <button
                                  type="button"
                                  onClick={() => generateInterviewSlipPdf(app)}
                                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
                                  title="Download Interview Slip PDF"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                </button>
                              )}

                              {/* Download Admission Letter */}
                              {['admitted', 'offer_accepted', 'enrolled'].includes(app.status) && (
                                <button
                                  type="button"
                                  onClick={() => generateAdmissionLetterPdf(app)}
                                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
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
                                className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
                                title="Inspect Candidate Dossier"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

        {/* VIEW 2: INTERVIEW RESULTS SHEET */}
        {viewMode === 'scoring' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className={`${adminCardClass} border border-slate-200/80 dark:border-slate-800`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Interview Results & Scoring Desk</span>
                  </h3>
                </div>

                {/* Configuration Controls */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Pass Mark Threshold Input */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Pass Threshold:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={passMarkThreshold}
                        onChange={(e) => setPassMarkThreshold(Math.max(1, Math.min(100, Number(e.target.value))))}
                        className="w-14 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-emerald-600 dark:text-emerald-400 font-black text-sm text-center outline-none focus:border-emerald-500 shadow-sm"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  {/* Auto-Admit Toggle */}
                  <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAdmitOnPass}
                        onChange={(e) => setAutoAdmitOnPass(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto-Admit on Pass</span>
                  </div>

                  {/* Batch Process All Button */}
                  <button
                    type="button"
                    onClick={handleBatchProcessAllScored}
                    disabled={scoringBatchLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all active:scale-95 disabled:opacity-50"
                  >
                    {scoringBatchLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Process All Scored</span>
                  </button>
                </div>
              </div>

              {/* Scoring Desk Search Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
                <div className="md:col-span-8 relative">
                  <Search className="w-4 h-4 text-slate-400 dark:text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name, Application ID, phone number, or index number..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="md:col-span-4">
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">All Academic Programs</option>
                    {AVAILABLE_PROGRAMS.map((p) => (
                      <option key={p.name} value={p.name} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Candidate Scoring Cards (Screens < 768px) */}
            <div className="md:hidden space-y-3.5">
              {scoringCandidates.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                      <ClipboardList className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">No candidates found awaiting interview scoring.</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                      Shortlist candidates and schedule interviews in the Applications Pipeline first.
                    </span>
                  </div>
                </div>
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
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-emerald-500/40 transition-all"
                    >
                      {/* Top: Candidate info and Photo */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {app.passport_photo_url ? (
                            <img
                              src={app.passport_photo_url}
                              alt={app.full_name}
                              className="w-12 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                              <Users className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setInspectApp(app)}
                              className="text-left font-bold text-slate-900 dark:text-white text-sm hover:text-emerald-600 block truncate"
                            >
                              {app.full_name}
                            </button>
                            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {app.application_number}
                            </div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                              {app.admitted_program || app.programs[0]}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">{getStatusBadge(app.status)}</div>
                      </div>

                      {/* Interview Schedule Banner */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{app.interview_date || 'Date not set'} ({app.interview_time || '09:00 AM'})</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {app.phone}
                        </span>
                      </div>

                      {/* Score Input & Live Computed Verdict */}
                      <div className="grid grid-cols-2 gap-2.5 items-center p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                            Oral Score (0-100)
                          </label>
                          <div className="flex items-center gap-1.5">
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
                              className={`w-full px-3 py-2 rounded-xl text-center font-black text-base border outline-none transition-all ${
                                isNumeric
                                  ? isPassed
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                              }`}
                            />
                            <span className="text-xs font-bold text-slate-400">/100</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                            Computed Verdict
                          </label>
                          {!isNumeric ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400 w-full justify-center">
                              <Clock className="w-3 h-3" />
                              <span>Awaiting Score</span>
                            </span>
                          ) : isPassed ? (
                            <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-500/30 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>PASS (≥{passMarkThreshold}%)</span>
                              </span>
                              <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                                {autoAdmitOnPass ? 'Auto-Admit Active' : 'Pass Recorded'}
                              </div>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-500/30 text-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-800 dark:text-rose-300">
                                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>FAIL (&lt;{passMarkThreshold}%)</span>
                              </span>
                              <div className="text-[9px] font-bold text-rose-700 dark:text-rose-400">
                                Regret Notice
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Remarks Input */}
                      <div>
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                          Panel Remarks / Notes
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Confirmed science passes, good attitude..."
                          value={currentNotes}
                          onChange={(e) => handleScoreInputChange(app.id, currentScore, e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setInspectApp(app)}
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
                        >
                          Dossier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSingleCandidateEvaluate(app)}
                          disabled={isProcessing || !isNumeric}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isPassed
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          <span>Save &amp; Dispatch Verdict</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Candidate Scoring Sheet Table (Screens >= 768px) */}
            <div className={`hidden md:block ${adminCardClass} !p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
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
                        <td colSpan={7} className="py-14 text-center">
                          <div className="flex flex-col items-center justify-center gap-2.5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                              <ClipboardList className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">No candidates found awaiting interview scoring.</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
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
                            onClick={() => setInspectApp(app)}
                            className="cursor-pointer hover:bg-emerald-50/70 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            {/* Candidate Info with Passport Thumbnail */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {app.passport_photo_url ? (
                                  <img
                                    src={app.passport_photo_url}
                                    alt={app.full_name}
                                    className="w-10 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 bg-slate-100 dark:bg-slate-800"
                                  />
                                ) : (
                                  <div className="w-10 h-11 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shrink-0 text-slate-400">
                                    <Users className="w-4 h-4" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                                    {app.full_name}
                                  </div>
                                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {app.application_number} • {app.phone}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                                    UNEB: {app.index_number || 'N/A'} ({app.gender})
                                  </div>
                                </div>
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
                            <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
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
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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
                            <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                placeholder="Panel remarks (e.g. Excellent bedside manner, verified UCE passes)"
                                value={currentNotes}
                                onChange={(e) => handleScoreInputChange(app.id, currentScore, e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                              />
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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

      {/* Schedule Interview Modal (Single & Batch) */}
      <NativeModal
        isOpen={scheduleCandidates.length > 0}
        onClose={() => setScheduleCandidates([])}
        title="Set Interview Day & Dispatch Official Invitations"
        subtitle={
          scheduleCandidates.length === 1
            ? `Schedule appointment & email official invitation to ${scheduleCandidates[0].full_name}`
            : `Set interview appointment & dispatch invitations to ${scheduleCandidates.length} approved candidate(s)`
        }
        icon={Calendar}
        size="md"
      >
        {scheduleCandidates.length > 0 && (
          <form onSubmit={handleConfirmSchedule} className="p-6 space-y-4 text-xs text-white">
            {/* Candidate Info Box */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-1.5">
              <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">
                {scheduleCandidates.length === 1 ? 'Candidate Being Invited' : `Candidates Being Invited (${scheduleCandidates.length})`}
              </span>
              {scheduleCandidates.length === 1 ? (
                <>
                  <span className="font-bold text-sm text-white block">
                    {scheduleCandidates[0].full_name} ({scheduleCandidates[0].application_number})
                  </span>
                  <span className="text-emerald-400 font-semibold block mt-0.5">
                    {scheduleCandidates[0].admitted_program || scheduleCandidates[0].programs[0]}
                  </span>
                </>
              ) : (
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {scheduleCandidates.map((c) => (
                    <div key={c.id} className="text-xs text-white flex items-center justify-between">
                      <span className="font-bold">{c.full_name}</span>
                      <span className="text-white/60 font-mono text-[10px]">{c.application_number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Notification Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-start gap-2.5">
              <Mail className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="font-bold text-white">Automated Candidate Notification</p>
                <p className="text-white/80 text-[11px] mt-0.5 leading-relaxed">
                  Upon confirmation, the system will immediately dispatch the official interview invitation email to{' '}
                  <span className="font-semibold text-emerald-300">
                    {scheduleCandidates.length === 1 ? (scheduleCandidates[0].email || 'the applicant') : `all ${scheduleCandidates.length} candidates`}
                  </span>{' '}
                  with their appointment date, reporting time, campus venue, and a link to download their official Interview Slip. Candidates will automatically appear under{' '}
                  <span className="font-semibold text-white">Interview Scheduled</span> and the{' '}
                  <span className="font-semibold text-white">Interview Results Desk</span>.
                </p>
              </div>
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
                onClick={() => setScheduleCandidates([])}
                className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold transition-all backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {actionLoading
                    ? 'Dispatching Invitations...'
                    : scheduleCandidates.length === 1
                    ? 'Schedule & Send Official Invitation'
                    : `Send Official Invitations (${scheduleCandidates.length})`}
                </span>
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

      {/* Candidate Full Official Dossier Document Modal */}
      <NativeModal
        isOpen={!!inspectApp}
        onClose={() => setInspectApp(null)}
        title={inspectApp ? `Official Application Dossier: ${inspectApp.application_number}` : 'Candidate Application File'}
        subtitle={inspectApp ? `${inspectApp.full_name} • ${inspectApp.programs.join(', ') || 'Nursing / Midwifery'}` : 'Official Academic and Personal Admissions File'}
        icon={ShieldCheck}
        size="2xl"
      >
        {inspectApp && (
          <div className="space-y-5 text-xs text-slate-800 dark:text-slate-100 pb-2">
            {/* OFFICIAL ADMISSION DOSSIER DOCUMENT CONTAINER */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              
              {/* TOP INSTITUTIONAL DOCUMENT HEADER */}
              <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 flex items-center justify-center">
                    <img
                      src="/images/rcsn/logo.png"
                      alt="RCSN Crest"
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight">
                      Rakai Community School of Nursing
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Office of the Academic Registrar • Official Admissions Dossier
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900 dark:text-emerald-400 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30">
                    {inspectApp.application_number}
                  </span>
                  <div className="shrink-0">{getStatusBadge(inspectApp.status)}</div>
                </div>
              </div>

              {/* CANDIDATE IDENTITY & COURSE APPLIED FOR */}
              <div className="p-5 sm:p-6 space-y-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex flex-col sm:flex-row items-start gap-5">
                  {/* Passport Photo Box (Official 3:4 Frame - Candidate Submission) */}
                  <div className="shrink-0">
                    <div className="w-24 h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                      {inspectApp.passport_photo_url ? (
                        <img
                          src={inspectApp.passport_photo_url}
                          alt={inspectApp.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 dark:text-slate-500">
                          <Users className="w-7 h-7 mb-1 text-slate-300 dark:text-slate-600" />
                          <span className="text-[10px] font-bold">No Photo</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Passport Photo
                      </span>
                    </div>
                  </div>

                  {/* Candidate Bio & Chosen Programs */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {inspectApp.full_name}
                      </h4>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Intake: {inspectApp.intake || '2026/2027 Academic Session'}</span>
                      </p>
                    </div>

                    {/* Program Applied For */}
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                        Course(s) Applied For:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {inspectApp.programs.map((p, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#00873E] dark:text-emerald-300 font-bold text-xs border border-emerald-500/30"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Demographic Key-Values Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 dark:text-slate-500 font-medium block text-[9px] uppercase">Gender</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{inspectApp.gender || 'Not Specified'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 dark:text-slate-500 font-medium block text-[9px] uppercase">Date of Birth</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{inspectApp.date_of_birth || 'N/A'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 dark:text-slate-500 font-medium block text-[9px] uppercase">Telephone</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{inspectApp.phone || 'N/A'}</span>
                      </div>
                      {inspectApp.email && (
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 col-span-2">
                          <span className="text-slate-400 dark:text-slate-500 font-medium block text-[9px] uppercase">Email Address</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[10px] break-all">{inspectApp.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: ACADEMIC RESULTS */}
              <div className="p-5 sm:p-6 space-y-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Academic Results</span>
                  </h5>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                    Index No: {inspectApp.index_number || 'N/A'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500 font-normal">Previous Institution / Secondary School: </span>
                    <span className="font-bold text-slate-900 dark:text-white">{inspectApp.previous_school || 'Not Specified'}</span>
                  </div>

                  {inspectApp.subject_grades && inspectApp.subject_grades.length > 0 ? (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                        Official Subject Passes:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {inspectApp.subject_grades.map((sg, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                          >
                            <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs">{sg.subject}</span>
                            <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-xs px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30">
                              {sg.grade}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      No breakdown of individual subject grades recorded. Please refer to attached result slip documents below.
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION: RESULT SLIPS & ATTACHED DOCUMENTS */}
              <div className="p-5 sm:p-6 space-y-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Result Slips & Attached Documents</span>
                  </h5>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Uploaded by Candidate
                  </span>
                </div>

                {(inspectApp.attached_documents && inspectApp.attached_documents.length > 0) ? (
                  <div className="space-y-2.5">
                    {inspectApp.attached_documents.map((doc, dIdx) => (
                      <div
                        key={dIdx}
                        className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-300 dark:border-emerald-700/80 flex items-center justify-center shrink-0 text-[#00873E] dark:text-emerald-400 font-bold">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-sm sm:max-w-md">
                              {doc.name || `Document #${dIdx + 1}`}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-600">
                                {doc.size || 'Attached File'}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Credential #{dIdx + 1}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenCandidateDocs(inspectApp, dIdx)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-95 text-white font-bold text-xs shadow-md transition-all"
                            title="View and preview this document immediately"
                          >
                            <Eye className="w-4 h-4 text-white" />
                            <span>View Document</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc.data || doc.url, doc.name)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white font-bold text-xs shadow-md border border-slate-800 dark:border-slate-600 transition-all"
                            title="Download document file"
                          >
                            <Download className="w-4 h-4 text-emerald-400" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (inspectApp.attached_document_name ||
                  inspectApp.attached_document_url ||
                  inspectApp.attached_document_data) ? (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-300 dark:border-emerald-700/80 flex items-center justify-center shrink-0 text-[#00873E] dark:text-emerald-400 font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-sm sm:max-w-md">
                          {inspectApp.attached_document_name || 'Academic Result Slip / Document'}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-600">
                            {inspectApp.attached_document_size || 'Attached File'}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">Candidate Attachment</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenCandidateDocs(inspectApp, 0)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-95 text-white font-bold text-xs shadow-md transition-all"
                        title="View and preview attached document immediately"
                      >
                        <Eye className="w-4 h-4 text-white" />
                        <span>View Document</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadDocument(
                            inspectApp.attached_document_data || inspectApp.attached_document_url,
                            inspectApp.attached_document_name ||
                              `${inspectApp.full_name.replace(/\s+/g, '_')}_Academic_Document`
                          )
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white font-bold text-xs shadow-md border border-slate-800 dark:border-slate-600 transition-all"
                        title="Download document file"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/40 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-2.5 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>No digital academic documents were attached by this applicant during submission.</span>
                  </div>
                )}
              </div>

              {/* SECTION: GUARDIAN & APPLICATION FEE */}
              <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-950/50">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                    Next of Kin / Guardian
                  </span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {inspectApp.guardian_name || 'Not Recorded'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {inspectApp.guardian_phone || 'No phone recorded'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                    Application Processing Fee (UGX 50,000)
                  </span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Payment Received</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Ref: {inspectApp.payment_reference || 'RCSN-MM-RECORDED'}
                  </div>
                </div>
              </div>

            </div>

            {/* ACTION TOOLBAR & VETTING CONTROLS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              {/* Document Download Quick Actions */}
              {/* Document Download Quick Actions & Close */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const mappedApp: AdmissionApplication = {
                      id: inspectApp.application_number || inspectApp.id,
                      fullName: inspectApp.full_name,
                      gender: inspectApp.gender as any,
                      dateOfBirth: inspectApp.date_of_birth,
                      phone: inspectApp.phone,
                      email: inspectApp.email || undefined,
                      programs: inspectApp.programs || [],
                      intake: inspectApp.intake || '2026/2027',
                      studyMode: 'Boarding',
                      previousSchool: inspectApp.previous_school || 'N/A',
                      indexNumber: inspectApp.index_number || 'N/A',
                      qualificationsSummary: inspectApp.qualifications_summary || '',
                      subjectGrades: inspectApp.subject_grades,
                      attachedDocumentName: inspectApp.attached_document_name || undefined,
                      attachedDocumentSize: inspectApp.attached_document_size || undefined,
                      attachedDocumentData: inspectApp.attached_document_data || undefined,
                      attachedDocuments: inspectApp.attached_documents as any,
                      passportPhotoUrl: inspectApp.passport_photo_url || undefined,
                      applicationFee: inspectApp.application_fee,
                      paymentMethod: 'Mobile Money',
                      paymentReference: inspectApp.payment_reference || undefined,
                      guardianName: inspectApp.guardian_name || 'N/A',
                      guardianPhone: inspectApp.guardian_phone || 'N/A',
                      submittedAt: inspectApp.created_at,
                      status: (inspectApp.status === 'admitted' ? 'Accepted' : inspectApp.status === 'under_review' ? 'Reviewed' : 'Pending Verification'),
                    };
                    void generateAdmissionApplicationPdf(mappedApp);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-md border border-slate-800 dark:border-slate-700 transition-all active:scale-95"
                  title="Download complete application dossier as signed PDF"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Application (PDF)</span>
                </button>

                {inspectApp.interview_date && (
                  <button
                    type="button"
                    onClick={() => generateInterviewSlipPdf(inspectApp)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    title="Download candidate official interview appointment slip"
                  >
                    <Calendar className="w-3.5 h-3.5 text-white" />
                    <span>Download Interview Slip</span>
                  </button>
                )}

                {['admitted', 'offer_accepted', 'enrolled'].includes(inspectApp.status) && (
                  <>
                    <button
                      type="button"
                      onClick={() => generateAdmissionLetterPdf(inspectApp)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                      title="Download official provisional admission offer letter"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Admission Offer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => generateAdmissionInvoicePdf(inspectApp)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                      title="Download banking tuition fee structure invoice"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Download Fee Invoice</span>
                    </button>
                  </>
                )}

              </div>

              {/* Vetting & Interview Decisions */}
              {['submitted', 'under_review'].includes(inspectApp.status) && (
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleVettingRejection(inspectApp)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl border-2 border-rose-400 dark:border-rose-500/40 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all"
                  >
                    Reject Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVettingApproval(inspectApp)}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#00873E] hover:bg-[#007033] shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve for Interview</span>
                  </button>
                </div>
              )}

              {inspectApp.status === 'shortlisted' && (
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const appToSched = inspectApp;
                      setInspectApp(null);
                      setSchedDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                      setSchedTime('09:00 AM');
                      setSchedVenue('RCSN Main Campus, Kalisizo / Rakai District');
                      setSchedPanel('Senior Nursing & Midwifery Faculty Panel');
                      setScheduleCandidates([appToSched]);
                    }}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Set Interview Day &amp; Invite</span>
                  </button>
                </div>
              )}

              {inspectApp.status === 'interview_scheduled' && (
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const appToSched = inspectApp;
                      setInspectApp(null);
                      setSchedDate(appToSched.interview_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                      setSchedTime(appToSched.interview_time || '09:00 AM');
                      setSchedVenue(appToSched.interview_venue || 'RCSN Main Campus, Kalisizo / Rakai District');
                      setSchedPanel(appToSched.interview_panel || 'Senior Nursing & Midwifery Faculty Panel');
                      setScheduleCandidates([appToSched]);
                    }}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Reschedule Interview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const appToScore = inspectApp;
                      setInspectApp(null);
                      setScoreApp(appToScore);
                      setInterviewScore(appToScore.interview_score ?? 75);
                      setInterviewNotes(appToScore.interview_notes ?? '');
                    }}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Record Interview Score</span>
                  </button>
                </div>
              )}

              {inspectApp.status === 'interview_passed' && (
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const appToAdmit = inspectApp;
                      setInspectApp(null);
                      setAdmitApp(appToAdmit);
                      setAdmittedProgramChoice(appToAdmit.admitted_program || appToAdmit.programs[0] || 'Certificate in Nursing');
                      setAdmitResidency((appToAdmit.residential_preference as any) || 'Resident');
                    }}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Issue Admission Offer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </NativeModal>

      {/* Two-Tier Candidate Documents & Verification Modal (List Mode & Active Preview Mode) */}
      <NativeModal
        isOpen={!!candidateDocsModal?.isOpen}
        onClose={() => setCandidateDocsModal(null)}
        title={
          candidateDocsModal?.selectedDocIndex !== null && candidateDocsModal?.selectedDocIndex !== undefined
            ? candidateDocsModal.docs[candidateDocsModal.selectedDocIndex]?.name || 'Document Preview'
            : `${candidateDocsModal?.app.full_name || 'Candidate'} — Uploaded Documents`
        }
        subtitle={
          candidateDocsModal?.selectedDocIndex !== null && candidateDocsModal?.selectedDocIndex !== undefined
            ? `Viewing file ${(candidateDocsModal.selectedDocIndex ?? 0) + 1} of ${candidateDocsModal.docs.length} • Click "Close Document" or "Back to Documents List" to choose another file`
            : `Application ID: ${candidateDocsModal?.app.application_number} • Total ${candidateDocsModal?.docs.length || 0} attached credential(s)`
        }
        icon={FileCheck}
        size={candidateDocsModal?.selectedDocIndex !== null ? '2xl' : 'lg'}
      >
        {candidateDocsModal && (
          <div>
            {/* TIER 1: DOCUMENTS LIST MODE (Displayed when no single document is actively open) */}
            {candidateDocsModal.selectedDocIndex === null ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-white">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>{candidateDocsModal.app.full_name}</span>
                  </h4>
                  <p className="text-xs text-white/70 mt-0.5">
                    Select any document below to inspect or download. You can close any open document and return here to choose another.
                  </p>
                </div>

                {/* List of uploaded documents */}
                <div className="space-y-2.5">
                  {candidateDocsModal.docs.length === 0 ? (
                    <div className="p-8 text-center text-white/60 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-sm font-semibold">No digital documents attached for this candidate.</p>
                    </div>
                  ) : (
                    candidateDocsModal.docs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm hover:border-emerald-500/50 transition-all text-slate-900 dark:text-white"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-300 dark:border-emerald-700 flex items-center justify-center shrink-0 font-bold text-[#00873E] dark:text-emerald-400">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-sm sm:max-w-md">
                              {doc.name || `Document #${idx + 1}`}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                                {doc.size || 'Attachment'}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Document #{idx + 1}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setCandidateDocsModal((prev) =>
                                prev ? { ...prev, selectedDocIndex: idx } : null
                              )
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00873E] hover:bg-[#007033] active:scale-95 text-white font-bold text-xs shadow-md transition-all"
                            title="Open and preview document"
                          >
                            <Eye className="w-4 h-4 text-white" />
                            <span>View Document</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc.url, doc.name)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-95 text-white font-bold text-xs shadow-md border border-slate-800 dark:border-slate-600 transition-all"
                            title="Download document file"
                          >
                            <Download className="w-4 h-4 text-emerald-400" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* TIER 2: ACTIVE DOCUMENT VIEWER MODE */
              (() => {
                const currentDoc =
                  candidateDocsModal.docs[candidateDocsModal.selectedDocIndex];
                if (!currentDoc) return null;

                return (
                  <div className="space-y-4 text-white">
                    {/* Top Control Bar with Back to List & Close Document */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-white/20 shadow-md">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCandidateDocsModal((prev) =>
                              prev ? { ...prev, selectedDocIndex: null } : null
                            )
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-white/20 shadow-sm transition-all"
                          title="Return to the list of all documents"
                        >
                          <ArrowLeft className="w-4 h-4 text-emerald-400" />
                          <span>Back to Documents List</span>
                        </button>

                        <span className="font-bold text-white text-xs truncate max-w-xs hidden sm:inline ml-1">
                          {currentDoc.name}
                        </span>
                        {currentDoc.size && (
                          <span className="text-white/60 font-mono text-[11px] hidden sm:inline">
                            ({currentDoc.size})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(currentDoc.url, currentDoc.name)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all active:scale-95"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenInNewTab(currentDoc.url, currentDoc.name)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs transition-all active:scale-95"
                          title="Open in new browser tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Tab</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setCandidateDocsModal((prev) =>
                              prev ? { ...prev, selectedDocIndex: null } : null
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md transition-all active:scale-95"
                          title="Close this document and return to documents list"
                        >
                          <X className="w-4 h-4" />
                          <span>Close Document</span>
                        </button>
                      </div>
                    </div>

                    {/* Document Preview Viewport */}
                    <div className="w-full min-h-[460px] max-h-[68vh] bg-slate-950/90 rounded-2xl border-2 border-white/15 overflow-auto flex items-center justify-center p-3 shadow-inner">
                      {currentDoc.isImage ? (
                        <img
                          src={currentDoc.url}
                          alt={currentDoc.name}
                          className="max-w-full max-h-[64vh] object-contain rounded-lg shadow-2xl"
                        />
                      ) : currentDoc.url.startsWith('data:application/pdf') || currentDoc.url.endsWith('.pdf') ? (
                        <iframe
                          src={currentDoc.url}
                          title={currentDoc.name}
                          className="w-full h-[64vh] rounded-lg border-0 bg-white"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-white/70 space-y-4">
                          <FileText className="w-16 h-16 text-emerald-400" />
                          <div>
                            <h5 className="font-bold text-base text-white">{currentDoc.name}</h5>
                            <p className="text-xs text-white/50 mt-1">Preview not directly embeddable. Click below to view or download.</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(currentDoc.url, currentDoc.name)}
                              className="px-4 py-2 rounded-xl bg-emerald-500 text-emerald-950 font-black text-xs hover:bg-emerald-400 transition-all shadow"
                            >
                              Download Document
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenInNewTab(currentDoc.url, currentDoc.name)}
                              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all"
                            >
                              Open in New Tab
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-white/20">
                      <div className="flex items-center gap-3 text-xs text-white/80">
                        <button
                          type="button"
                          onClick={() =>
                            setCandidateDocsModal((prev) =>
                              prev ? { ...prev, selectedDocIndex: null } : null
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all text-xs"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Back to Documents List</span>
                        </button>
                        <span>
                          Document {(candidateDocsModal.selectedDocIndex ?? 0) + 1} of {candidateDocsModal.docs.length}
                        </span>
                        {candidateDocsModal.docs.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={(candidateDocsModal.selectedDocIndex ?? 0) <= 0}
                              onClick={() => {
                                const prevIdx =
                                  (candidateDocsModal.selectedDocIndex ?? 0) - 1;
                                setCandidateDocsModal((prev) =>
                                  prev ? { ...prev, selectedDocIndex: prevIdx } : null
                                );
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold transition-all"
                            >
                              ← Prev
                            </button>
                            <button
                              type="button"
                              disabled={
                                (candidateDocsModal.selectedDocIndex ?? 0) >=
                                (candidateDocsModal.docs.length - 1)
                              }
                              onClick={() => {
                                const nextIdx =
                                  (candidateDocsModal.selectedDocIndex ?? 0) + 1;
                                setCandidateDocsModal((prev) =>
                                  prev ? { ...prev, selectedDocIndex: nextIdx } : null
                                );
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold transition-all"
                            >
                              Next →
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadDocument(currentDoc.url, currentDoc.name)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCandidateDocsModal((prev) =>
                              prev ? { ...prev, selectedDocIndex: null } : null
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow transition-all active:scale-95"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Close Document</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </NativeModal>
    </AdminPageWrapper>
  );
}
