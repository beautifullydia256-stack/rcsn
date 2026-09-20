import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import {
  Briefcase,
  MapPin,
  Users,
  Calendar,
  Plus,
  ExternalLink,
  Copy,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  Clock,
  Trash2,
  FileText,
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
}

export default function AdminJobsPage() {
  const navigate = useNavigate();
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
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [initialStatus, setInitialStatus] = useState('Open');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch school_id and jobs
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
          .select('job_id')
          .eq('school_id', schoolId),
      ]);

      if (jobsRes.error) throw jobsRes.error;

      // Count applications per job_id
      const appCounts: Record<string, number> = {};
      (appsRes.data || []).forEach((a) => {
        if (a.job_id) {
          appCounts[a.job_id] = (appCounts[a.job_id] || 0) + 1;
        }
      });

      return {
        schoolId,
        jobs: (jobsRes.data || []) as JobItem[],
        appCounts,
      };
    },
    enabled: !!user?.id,
  });

  const schoolId = data?.schoolId;
  const jobs = useMemo(() => data?.jobs ?? [], [data?.jobs]);
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
    const link = `${origin}/jobs/apply/${jobId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !schoolId) return;
    setSaving(true);
    setErr(null);

    const { error } = await supabase.from('jobs').insert({
      school_id: schoolId,
      title: title.trim(),
      location: location.trim(),
      description: description.trim(),
      posted_by: user?.email || 'admin',
      status: initialStatus,
    });

    setSaving(false);
    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg(`Vacancy "${title}" created successfully.`);
      setShowModal(false);
      setTitle('');
      setLocation('');
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
    if (!window.confirm(`Are you sure you want to delete "${jobTitle}"?`)) return;
    const { error } = await supabase.from('jobs').delete().eq('job_id', jobId);
    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg(`Vacancy removed.`);
      void queryClient.invalidateQueries({ queryKey: ['admin_jobs_data', user?.id] });
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <AdminPageWrapper
      title="Job Vacancies &amp; Postings"
      subtitle="Publish open positions, share applicant application links, and monitor recruitment intake."
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
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
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
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
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
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
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
              Across all vacancies
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'amber'),
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Locations / Branches
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.locationsCount}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Active campus sites
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
                      ? 'bg-teal-500/20 text-teal-300 font-semibold shadow-sm'
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
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:from-emerald-500 hover:to-teal-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Post Vacancy
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
              icon={<Briefcase className="w-8 h-8 text-teal-400" />}
              title="No Vacancies Found"
              description={
                searchQuery || statusFilter !== 'all'
                  ? 'No job openings match the selected filters.'
                  : 'Start recruiting by posting your first institutional vacancy.'
              }
              accentColor="mint"
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((j) => {
              const applicants = appCounts[j.job_id] || 0;
              const isCopied = copiedId === j.job_id;
              const isOpen = j.status?.toLowerCase() === 'open' || j.status?.toLowerCase() === 'active';

              return (
                <div
                  key={j.job_id}
                  className="flex flex-col justify-between rounded-2xl p-5 transition-all hover:scale-[1.01]"
                  style={{
                    backgroundColor: t.surface,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                            {j.title}
                          </h3>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                            {j.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-500" />
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
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          isOpen
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="Pending">Pending</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    {/* Description preview */}
                    <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-300">
                      {j.description || 'No detailed description provided.'}
                    </p>

                    {/* Meta Bar */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-teal-400" />
                        <strong className="text-slate-200">{applicants}</strong> Applicants
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {new Date(j.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(j.job_id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                      title="Copy Public Apply Link"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-teal-400" />
                          <span>Apply Link</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/admin/workforce/recruitment?job=${j.job_id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-500/30 bg-teal-500/15 px-2.5 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/25"
                      >
                        <span>Review</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteJob(j.job_id, j.title)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                    Post New Job Vacancy
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-300">Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Mathematics Tutor / Clinical Preceptor"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Campus / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Campus / Annex"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                      style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Status</label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                      style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                    >
                      <option value="Open">Open (Active)</option>
                      <option value="Pending">Draft / Pending</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Description &amp; Requirements</label>
                  <textarea
                    rows={4}
                    placeholder="Key responsibilities, qualifications, and deadlines…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    {saving ? 'Publishing…' : 'Publish Vacancy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
