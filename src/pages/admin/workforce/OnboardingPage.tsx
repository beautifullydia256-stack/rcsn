import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { Link } from 'react-router-dom';
import { fetchOnboardingPageData, type OnboardingPageData } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';
import {
  ListTodo,
  Plus,
  AlertCircle,
  X,
  ArrowLeft,
  RefreshCw,
  FolderOpen,
  ClipboardList,
} from 'lucide-react';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

type Run = OnboardingPageData['runs'][number];

export default function OnboardingPage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);

  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: workforceQueryKeys.onboarding(user?.id ?? ''),
    queryFn: () => fetchOnboardingPageData(user!.id),
    enabled: !!user?.id,
  });

  const schoolId = q.data?.schoolId ?? null;
  const templates = q.data?.templates ?? [];
  const runs = q.data?.runs ?? [];
  const teachers = q.data?.teachers ?? [];
  const other = q.data?.other ?? [];
  const loading = q.isPending;

  const [err, setErr] = useState<string | null>(null);
  const [tName, setTName] = useState('Standard Academic Hire');
  const [tTasks, setTTasks] = useState(
    'Sign employment contract\nVerify academic & clinical credentials\nCampus orientation tour\nIssue staff identity badge & biometric enrollment'
  );
  const [runKind, setRunKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [runStaff, setRunStaff] = useState('');
  const [runTpl, setRunTpl] = useState('');
  const [creatingTpl, setCreatingTpl] = useState(false);
  const [startingRun, setStartingRun] = useState(false);

  if (!user) return null;

  if (q.isError) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-4 border-l-4 border-l-rose-600 bg-rose-50 text-xs font-mono text-rose-800">
          {q.error instanceof Error ? q.error.message : 'Failed to load onboarding data'}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <GovPageLoader message="LOADING ONBOARDING PROTOCOLS & INDUCTION REGISTRY..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  if (!canHr) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-6 text-xs font-mono space-y-2 border-l-4 border-l-amber-500 bg-amber-50 text-amber-900">
          <p className="font-bold uppercase">ACCESS RESTRICTED: WORKFORCE &amp; HR CLEARANCE REQUIRED</p>
          <p>
            You do not possess the required statutory permissions to access or configure employee onboarding protocols.
          </p>
        </div>
      </div>
    );
  }

  const createTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !tName.trim() || !user?.id) return;
    setCreatingTpl(true);
    setErr(null);
    const { data: ins, error } = await supabase
      .from('hr_onboarding_templates')
      .insert({ school_id: schoolId, name: tName.trim() })
      .select('id')
      .single();
    if (error || !ins) {
      setErr(error?.message || 'Failed to create template');
      setCreatingTpl(false);
      return;
    }
    const tid = (ins as { id: string }).id;
    const lines = tTasks.split('\n').map((s) => s.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      await supabase.from('hr_onboarding_template_tasks').insert({
        template_id: tid,
        title: lines[i],
        sort_order: i,
      });
    }
    setTName('');
    setTTasks('');
    setCreatingTpl(false);
    void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.onboarding(user.id) });
  };

  const startRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !runStaff || !user?.id) return;
    setStartingRun(true);
    setErr(null);
    const { data: run, error: re } = await supabase
      .from('hr_onboarding_runs')
      .insert({
        school_id: schoolId,
        subject_staff_kind: runKind,
        subject_staff_id: runStaff,
        template_id: runTpl || null,
        status: 'in_progress',
      })
      .select('id')
      .single();
    if (re || !run) {
      setErr(re?.message || 'Failed to start onboarding run');
      setStartingRun(false);
      return;
    }
    const runId = (run as { id: string }).id;
    if (runTpl) {
      const { data: ttasks } = await supabase
        .from('hr_onboarding_template_tasks')
        .select('title, description, sort_order')
        .eq('template_id', runTpl)
        .order('sort_order');
      const lines = ttasks || [];
      for (const row of lines) {
        const r = row as { title: string; description: string | null; sort_order: number };
        await supabase.from('hr_onboarding_run_tasks').insert({
          run_id: runId,
          title: r.title,
          description: r.description,
          sort_order: r.sort_order,
        });
      }
    } else {
      await supabase.from('hr_onboarding_run_tasks').insert({
        run_id: runId,
        title: 'Initial orientation & contract verification',
        sort_order: 0,
      });
    }
    setRunStaff('');
    setStartingRun(false);
    void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.onboarding(user.id) });
  };

  const staffLabel = (r: Run) => {
    if (r.subject_staff_kind === 'teacher') {
      return teachers.find((t) => t.teacher_id === r.subject_staff_id)?.name || `Teacher (${r.subject_staff_id.slice(0, 8)})`;
    }
    return other.find((o) => o.id === r.subject_staff_id)?.full_name || `Staff (${r.subject_staff_id.slice(0, 8)})`;
  };

  const inProgressRuns = runs.filter((r) => r.status === 'in_progress');
  const completedRuns = runs.filter((r) => r.status === 'completed');

  return (
    <div className="admin-terminal-page space-y-4 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            INSTITUTIONAL EMPLOYEE ONBOARDING PROTOCOL
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            STANDARDIZED INDUCTION PROTOCOLS, STATUTORY CHECKLISTS &amp; NEW HIRE DOSSIERS • REPUBLIC OF UGANDA
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            title="Refresh Onboarding Ledger"
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

      {/* ── 2. MONOCHROME KPI METRIC STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ACTIVE INDUCTIONS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {inProgressRuns.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            IN PROGRESS DOSSIERS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            COMPLETED INDUCTIONS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {completedRuns.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            CLEARED &amp; CONFIRMED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            STANDARD TEMPLATES
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {templates.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            CONFIGURED PROTOCOLS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL WORKFORCE POOL
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {teachers.length + other.length}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            {teachers.length} FACULTY / {other.length} SUPPORT
          </div>
        </div>
      </div>

      {/* ── 3. DUAL DESK: PROTOCOL BUILDER & INDUCTION LAUNCHER ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Template Creator */}
        <div className="gov-card p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#CCCCCC] pb-3">
            <ListTodo className="h-4 w-4 text-[#111111]" />
            <h2 className="text-sm font-bold font-mono uppercase text-[#111111]">
              CREATE INDUCTION TEMPLATE
            </h2>
          </div>

          <form onSubmit={createTemplate} className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
                TEMPLATE TITLE *
              </label>
              <input
                className="gov-input w-full text-xs font-mono"
                value={tName}
                onChange={(e) => setTName(e.target.value)}
                placeholder="e.g. Clinical Nursing Preceptor Induction"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
                INDUCTION TASKS (ONE TASK PER LINE) *
              </label>
              <textarea
                className="gov-input w-full text-xs font-mono"
                rows={5}
                value={tTasks}
                onChange={(e) => setTTasks(e.target.value)}
                placeholder="Task 1: Contract verification&#10;Task 2: UHPAB License verification&#10;Task 3: Biometric enrollment&#10;Task 4: Facility tour"
                required
              />
            </div>

            <button
              type="submit"
              disabled={creatingTpl || !tName.trim()}
              className="gov-btn gov-btn-secondary w-full font-mono text-xs flex items-center justify-center gap-2"
            >
              {creatingTpl ? (
                <GovRollingBox size="sm" />
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>RECORD CHECKLIST TEMPLATE</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Start Onboarding Run */}
        <div className="gov-card p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#CCCCCC] pb-3">
            <ClipboardList className="h-4 w-4 text-[#111111]" />
            <h2 className="text-sm font-bold font-mono uppercase text-[#111111]">
              LAUNCH ONBOARDING DOSSIER
            </h2>
          </div>

          <form onSubmit={startRun} className="space-y-3">
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
                SELECT PROTOCOL TEMPLATE *
              </label>
              <select
                className="gov-select w-full text-xs font-mono"
                value={runTpl}
                onChange={(e) => setRunTpl(e.target.value)}
              >
                <option value="">STANDARD ONBOARDING (DEFAULT ORIENTATION)</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
                  STAFF CATEGORY *
                </label>
                <select
                  className="gov-select w-full text-xs font-mono"
                  value={runKind}
                  onChange={(e) => {
                    setRunKind(e.target.value as 'teacher' | 'other_staff');
                    setRunStaff('');
                  }}
                >
                  <option value="teacher">ACADEMIC FACULTY (TEACHER)</option>
                  <option value="other_staff">SUPPORT / ADMINISTRATIVE STAFF</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
                  SELECT EMPLOYEE *
                </label>
                <select
                  className="gov-select w-full text-xs font-mono"
                  value={runStaff}
                  onChange={(e) => setRunStaff(e.target.value)}
                  required
                >
                  <option value="">— SELECT EMPLOYEE —</option>
                  {runKind === 'teacher'
                    ? teachers.map((teacher) => (
                        <option key={teacher.teacher_id} value={teacher.teacher_id}>
                          {teacher.name || 'UNNAMED FACULTY'}
                        </option>
                      ))
                    : other.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.full_name || 'UNNAMED STAFF'}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={startingRun || !runStaff}
              className="gov-btn gov-btn-primary w-full font-mono text-xs flex items-center justify-center gap-2"
            >
              {startingRun ? (
                <GovRollingBox size="sm" />
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>INITIALIZE INDUCTION CHECKLIST</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── 4. ONBOARDING RUNS ARCHIVE LEDGER ── */}
      <div className="gov-card p-0 overflow-hidden">
        <div className="border-b border-[#CCCCCC] p-3 flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono uppercase text-[#111111]">
              ACTIVE &amp; HISTORICAL ONBOARDING RUNS
            </span>
            <span className="text-[11px] font-mono text-[#777777]">
              ({runs.length} INDUCTION PROTOCOLS RECORDED)
            </span>
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#555555] space-y-2">
            <FolderOpen className="w-8 h-8 mx-auto text-[#888888]" />
            <p className="font-bold uppercase text-[#111111]">NO ONBOARDING RUNS IN LEDGER</p>
            <p>No active or completed staff induction checklists are currently logged in the system.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="font-mono uppercase">STAFF MEMBER</th>
                  <th className="font-mono uppercase">ROLE CATEGORY</th>
                  <th className="font-mono uppercase">ASSIGNED TEMPLATE</th>
                  <th className="font-mono uppercase">COMMENCEMENT DATE</th>
                  <th className="font-mono uppercase">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const isDone = r.status === 'completed';
                  const tplName = templates.find((tpl) => tpl.id === r.template_id)?.name || 'Standard Protocol';
                  return (
                    <tr key={r.id} className="hover:bg-[#F9F9FB]">
                      <td className="font-mono font-bold text-[#111111]">
                        {staffLabel(r)}
                      </td>
                      <td className="font-mono uppercase text-[#555555]">
                        {r.subject_staff_kind === 'teacher' ? 'ACADEMIC FACULTY' : 'SUPPORT / OPERATIONS'}
                      </td>
                      <td className="font-mono uppercase text-[#111111]">
                        {tplName}
                      </td>
                      <td className="font-mono text-[#555555]">
                        {new Date(r.started_at).toLocaleDateString()}
                      </td>
                      <td>
                        <span
                          className={`inline-block border px-2 py-0.5 text-[10px] font-bold font-mono uppercase ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {r.status === 'in_progress' ? 'IN PROGRESS' : r.status.toUpperCase()}
                        </span>
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
