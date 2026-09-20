import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { Link } from 'react-router-dom';
import { fetchRecruitmentPageData, type RecruitmentPageData } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';
import {
  Kanban,
  Search,
  ExternalLink,
  Briefcase,
  User,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Save,
  AlertCircle,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

type Application = RecruitmentPageData['rows'][number];

const STAGES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const;
type StageType = (typeof STAGES)[number];

const STAGE_CONFIG: Record<StageType, { label: string; color: string; bg: string }> = {
  new: { label: 'New Applicant', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  screening: { label: 'Screening', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  interview: { label: 'Interview Scheduled', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  offer: { label: 'Offer Extended', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  hired: { label: 'Hired', color: '#10d9a8', bg: 'rgba(16, 217, 168, 0.2)' },
  rejected: { label: 'Archived / Rejected', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
};

export default function RecruitmentPage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: workforceQueryKeys.recruitment(user?.id ?? ''),
    queryFn: () => fetchRecruitmentPageData(user!.id),
    enabled: !!user?.id,
  });

  const rows = q.data?.rows ?? [];
  const jobTitle = q.data?.jobTitle ?? {};
  const loading = q.isPending;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<StageType | 'all'>('all');
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const update = async (id: string, status: StageType, notes: string) => {
    setErr(null);
    setSavingId(id);
    const { error } = await supabase
      .from('hr_job_applications')
      .update({ status, stage_notes: notes || null })
      .eq('id', id);
    setSavingId(null);
    if (error) {
      setErr(error.message);
      return;
    }
    if (user?.id) void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.recruitment(user.id) });
  };

  const updateStatus = (id: string, status: StageType, row: Application) => {
    void update(id, status, row.stage_notes || '');
  };

  // Distinct job list
  const uniqueJobs = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      map.set(r.job_id, jobTitle[r.job_id] || 'Active Vacancy');
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [rows, jobTitle]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedStage !== 'all' && r.status !== selectedStage) return false;
      if (selectedJob !== 'all' && r.job_id !== selectedJob) return false;
      if (searchQuery.trim()) {
        const ql = searchQuery.toLowerCase();
        const matchesName = r.full_name?.toLowerCase().includes(ql);
        const matchesEmail = r.email?.toLowerCase().includes(ql);
        const matchesJob = (jobTitle[r.job_id] || '').toLowerCase().includes(ql);
        if (!matchesName && !matchesEmail && !matchesJob) return false;
      }
      return true;
    });
  }, [rows, selectedStage, selectedJob, searchQuery, jobTitle]);

  if (q.isError) {
    return (
      <AdminPageWrapper eyebrow="Workforce & HR" title="Recruitment & ATS" subtitle="Candidate pipeline">
        <div className="rounded-[20px] p-4 text-sm" style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, color: '#fca5a5' }} role="alert">
          {q.error instanceof Error ? q.error.message : 'Failed to load recruitment data'}
        </div>
      </AdminPageWrapper>
    );
  }

  if (loading) {
    return (
      <AdminPageWrapper eyebrow="Workforce & HR" title="Recruitment & ATS" subtitle="Loading pipeline…">
        <div className="text-sm py-12 text-center" style={{ color: t.textLow }}>Loading applicant pipeline…</div>
      </AdminPageWrapper>
    );
  }

  if (!canHr) {
    return (
      <AdminPageWrapper eyebrow="Workforce & HR" title="Recruitment & ATS" subtitle="Candidate pipeline">
        <div className="rounded-[20px] p-5 text-sm" style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, color: t.gold }}>
          Workforce &amp; HR permission required to access the recruitment ATS.
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      eyebrow="Workforce & HR"
      title="Recruitment & Applicant Pipeline (ATS)"
      subtitle="Track candidate submissions received via public job vacancy links. Review qualifications, update stages, and record evaluation notes."
    >
      <div className="w-full space-y-6">
        {err && (
          <div
            className="flex items-center gap-2 rounded-xl p-3 text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        {/* Stage Filter Strip */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {STAGES.map((s) => {
            const conf = STAGE_CONFIG[s];
            const count = rows.filter((r) => r.status === s).length;
            const isSelected = selectedStage === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStage(isSelected ? 'all' : s)}
                className="flex flex-col rounded-[16px] p-3 text-left transition-all duration-150"
                style={{
                  background: isSelected ? conf.bg : cardGrad(t),
                  border: `1px solid ${isSelected ? conf.color : t.stroke}`,
                  boxShadow: isSelected ? `0 0 16px ${conf.color}20` : 'none',
                }}
              >
                <span className="text-[11px] font-semibold" style={{ color: isSelected ? conf.color : t.textLow }}>
                  {conf.label}
                </span>
                <span className="mt-1 text-xl font-bold" style={{ color: isSelected ? conf.color : t.textHi, fontFamily: SORA }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Bar & Quick Actions */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] p-4"
          style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: t.textLow }} />
              <input
                type="text"
                placeholder="Search applicant name, email, or job title…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl pl-9 pr-3 py-2 text-xs"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                }}
              />
            </div>

            {/* Vacancy Filter */}
            {uniqueJobs.length > 0 && (
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="rounded-xl px-3 py-2 text-xs font-medium"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                  border: `1px solid ${t.stroke}`,
                  color: t.textHi,
                }}
              >
                <option value="all">All Vacancies ({rows.length})</option>
                {uniqueJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Link
            to="/dashboard/admin/jobs"
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all"
            style={{
              background: `${t.brand}15`,
              border: `1px solid ${t.brand}35`,
              color: t.brand,
            }}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Manage Job Postings</span>
          </Link>
        </div>

        {/* Applicant Pipeline Table */}
        <div
          className="rounded-[20px] p-5"
          style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: t.stroke }}>
            <h3 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              Candidate Applications ({filteredRows.length})
            </h3>
            {selectedStage !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedStage('all')}
                className="text-xs font-medium hover:underline"
                style={{ color: t.mint }}
              >
                Clear Stage Filter (Show All)
              </button>
            )}
          </div>

          {filteredRows.length === 0 ? (
            <PosEmptyState
              icon={<Kanban className="h-8 w-8 text-sky-400" />}
              title="No Applicants Found"
              description="No candidate applications match your current search or stage filter."
              accentColor="blue"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: t.stroke, color: t.textLow }}>
                    <th className="py-2.5 pr-3 font-semibold">Applicant Profile</th>
                    <th className="py-2.5 pr-3 font-semibold">Job Vacancy</th>
                    <th className="py-2.5 pr-3 font-semibold">Contact Info</th>
                    <th className="py-2.5 pr-3 font-semibold">Hiring Stage</th>
                    <th className="py-2.5 pr-3 font-semibold">Recruiter Evaluation Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((app) => {
                    const stageConf = STAGE_CONFIG[app.status as StageType] || STAGE_CONFIG.new;
                    return (
                      <tr
                        key={app.id}
                        className="border-b align-top transition-colors"
                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-bold text-sm" style={{ color: t.textHi, fontFamily: SORA }}>
                            {app.full_name}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px]" style={{ color: t.textLow }}>
                            <span>{new Date(app.created_at).toLocaleDateString()}</span>
                            <span>·</span>
                            <a
                              href={`/jobs/${app.job_id}/apply`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 hover:underline"
                              style={{ color: t.mint }}
                            >
                              <span>Public Post</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          </div>
                        </td>

                        <td className="py-3 pr-3">
                          <span
                            className="inline-block rounded-lg px-2 py-1 text-xs font-semibold"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
                              color: t.textHi,
                              border: `1px solid ${t.stroke}`,
                            }}
                          >
                            {jobTitle[app.job_id] || 'Institution Vacancy'}
                          </span>
                        </td>

                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-1.5" style={{ color: t.textHi }}>
                            <Mail className="h-3 w-3" style={{ color: t.textLow }} />
                            <span>{app.email}</span>
                          </div>
                          {app.phone && (
                            <div className="mt-1 flex items-center gap-1.5" style={{ color: t.textLow }}>
                              <Phone className="h-3 w-3" />
                              <span>{app.phone}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 pr-3">
                          <select
                            value={app.status}
                            onChange={(e) => void updateStatus(app.id, e.target.value as StageType, app)}
                            className="rounded-xl px-2.5 py-1 text-xs font-semibold"
                            style={{
                              background: stageConf.bg,
                              color: stageConf.color,
                              border: `1px solid ${stageConf.color}40`,
                            }}
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s} style={{ background: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000' }}>
                                {STAGE_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 pr-3 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <input
                              id={`notes-${app.id}`}
                              defaultValue={app.stage_notes || ''}
                              placeholder="Add screening feedback or remarks…"
                              className="w-full rounded-xl px-2.5 py-1 text-xs"
                              style={{
                                background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                                border: `1px solid ${t.stroke}`,
                                color: t.textHi,
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`notes-${app.id}`) as HTMLInputElement | null;
                                if (el) void update(app.id, app.status as StageType, el.value);
                              }}
                              disabled={savingId === app.id}
                              className="shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-50"
                              style={{
                                background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                                color: t.textHi,
                              }}
                            >
                              <Save className="h-3 w-3" />
                              <span>{savingId === app.id ? '…' : 'Save'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminPageWrapper>
  );
}
