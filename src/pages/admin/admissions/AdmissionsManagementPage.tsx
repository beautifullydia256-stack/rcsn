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
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  fetchApplications,
  updateApplication,
  scheduleInterview,
  recordInterviewResults,
  issueAdmissionOffer,
  type AdmissionApplicationRecord,
  type ApplicationStatus,
} from '@/services/admissionsService';
import MatriculateStudentModal from './MatriculateStudentModal';
import { generateInterviewSlipPdf } from '@/lib/generateInterviewSlipPdf';
import { generateAdmissionLetterPdf } from '@/lib/generateAdmissionLetterPdf';
import { AVAILABLE_PROGRAMS } from '@/components/website/AdmissionsModal';

export default function AdmissionsManagementPage() {
  const [applications, setApplications] = useState<AdmissionApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'interview_scheduled' | 'admitted' | 'enrolled'>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

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
      await updateApplication(app.id, { status: 'rejected', rejection_reason: reason });
      showNotification(`Application ${app.application_number} rejected.`, 'error');
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
      showNotification(`Interview scheduled for ${scheduleApp.full_name} on ${schedDate}.`);
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
        showNotification(`Interview score saved. Candidate marked as Passed (Recommended).`);
      } else {
        showNotification(`Interview score saved. Candidate marked as ${interviewDecision}.`, 'error');
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
      showNotification(`Provisional admission offer issued for ${admitApp.full_name}.`);
      setAdmitApp(null);
      await loadData();
    } catch {
      showNotification('Failed to issue admission offer.', 'error');
    } finally {
      setActionLoading(false);
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
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                title="Refresh application records"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
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
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                        <span>Loading applications pipeline...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
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
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
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
      </div>

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
      {scheduleApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Schedule Oral Interview
                </h3>
              </div>
              <button type="button" onClick={() => setScheduleApp(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Candidate</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {scheduleApp.full_name} ({scheduleApp.application_number})
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5">
                  {scheduleApp.admitted_program || scheduleApp.programs[0]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Interview Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Reporting Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Campus Venue *
                </label>
                <input
                  type="text"
                  required
                  value={schedVenue}
                  onChange={(e) => setSchedVenue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Interview Panel / Notes
                </label>
                <input
                  type="text"
                  value={schedPanel}
                  onChange={(e) => setSchedPanel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow"
                >
                  {actionLoading ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Interview Score Modal */}
      {scoreApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Record Interview Results
                </h3>
              </div>
              <button type="button" onClick={() => setScoreApp(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmScore} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Candidate</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {scoreApp.full_name} ({scoreApp.application_number})
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5">
                  Interview Date: {scoreApp.interview_date}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Interview Score (0 - 100) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={interviewScore}
                    onChange={(e) => setInterviewScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Panel Recommendation *
                  </label>
                  <select
                    value={interviewDecision}
                    onChange={(e) => setInterviewDecision(e.target.value as typeof interviewDecision)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    <option value="passed">Passed (Recommended for Admission)</option>
                    <option value="waitlisted">Waitlisted</option>
                    <option value="failed">Unsuccessful / Failed</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Panel Assessment Notes & Remarks
                </label>
                <textarea
                  rows={3}
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  placeholder="e.g. Fluent oral communication, clear passion for clinical nursing, verified original UCE passes."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScoreApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow"
                >
                  {actionLoading ? 'Saving...' : 'Record Results'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Admission Offer Modal */}
      {admitApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Issue Provisional Admission Offer
                </h3>
              </div>
              <button type="button" onClick={() => setAdmitApp(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdmit} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 block">Candidate</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white block">
                  {admitApp.full_name} ({admitApp.application_number})
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold block mt-0.5">
                  Interview Score: {admitApp.interview_score ?? 80}/100 (Passed)
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Admitted Program *
                </label>
                <select
                  value={admittedProgramChoice}
                  onChange={(e) => setAdmittedProgramChoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  {AVAILABLE_PROGRAMS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Approved Residential Status *
                </label>
                <select
                  value={admitResidency}
                  onChange={(e) => setAdmitResidency(e.target.value as typeof admitResidency)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  <option value="Resident">Resident (Full Boarder on Campus)</option>
                  <option value="Non-Resident">Non-Resident (Day Scholar)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdmitApp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold transition-all shadow"
                >
                  {actionLoading ? 'Issuing...' : 'Issue Official Admission Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Full Inspector Drawer / Modal */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Candidate Dossier: {inspectApp.application_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectApp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Header Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    {inspectApp.full_name}
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {inspectApp.gender} • DOB: {inspectApp.date_of_birth} • Tel: {inspectApp.phone}
                  </p>
                </div>
                <div>{getStatusBadge(inspectApp.status)}</div>
              </div>

              {/* Programs Applied */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider block">
                  Chosen Academic Programs
                </span>
                <div className="flex flex-wrap gap-2">
                  {inspectApp.programs.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/20"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Academic Background & UNEB Subject Passes */}
              <div className="space-y-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider block">
                  UNEB Science Grades & Academic Background
                </span>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Previous School: {inspectApp.previous_school || 'N/A'}
                    </span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                      Index: {inspectApp.index_number || 'N/A'}
                    </span>
                  </div>
                  {inspectApp.subject_grades && inspectApp.subject_grades.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      {inspectApp.subject_grades.map((sg, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono font-bold"
                        >
                          {sg.subject}: <span className="text-emerald-600">{sg.grade}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Next of Kin & Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                    Next of Kin / Guardian
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {inspectApp.guardian_name || 'N/A'}
                  </div>
                  <div className="text-slate-500">{inspectApp.guardian_phone || 'No phone'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                    Application Fee (UGX 50,000)
                  </span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Paid & Verified</span>
                  </div>
                  <div className="text-slate-500 font-mono text-[10px]">
                    Ref: {inspectApp.payment_reference || 'RCSN-MOMO-TXN'}
                  </div>
                </div>
              </div>

              {/* Attached UNEB Slips */}
              {inspectApp.attached_document_name && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {inspectApp.attached_document_name}
                    </span>
                    <span className="text-[10px] text-slate-400">({inspectApp.attached_document_size || 'Attached'})</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">Document Uploaded</span>
                </div>
              )}

              {/* Vetting Decisions */}
              {['submitted', 'under_review'].includes(inspectApp.status) && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleVettingRejection(inspectApp)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40 font-bold"
                  >
                    Reject Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVettingApproval(inspectApp)}
                    disabled={actionLoading}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow"
                  >
                    Approve for Interview
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
}
