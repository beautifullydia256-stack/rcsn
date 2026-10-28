import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import NativeModal from '@/components/NativeModal';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';
import {
  Briefcase,
  MapPin,
  Users,
  Calendar,
  Plus,
  Copy,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  Trash2,
  FileText,
  Phone,
  MessageSquare,
  Mail,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import { getTokens, SORA, INTER } from '@/styles/posThemeTokens';
import { parseJobDescription } from '@/lib/parseJobDescription';

interface JobItem {
  job_id: string;
  school_id: string;
  title: string;
  location: string;
  description: string;
  posted_by: string;
  status: string;
  created_at: string;
  application_deadline?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  submission_address?: string | null;
  poster_url?: string | null;
}

interface ApplicantItem {
  id: string;
  reference_no?: string | null;
  job_id: string;
  school_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  cv_url: string | null;
  cover_letter_doc_url?: string | null;
  certificates_doc_url?: string | null;
  documents?: Array<{
    label: string;
    name: string;
    path: string;
    size: number;
    type: string;
  }>;
  status: string;
  created_at: string;
}

const DEFAULT_CAMPUS = 'RCSN Main Campus, Rakai Town Council';

export default function AdminJobsPage() {
  const { user } = useAuthStore();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const paramJobId = searchParams.get('jobId');
  const paramOpenApp = searchParams.get('openApp');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Pending' | 'Closed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Job modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState(DEFAULT_CAMPUS);
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submissionAddress, setSubmissionAddress] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review Applicants Drawer / Modal state
  const [activeReviewJob, setActiveReviewJob] = useState<JobItem | null>(null);
  const [applicantFilterQuery, setApplicantFilterQuery] = useState('');
  const [updatingApplicantId, setUpdatingApplicantId] = useState<string | null>(null);
  const [openingDocKey, setOpeningDocKey] = useState<string | null>(null);

  // Fetch school_id, jobs and applications
  const { data, isLoading } = useQuery({
    queryKey: ['admin_jobs_data', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data: u, error: ue } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();
      if (ue || !u?.school_id) throw new Error('School profile not found');

      const schoolId = u.school_id;

      const [jobsRes, appsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false }),
        supabase
          .from('hr_job_applications')
          .select('*')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false }),
      ]);

      if (jobsRes.error) throw jobsRes.error;

      const applications = (appsRes.data || []) as ApplicantItem[];

      // Count applications per job_id
      const appCounts: Record<string, number> = {};
      applications.forEach((a) => {
        if (a.job_id) {
          appCounts[a.job_id] = (appCounts[a.job_id] || 0) + 1;
        }
      });

      return {
        schoolId,
        jobs: (jobsRes.data || []) as JobItem[],
        applications,
        appCounts,
      };
    },
    enabled: !!user?.id,
  });

  const schoolId = data?.schoolId;
  const jobs = useMemo(() => data?.jobs ?? [], [data?.jobs]);
  const applications = useMemo(() => data?.applications ?? [], [data?.applications]);
  const appCounts = useMemo(() => data?.appCounts ?? {}, [data?.appCounts]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch =
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.location && j.location.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus =
        statusFilter === 'all' ||
        j.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  // Current active job's applicants filtered by search
  const activeApplicants = useMemo(() => {
    if (!activeReviewJob) return [];
    return applications
      .filter((a) => a.job_id === activeReviewJob.job_id)
      .filter((a) => {
        if (!applicantFilterQuery.trim()) return true;
        const q = applicantFilterQuery.toLowerCase();
        return (
          a.id === applicantFilterQuery ||
          a.full_name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          (a.phone && a.phone.includes(q)) ||
          (a.reference_no && a.reference_no.toLowerCase().includes(q))
        );
      });
  }, [applications, activeReviewJob, applicantFilterQuery]);

  // Deep-linking: auto-open job or candidate dossier from notification click
  useEffect(() => {
    if (!jobs || jobs.length === 0) return;

    if (paramOpenApp && applications.length > 0) {
      const matchedApp = applications.find((a) => a.id === paramOpenApp);
      if (matchedApp) {
        const matchedJob = jobs.find((j) => j.job_id === matchedApp.job_id);
        if (matchedJob) {
          setActiveReviewJob(matchedJob);
          setApplicantFilterQuery(matchedApp.id);
          if (matchedApp.status === 'new') {
            void updateApplicantStatus(matchedApp.id, 'reviewed');
          }
          return;
        }
      }
    }

    if (paramJobId) {
      const matchedJob = jobs.find((j) => j.job_id === paramJobId);
      if (matchedJob) {
        setActiveReviewJob(matchedJob);
      }
    }
  }, [jobs, applications, paramJobId, paramOpenApp]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const openJobs = jobs.filter(
      (j) => j.status?.toLowerCase() === 'open' || j.status?.toLowerCase() === 'active'
    ).length;
    const totalApplicants = Object.values(appCounts).reduce((a, b) => a + b, 0);
    const locationsCount = new Set(jobs.map((j) => j.location).filter(Boolean)).size;

    return {
      totalJobs,
      openJobs,
      totalApplicants,
      locationsCount,
    };
  }, [jobs, appCounts]);

  const handleCopyLink = (jobId: string) => {
    const origin = window.location.origin;
    const link = `${origin}/careers/${jobId}/apply`;
    navigator.clipboard.writeText(link);
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErr('Flyer image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPosterUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !schoolId) return;
    setSaving(true);
    setErr(null);

    const { error } = await supabase.from('jobs').insert({
      school_id: schoolId,
      title: title.trim(),
      location: (location || DEFAULT_CAMPUS).trim(),
      description: description.trim(),
      posted_by: user?.email || 'admin',
      status: 'Open',
      application_deadline: applicationDeadline.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      submission_address: submissionAddress.trim() || null,
      poster_url: posterUrl.trim() || null,
    });

    setSaving(false);
    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg(`Vacancy "${title}" published successfully.`);
      setShowModal(false);
      setTitle('');
      setLocation(DEFAULT_CAMPUS);
      setApplicationDeadline('');
      setContactEmail('');
      setContactPhone('');
      setSubmissionAddress('');
      setPosterUrl('');
      setDescription('');
      void queryClient.invalidateQueries({ queryKey: ['admin_jobs_data', user?.id] });
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const cleanupJobStorageDocuments = async (jobId: string) => {
    try {
      const { data: files } = await supabase.storage.from('job-applications').list(jobId);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${jobId}/${f.name}`);
        await supabase.storage.from('job-applications').remove(paths);
      }
    } catch (cleanErr) {
      console.error('Error cleaning up job documents from storage:', cleanErr);
    }
  };

  const openDocument = async (pathOrUrl: string, key?: string) => {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      window.open(pathOrUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (key) setOpeningDocKey(key);
    try {
      const { data: signData, error: signErr } = await supabase.storage
        .from('job-applications')
        .createSignedUrl(pathOrUrl, 3600);
      if (!signErr && signData?.signedUrl) {
        window.open(signData.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('Unable to generate secure download link for this document.');
      }
    } catch (e: any) {
      alert(e.message || 'Error opening document');
    } finally {
      if (key) setOpeningDocKey(null);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('job_id', jobId);

    if (error) {
      setErr(error.message);
    } else {
      if (['expired', 'closed'].includes(newStatus.toLowerCase())) {
        void cleanupJobStorageDocuments(jobId);
      }
      setSuccessMsg(`Job status updated to ${newStatus}.`);
      void queryClient.invalidateQueries({ queryKey: ['admin_jobs_data', user?.id] });
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const deleteJob = async (jobId: string, jobTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${jobTitle}"? This will permanently remove the vacancy.`)) return;
    void cleanupJobStorageDocuments(jobId);
    const { error } = await supabase.from('jobs').delete().eq('job_id', jobId);
    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg(`Vacancy removed.`);
      if (activeReviewJob?.job_id === jobId) {
        setActiveReviewJob(null);
      }
      void queryClient.invalidateQueries({ queryKey: ['admin_jobs_data', user?.id] });
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const updateApplicantStatus = async (applicantId: string, newStatus: string) => {
    setUpdatingApplicantId(applicantId);
    const { error } = await supabase
      .from('hr_job_applications')
      .update({ status: newStatus })
      .eq('id', applicantId);

    setUpdatingApplicantId(null);
    if (error) {
      setErr(error.message);
    } else {
      void queryClient.invalidateQueries({ queryKey: ['admin_jobs_data', user?.id] });
    }
  };

  const deleteApplicant = async (applicantId: string, candidateName: string) => {
    if (!window.confirm(`Delete submission record for "${candidateName}"?`)) return;
    const { error } = await supabase
      .from('hr_job_applications')
      .delete()
      .eq('id', applicantId);

    if (error) {
      setErr(error.message);
    } else {
      void queryClient.invalidateQueries({ queryKey: ['admin_jobs_data', user?.id] });
    }
  };

  return (
    <div className="admin-terminal-page space-y-4 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            INSTITUTIONAL VACANCIES &amp; CAREERS DESK
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            OFFICIAL CLINICAL &amp; ACADEMIC APPOINTMENT POSTINGS • REPUBLIC OF UGANDA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLocation(DEFAULT_CAMPUS);
              setShowModal(true);
            }}
            className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5 font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>POST NEW VACANCY</span>
          </button>
        </div>
      </div>

      <div className="w-full space-y-4">
        {/* Toast / Notifications */}
        {err && (
          <div className="gov-card p-3 border-l-4 border-l-rose-600 bg-rose-50 flex items-center justify-between text-xs font-mono text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
              <span>{err}</span>
            </div>
            <button type="button" onClick={() => setErr(null)} className="text-rose-700 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="gov-card p-3 border-l-4 border-l-emerald-600 bg-emerald-50 flex items-center justify-between text-xs font-mono text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── 2. MONOCHROME KPI SUMMARY STRIP ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="gov-card p-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
              ACTIVE VACANCIES
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {stats.openJobs}
            </div>
            <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
              ACCEPTING APPLICATIONS
            </div>
          </div>

          <div className="gov-card p-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
              RECORDED POSTINGS
            </div>
            <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
              {stats.totalJobs}
            </div>
            <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
              TOTAL RECORDED OPENINGS
            </div>
          </div>

          <div className="gov-card p-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
              CANDIDATE DOSSIERS
            </div>
            <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
              {stats.totalApplicants}
            </div>
            <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
              RECEIVED APPLICATIONS
            </div>
          </div>

          <div className="gov-card p-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
              CAMPUS SITES
            </div>
            <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
              {stats.locationsCount || 1}
            </div>
            <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
              INSTITUTIONAL LOCATIONS
            </div>
          </div>
        </div>

        {/* ── 3. HIGH-DENSITY CONTROL BAR ── */}
        <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[#777777]" />
            <input
              type="text"
              placeholder="Search by role title or location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="gov-input text-xs font-mono w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-[#F3F4F6] text-[#555555]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-[#CCCCCC]">
              {(['all', 'Open', 'Pending', 'Closed'] as const).map((tab) => {
                const isActive = statusFilter === tab;
                const label = tab === 'all' ? 'ALL ROLES' : tab.toUpperCase();
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1 text-xs font-mono font-bold transition-colors ${
                      isActive
                        ? 'bg-[#111111] text-white'
                        : 'bg-white text-[#555555] hover:bg-[#F9F9FB]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-mono text-[#555555] shrink-0">
              SHOWING {filteredJobs.length} {filteredJobs.length === 1 ? 'OPENING' : 'OPENINGS'}
            </span>
          </div>
        </div>

        {/* Jobs Grid / List (High contrast & clean mobile cards) */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div
            className="rounded-2xl p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <PosEmptyState
              icon={<Briefcase className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />}
              title="No Vacancies Found"
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'No job openings match the selected search or filter.'
                  : 'Start recruiting by publishing your first institutional vacancy.'
              }
              accentColor="mint"
            />
          </div>
        ) : (
          <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((j) => {
              const applicantsCount = appCounts[j.job_id] || 0;
              const isCopied = copiedId === j.job_id;
              const isOpen = j.status?.toLowerCase() === 'open' || j.status?.toLowerCase() === 'active';
              const isClosed = j.status?.toLowerCase() === 'closed';

              return (
                <div
                  key={j.job_id}
                  className="flex flex-col justify-between rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all shadow-xs hover:shadow-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <div className="space-y-3">
                    {/* Card Top: Title, Location & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-[#007033] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0 mt-0.5">
                          <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight break-words"
                            style={{ fontFamily: SORA }}
                          >
                            {j.title}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            {j.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="truncate">{j.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={j.status}
                        onChange={(e) => updateJobStatus(j.job_id, e.target.value)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer shrink-0 focus:outline-none ${
                          isOpen
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                            : isClosed
                            ? 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                            : 'bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="Pending">Draft</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    {/* Deadline Pill */}
                    <div className="flex flex-wrap items-center gap-2">
                      {j.application_deadline ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 dark:text-amber-300 dark:bg-amber-500/15 dark:border-amber-500/30">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>Deadline: {j.application_deadline}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 dark:text-slate-400 dark:bg-white/5 dark:border-white/10">
                          <span>Open Intake</span>
                        </span>
                      )}

                      {j.poster_url && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 dark:text-sky-300 dark:bg-sky-500/15 dark:border-sky-500/30">
                          <ImageIcon className="h-3 w-3 shrink-0" />
                          <span>Poster Attached</span>
                        </span>
                      )}
                    </div>

                    {/* Description preview */}
                    {(() => {
                      const parsed = parseJobDescription(j.description);
                      if (parsed.isStructured) {
                        return (
                          <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                            {parsed.reportsTo && (
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white">Reports To:</span>
                                <span>{parsed.reportsTo}</span>
                              </div>
                            )}
                            {parsed.jobPurpose && (
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-white block">Job Purpose:</span>
                                <p className="line-clamp-2 leading-relaxed text-slate-600 dark:text-slate-300">{parsed.jobPurpose}</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <p className="line-clamp-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                          {j.description || 'No detailed job description provided.'}
                        </p>
                      );
                    })()}

                    {/* Contact Channels Preview */}
                    {(j.contact_email || j.contact_phone) && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        {j.contact_email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">{j.contact_email}</span>
                          </div>
                        )}
                        {j.contact_phone && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{j.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-2">
                    {/* View Applicants Button (Opens Applicant Review Drawer) */}
                    <button
                      type="button"
                      onClick={() => {
                        setApplicantFilterQuery('');
                        setActiveReviewJob(j);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        applicantsCount > 0
                          ? 'bg-[#00873E] text-white hover:bg-[#007033] shadow-xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/40'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                      title="Review Applicants"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Applicants ({applicantsCount})</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Copy Public Apply Link */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(j.job_id)}
                        className="rounded-lg p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Copy Public Application Link"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>

                      {/* Public Page View */}
                      <a
                        href={`/careers/${j.job_id}/apply`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Open Public Application Page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      {/* Delete Vacancy */}
                      <button
                        type="button"
                        onClick={() => deleteJob(j.job_id, j.title)}
                        className="rounded-lg p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-900/30 transition-colors"
                        title="Delete vacancy"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Post Vacancy */}
        <NativeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Post New Job Vacancy"
          subtitle="Publish a role with custom submission channels and application deadline."
          icon={Briefcase}
          size="lg"
        >
          <form onSubmit={handleCreateJob} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Nurse Tutor (Midwifery)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 transition-all shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                  Campus / Location
                </label>
                <input
                  type="text"
                  placeholder="Defaults to Main Campus"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                  Application Deadline (Closing Date)
                </label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Custom Contact Channels */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                Custom Application Channels
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Application Receiving Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. recruitment@rcsn.ac.ug"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    WhatsApp / Inquiries Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +256 783 399 322"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Physical Submission Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Academic Registrar's Office, Main Campus, Rakai Town"
                  value={submissionAddress}
                  onChange={(e) => setSubmissionAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Flyer / Poster Picture Upload */}
            <div>
              <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                Official Vacancy Poster Image (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors">
                  <Upload className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {posterUrl ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Poster Attached</span>
                    <button
                      type="button"
                      onClick={() => setPosterUrl('')}
                      className="text-red-400 hover:text-red-300 text-[11px] underline ml-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-300">PNG or JPG up to 2MB</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/90 uppercase tracking-wider mb-1.5">
                Job Description &amp; Requirements *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Key clinical duties, teaching modules, required qualifications..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 transition-all shadow-inner resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00873E] hover:bg-[#007033] shadow-lg border border-emerald-400/30 transition-all disabled:opacity-50"
              >
                {saving ? 'Publishing...' : 'Publish Vacancy'}
              </button>
            </div>
          </form>
        </NativeModal>

        {/* Modal: Applicant Review Desk for Selected Job */}
        <NativeModal
          isOpen={activeReviewJob !== null}
          onClose={() => setActiveReviewJob(null)}
          title={activeReviewJob ? `Applicants for: ${activeReviewJob.title}` : 'Candidate Submissions'}
          subtitle={
            activeReviewJob
              ? `${activeApplicants.length} applicant(s) registered for this vacancy.`
              : 'Review submitted candidate dossiers.'
          }
          icon={Users}
          size="xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Search within applicants */}
            {applications.filter((a) => a.job_id === activeReviewJob?.job_id).length > 0 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter candidate dossiers by name, email, phone, or reference number..."
                  value={applicantFilterQuery}
                  onChange={(e) => setApplicantFilterQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-slate-950/70 pl-8 pr-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400"
                />
              </div>
            )}

            {activeApplicants.length === 0 ? (
              <div className="p-8 text-center space-y-3 rounded-2xl bg-white/5 border border-white/10">
                <Users className="h-8 w-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Applications Found</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  {applicantFilterQuery
                    ? 'No candidates match your search filter.'
                    : 'When candidates submit applications online, their full dossiers and uploaded documents will appear here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeApplicants.map((app) => {
                  const cleanPhone = (app.phone || '').replace(/[^0-9]/g, '');
                  const emailSubject = `RCSN Job Application: ${activeReviewJob?.title || 'Vacancy'}`;

                  return (
                    <div
                      key={app.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border border-white/15 space-y-3 transition-colors hover:border-emerald-500/40"
                    >
                      {/* Top Header of Candidate */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm sm:text-base font-bold text-white">{app.full_name}</h4>
                            {app.reference_no && (
                              <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                REF: {app.reference_no}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                app.status === 'shortlisted'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : app.status === 'interview_scheduled'
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  : app.status === 'rejected'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                              }`}
                            >
                              {app.status || 'New'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 mt-1">
                            <span>{app.email}</span>
                            {app.phone && <span>• {app.phone}</span>}
                            <span>• Applied {new Date(app.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Status Change Dropdown & Delete */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <select
                            value={app.status || 'new'}
                            disabled={updatingApplicantId === app.id}
                            onChange={(e) => updateApplicantStatus(app.id, e.target.value)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                          >
                            <option value="new">New</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="interview_scheduled">Interview Scheduled</option>
                            <option value="rejected">Rejected</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => deleteApplicant(app.id, app.full_name)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete applicant record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Candidate Cover Letter / Qualifications */}
                      {app.cover_letter && (
                        <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                          {app.cover_letter}
                        </div>
                      )}

                      {/* Attached Candidate Documents (Secure Signed URLs) */}
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                          Submitted Documents:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {Array.isArray(app.documents) && app.documents.length > 0 ? (
                            app.documents.map((doc, idx) => (
                              <button
                                key={idx}
                                type="button"
                                disabled={openingDocKey === `${app.id}_doc_${idx}`}
                                onClick={() => openDocument(doc.path, `${app.id}_doc_${idx}`)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-semibold text-sky-200 transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span>{doc.label || doc.name || `Document ${idx + 1}`}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </button>
                            ))
                          ) : (
                            <>
                              {app.cv_url && (
                                <button
                                  type="button"
                                  disabled={openingDocKey === `${app.id}_cv`}
                                  onClick={() => openDocument(app.cv_url!, `${app.id}_cv`)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-semibold text-sky-200 transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span>Curriculum Vitae (CV)</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </button>
                              )}
                              {app.cover_letter_doc_url && (
                                <button
                                  type="button"
                                  disabled={openingDocKey === `${app.id}_cl`}
                                  onClick={() => openDocument(app.cover_letter_doc_url!, `${app.id}_cl`)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold text-emerald-200 transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span>Application Letter</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </button>
                              )}
                              {app.certificates_doc_url && (
                                <button
                                  type="button"
                                  disabled={openingDocKey === `${app.id}_cert`}
                                  onClick={() => openDocument(app.certificates_doc_url!, `${app.id}_cert`)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-xs font-semibold text-purple-200 transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span>Academic Certificates</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </button>
                              )}
                              {!app.cv_url && !app.cover_letter_doc_url && !app.certificates_doc_url && (
                                <span className="text-[11px] text-slate-400">No documents attached</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* One-Click Call, WhatsApp, Email Buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-white/5">
                        {app.phone && (
                          <>
                            <a
                              href={`tel:${app.phone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition-colors"
                              title="Call Applicant"
                            >
                              <Phone className="h-3 w-3 text-emerald-400" />
                              <span>Call</span>
                            </a>

                            <a
                              href={`https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(
                                app.full_name
                              )},%20we%20received%20your%20application%20for%20the%20${encodeURIComponent(
                                activeReviewJob?.title || 'vacancy'
                              )}%20position%20at%20Rakai%20Community%20School%20of%20Nursing.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] text-xs font-semibold border border-[#25D366]/30 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>WhatsApp</span>
                            </a>
                          </>
                        )}

                        <a
                          href={`mailto:${app.email}?subject=${encodeURIComponent(
                            emailSubject
                          )}&body=Dear%20${encodeURIComponent(
                            app.full_name
                          )},%0A%0AThank%20you%20for%20applying%20for%20the%20${encodeURIComponent(
                            activeReviewJob?.title || 'position'
                          )}%20at%20Rakai%20Community%20School%20of%20Nursing.%0A%0A`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-xs font-semibold border border-sky-500/30 transition-colors"
                          title="Send Email"
                        >
                          <Mail className="h-3 w-3" />
                          <span>Email</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </NativeModal>
      </div>
    </div>
  );
}
