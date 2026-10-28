import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { Link } from 'react-router-dom';
import { fetchRecruitmentPageData, type RecruitmentPageData } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';
import {
  Search,
  ExternalLink,
  Briefcase,
  Mail,
  Phone,
  Save,
  AlertCircle,
  X,
  ArrowLeft,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

type Application = RecruitmentPageData['rows'][number];

const STAGES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const;
type StageType = (typeof STAGES)[number];

const STAGE_CONFIG: Record<StageType, { label: string; badgeClass: string }> = {
  new: { label: 'New Dossier', badgeClass: 'bg-sky-50 text-sky-800 border-sky-300' },
  screening: { label: 'Screening', badgeClass: 'bg-purple-50 text-purple-800 border-purple-300' },
  interview: { label: 'Interview Scheduled', badgeClass: 'bg-amber-50 text-amber-800 border-amber-300' },
  offer: { label: 'Offer Extended', badgeClass: 'bg-blue-50 text-blue-800 border-blue-300' },
  hired: { label: 'Hired & Confirmed', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  rejected: { label: 'Archived / Rejected', badgeClass: 'bg-rose-50 text-rose-800 border-rose-300' },
};

export default function RecruitmentPage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);

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

  if (!user) return null;

  if (q.isError) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-4 border-l-4 border-l-rose-600 bg-rose-50 text-xs font-mono text-rose-800">
          {q.error instanceof Error ? q.error.message : 'Failed to load recruitment data'}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <GovPageLoader message="LOADING RECRUITMENT ATS & APPLICANT DOSSIERS..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  if (!canHr) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-6 text-xs font-mono space-y-2 border-l-4 border-l-amber-500 bg-amber-50 text-amber-900">
          <p className="font-bold uppercase">ACCESS RESTRICTED: WORKFORCE &amp; HR CLEARANCE REQUIRED</p>
          <p>
            You do not possess the required statutory human resource permissions to view candidate dossiers and manage ATS stages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-4 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            INSTITUTIONAL RECRUITMENT &amp; APPLICANT ATS
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            CANDIDATE DOSSIERS, SCREENING PIPELINE &amp; MERIT SELECTION • REPUBLIC OF UGANDA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard/admin/jobs"
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5 font-mono"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>VACANCY DESK</span>
          </Link>
          <Link
            to="/dashboard/admin/workforce"
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>WORKFORCE HUB</span>
          </Link>
          <button
            type="button"
            onClick={() => void q.refetch()}
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
            title="Refresh Dossiers"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {err && (
        <div className="gov-card p-3 border-l-4 border-l-rose-600 bg-rose-50 flex items-center justify-between text-xs font-mono text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-700 shrink-0" />
            <span>{err}</span>
          </div>
          <button type="button" onClick={() => setErr(null)} className="text-rose-700 font-bold">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 2. MONOCHROME STAGE KPI METRIC STRIP ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((s) => {
          const conf = STAGE_CONFIG[s];
          const count = rows.filter((r) => r.status === s).length;
          const isSelected = selectedStage === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedStage(isSelected ? 'all' : s)}
              className={`gov-card p-3 text-left transition-all ${
                isSelected ? 'border-2 border-[#111111] bg-[#EEEEEE]' : 'hover:border-[#999999]'
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#555555]">
                {conf.label}
              </div>
              <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
                {count}
              </div>
              <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
                {isSelected ? '● FILTER ACTIVE' : 'CLICK TO FILTER'}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 3. HIGH-DENSITY CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777777]" />
            <input
              type="text"
              placeholder="SEARCH APPLICANT NAME, EMAIL, OR VACANCY TITLE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="gov-input pl-9 text-xs w-full font-mono uppercase"
            />
          </div>

          {uniqueJobs.length > 0 && (
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="gov-select text-xs font-mono"
            >
              <option value="all">ALL VACANCIES ({rows.length})</option>
              {uniqueJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title.toUpperCase()}
                </option>
              ))}
            </select>
          )}

          {selectedStage !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedStage('all')}
              className="gov-btn gov-btn-secondary gov-btn-sm font-mono text-xs flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>CLEAR STAGE ({selectedStage.toUpperCase()})</span>
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-[#555555] uppercase">
          SHOWING {filteredRows.length} OF {rows.length} CANDIDATES
        </div>
      </div>

      {/* ── 4. APPLICANT PIPELINE DOSSIER LEDGER ── */}
      <div className="gov-card p-0 overflow-hidden">
        <div className="border-b border-[#CCCCCC] p-3 flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono uppercase text-[#111111]">
              CANDIDATE APPLICATIONS REGISTRY
            </span>
            <span className="text-[11px] font-mono text-[#777777]">
              ({filteredRows.length} RECORDS MATCHED)
            </span>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#555555] space-y-2">
            <FolderOpen className="w-8 h-8 mx-auto text-[#888888]" />
            <p className="font-bold uppercase text-[#111111]">NO CANDIDATE DOSSIERS FOUND</p>
            <p>No job applications match the specified search parameters or hiring stage filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="font-mono uppercase">APPLICANT PROFILE</th>
                  <th className="font-mono uppercase">VACANCY POSITION</th>
                  <th className="font-mono uppercase">COMMUNICATION CHANNELS</th>
                  <th className="font-mono uppercase">HIRING STAGE</th>
                  <th className="font-mono uppercase">EVALUATION NOTES / REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((app) => {
                  const stageConf = STAGE_CONFIG[app.status as StageType] || STAGE_CONFIG.new;
                  return (
                    <tr key={app.id} className="align-top hover:bg-[#F9F9FB]">
                      <td className="font-mono">
                        <div className="font-bold text-[#111111]">
                          {app.full_name}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-[#777777]">
                          <span>{new Date(app.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <a
                            href={`/careers/${app.job_id}/apply`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-blue-700 hover:underline uppercase"
                          >
                            <span>PUBLIC VACANCY</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </td>

                      <td className="font-mono">
                        <span className="inline-block border border-[#CCCCCC] bg-[#F4F4F6] px-2 py-0.5 text-[11px] font-bold text-[#111111] uppercase">
                          {jobTitle[app.job_id] || 'INSTITUTION VACANCY'}
                        </span>
                      </td>

                      <td className="font-mono">
                        <div className="flex items-center gap-1.5 text-[#111111]">
                          <Mail className="h-3 w-3 text-[#777777] shrink-0" />
                          <span>{app.email}</span>
                        </div>
                        {app.phone && (
                          <div className="mt-1 flex items-center gap-1.5 text-[#555555]">
                            <Phone className="h-3 w-3 text-[#777777] shrink-0" />
                            <span>{app.phone}</span>
                          </div>
                        )}
                      </td>

                      <td>
                        <select
                          value={app.status}
                          onChange={(e) => void updateStatus(app.id, e.target.value as StageType, app)}
                          className={`gov-select text-xs font-mono font-bold uppercase py-1 border ${stageConf.badgeClass}`}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {STAGE_CONFIG[s].label.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="min-w-[240px]">
                        <div className="flex items-center gap-2">
                          <input
                            id={`notes-${app.id}`}
                            defaultValue={app.stage_notes || ''}
                            placeholder="Add evaluation remarks..."
                            className="gov-input text-xs w-full font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(`notes-${app.id}`) as HTMLInputElement | null;
                              if (el) void update(app.id, app.status as StageType, el.value);
                            }}
                            disabled={savingId === app.id}
                            className="gov-btn gov-btn-secondary gov-btn-sm font-mono shrink-0 flex items-center gap-1"
                          >
                            {savingId === app.id ? (
                              <GovRollingBox size="sm" />
                            ) : (
                              <>
                                <Save className="h-3 w-3" />
                                <span>SAVE</span>
                              </>
                            )}
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
  );
}
