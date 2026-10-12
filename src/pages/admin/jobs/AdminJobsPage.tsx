import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import NativeModal from '@/components/NativeModal';
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
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

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
  job_id: string;
  school_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  cv_url: string | null;
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
  const [updatingApplicantId, setUpdatingApplicantId] = useState<string | null>(null);

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

  // Current active job's applicants
  const activeApplicants = useMemo(() => {
    if (!activeReviewJob) return [];
    return applications.filter((a) => a.job_id === activeReviewJob.job_id);
  }, [applications, activeReviewJob]);

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
    const link = `${origin}/jobs/${jobId}/apply`;
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

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('job_id', jobId);

    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg(`Job status updated to ${newStatus}.`);
      void queryClient.invalidateQueries({ queryKey: ['admin_jobs_data', user?.id] });
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const deleteJob = async (jobId: string, jobTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${jobTitle}"? This will permanently remove the vacancy.`)) return;
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
    <AdminPageWrapper
      title="Job Vacancies &amp; Recruitment"
      subtitle="Publish openings, configure custom application channels, and review candidate dossiers."
    >
      <div className="w-full space-y-6">
        {/* Toast / Notifications */}
        {err && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{err}</span>
            </div>
            <button type="button" onClick={() => setErr(null)} className="text-red-400 hover:text-red-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 4-Card Summary Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div
            className="rounded-2xl p-4 transition-all"
            style={{
              background: cardGrad(t, 'emerald'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Active Vacancies
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.openJobs}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90 font-medium">
              Accepting applications
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all"
            style={{
              background: cardGrad(t, 'blue'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Total Postings
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.totalJobs}
            </p>
            <p className="mt-1 text-xs text-blue-400/90 font-medium">
              Recorded openings
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all"
            style={{
              background: cardGrad(t, 'purple'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Total Applicants
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.totalApplicants}
            </p>
            <p className="mt-1 text-xs text-purple-400/90 font-medium">
              Candidates applied
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all"
            style={{
              background: cardGrad(t, 'amber'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Campuses / Sites
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.locationsCount || 1}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Institutional locations
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
          }}
        >
          {/* Search Input */}
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by role title or location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 transition-colors"
              style={{
                backgroundColor: t.surfaceSubtle,
                borderColor: t.border,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Tabs */}
            <div
              className="inline-flex rounded-xl p-1"
              style={{ backgroundColor: t.surfaceSubtle }}
            >
              {(['all', 'Open', 'Pending', 'Closed'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                    statusFilter === tab
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Post Job Button */}
            <button
              type="button"
              onClick={() => {
                setLocation(DEFAULT_CAMPUS);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00873E] hover:bg-[#007033] px-4 py-2 text-xs font-bold text-white shadow-md transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Post New Vacancy</span>
            </button>
          </div>
        </div>

        {/* Jobs Grid / List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: t.surface,
              border: `1px solid ${t.border}`,
            }}
          >
            <PosEmptyState
              icon={<Briefcase className="w-8 h-8 text-emerald-400" />}
              title="No Vacancies Found"
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'No job openings match the selected filters.'
                  : 'Start recruiting by publishing your first institutional vacancy.'
              }
              accentColor="mint"
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((j) => {
              const applicantsCount = appCounts[j.job_id] || 0;
              const isCopied = copiedId === j.job_id;
              const isOpen = j.status?.toLowerCase() === 'open' || j.status?.toLowerCase() === 'active';

              return (
                <div
                  key={j.job_id}
                  className="flex flex-col justify-between rounded-2xl p-5 transition-all hover:border-emerald-500/30"
                  style={{
                    backgroundColor: t.surface,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100" style={{ fontFamily: SORA }}>
                            {j.title}
                          </h3>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                            {j.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-emerald-500" />
                                {j.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={j.status}
                        onChange={(e) => updateJobStatus(j.job_id, e.target.value)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          isOpen
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="Pending">Draft</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    {/* Deadline & Poster Pill */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {j.application_deadline ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                          <Clock className="h-3 w-3" />
                          <span>Deadline: {j.application_deadline}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                          <span>Open Intake</span>
                        </span>
                      )}

                      {j.poster_url && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30">
                          <ImageIcon className="h-3 w-3" />
                          <span>Poster Attached</span>
                        </span>
                      )}
                    </div>

                    {/* Description preview */}
                    <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-300">
                      {j.description || 'No detailed description provided.'}
                    </p>

                    {/* Configured Contact Info Preview */}
                    {(j.contact_email || j.contact_phone) && (
                      <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400 space-y-1">
                        {j.contact_email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate">{j.contact_email}</span>
                          </div>
                        )}
                        {j.contact_phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span>{j.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 gap-2">
                    {/* View Applicants Button (Opens Applicant Review Drawer) */}
                    <button
                      type="button"
                      onClick={() => setActiveReviewJob(j)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        applicantsCount > 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                      title="Review Applicants"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Applicants ({applicantsCount})</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Copy Public Link */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(j.job_id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                        title="Copy Public Application Link"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>

                      {/* Public Page View */}
                      <a
                        href={`/jobs/${j.job_id}/apply`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                        title="Open Public Application Page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      {/* Delete Vacancy */}
                      <button
                        type="button"
                        onClick={() => deleteJob(j.job_id, j.title)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Nurse Tutor (Midwifery)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Campus / Location
                </label>
                <input
                  type="text"
                  placeholder="Defaults to Main Campus"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Application Deadline (Closing Date)
                </label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Custom Contact Channels (Not rigid defaults) */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                Custom Application &amp; Inquiry Channels
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
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-emerald-400"
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
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-emerald-400"
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
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Flyer / Poster Picture Upload */}
            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Official Vacancy Poster / Flyer Image (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-slate-200 transition-colors">
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
                    <span>Flyer Attached</span>
                    <button
                      type="button"
                      onClick={() => setPosterUrl('')}
                      className="text-red-400 hover:text-red-300 text-[11px] underline ml-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">PNG or JPG up to 2MB</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Job Description &amp; Requirements *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Key clinical duties, teaching modules, required qualifications (e.g. UCE/UACE/UNMC credentials)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#00873E] hover:bg-[#007033] shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all disabled:opacity-50"
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
            {activeApplicants.length === 0 ? (
              <div className="p-8 text-center space-y-3 rounded-2xl bg-white/5 border border-white/10">
                <Users className="h-8 w-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-200">No Applications Received Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When candidates apply online or submit their credentials for this position, their dossiers will appear right here with one-click contact tools.
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
                      className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 transition-colors hover:border-emerald-500/30"
                    >
                      {/* Top Header of Candidate */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{app.full_name}</h4>
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

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                            <span>{app.email}</span>
                            {app.phone && <span>• {app.phone}</span>}
                            <span>• Applied {new Date(app.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Status Change Dropdown */}
                        <div className="flex items-center gap-2">
                          <select
                            value={app.status || 'new'}
                            disabled={updatingApplicantId === app.id}
                            onChange={(e) => updateApplicantStatus(app.id, e.target.value)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-black/40 border border-white/20 text-slate-200 focus:outline-none focus:border-emerald-400"
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
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Candidate Cover Letter / Qualifications */}
                      {app.cover_letter && (
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                          {app.cover_letter}
                        </div>
                      )}

                      {/* Attached CV Link & Direct One-Click Contact Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <div>
                          {app.cv_url ? (
                            <a
                              href={app.cv_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-semibold"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>View Attached CV / Dossier</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500">No external link attached</span>
                          )}
                        </div>

                        {/* One-Click Call, WhatsApp, Email Buttons */}
                        <div className="flex items-center gap-2">
                          {app.phone && (
                            <>
                              <a
                                href={`tel:${app.phone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-colors"
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-colors"
                            title="Send Email"
                          >
                            <Mail className="h-3 w-3" />
                            <span>Email</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </NativeModal>
      </div>
    </AdminPageWrapper>
  );
}
