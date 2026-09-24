import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { fetchOnboardingPageData, type OnboardingPageData } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Plus,
  FileCheck,
  User,
  AlertCircle,
  ChevronRight,
  ListTodo,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

type Run = OnboardingPageData['runs'][number];

export default function OnboardingPage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

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
  const [tTasks, setTTasks] = useState('Sign employment contract\nVerify academic & clinical credentials\nCampus orientation tour\nIssue staff identity badge & biometric enrollment');
  const [runKind, setRunKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [runStaff, setRunStaff] = useState('');
  const [runTpl, setRunTpl] = useState('');
  const [creatingTpl, setCreatingTpl] = useState(false);
  const [startingRun, setStartingRun] = useState(false);

  if (q.isError) {
    return (
      <AdminPageWrapper eyebrow="Workforce & HR" title="Staff Onboarding" subtitle="Checklists & induction">
        <div className="rounded-[20px] p-4 text-sm" style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, color: '#fca5a5' }} role="alert">
          {q.error instanceof Error ? q.error.message : 'Failed to load onboarding data'}
        </div>
      </AdminPageWrapper>
    );
  }

  if (loading) {
    return (
      <AdminPageWrapper eyebrow="Workforce & HR" title="Staff Onboarding" subtitle="Loading checklists…">
        <div className="text-sm py-12 text-center" style={{ color: t.textLow }}>Loading onboarding records…</div>
      </AdminPageWrapper>
    );
  }

  if (!canHr) {
    return (
      <AdminPageWrapper eyebrow="Workforce & HR" title="Staff Onboarding" subtitle="Checklists & induction">
        <div className="rounded-[20px] p-5 text-sm" style={{ background: cardGrad(t), border: `1px solid ${t.stroke}`, color: t.gold }}>
          Workforce and HR permission required to manage staff onboarding.
        </div>
      </AdminPageWrapper>
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
    <AdminPageWrapper
      eyebrow="Workforce & HR"
      title="Staff Onboarding & Induction Checklists"
      subtitle="Standardize employee induction. Build reusable checklist templates and monitor new hire onboarding progress."
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

        {/* 3-Card Summary Strip */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className="rounded-[18px] p-4"
            style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: t.textLow }}>
              <span>Checklist Templates</span>
              <FileCheck className="h-4 w-4" style={{ color: '#a78bfa' }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              {templates.length}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: '#a78bfa' }}>Configured protocols</div>
          </div>

          <div
            className="rounded-[18px] p-4"
            style={{ background: cardGrad(t), border: `1px solid ${inProgressRuns.length > 0 ? t.gold : t.stroke}` }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: t.textLow }}>
              <span>In Progress Runs</span>
              <Clock className="h-4 w-4" style={{ color: t.gold }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: inProgressRuns.length > 0 ? t.gold : t.textHi, fontFamily: SORA }}>
              {inProgressRuns.length}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.gold }}>Active employee inductions</div>
          </div>

          <div
            className="rounded-[18px] p-4"
            style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: t.textLow }}>
              <span>Completed Inductions</span>
              <CheckCircle2 className="h-4 w-4" style={{ color: t.mint }} />
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: t.mint, fontFamily: SORA }}>
              {completedRuns.length}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: t.mint }}>Fully cleared staff</div>
          </div>
        </div>

        {/* 2-Column: Create Template + Launch Onboarding */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Template Creator */}
          <div
            className="rounded-[20px] p-5"
            style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: t.stroke }}>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.3)' }}
                >
                  <ListTodo className="h-4 w-4" style={{ color: '#a78bfa' }} />
                </div>
                <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                  Create Checklist Template
                </h2>
              </div>
            </div>

            <form onSubmit={createTemplate} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                  Template Name
                </label>
                <input
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="e.g. Clinical Preceptor Induction"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                  Checklist Tasks (One task per line)
                </label>
                <textarea
                  className="w-full rounded-xl px-3 py-2 text-xs font-mono"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                  rows={4}
                  value={tTasks}
                  onChange={(e) => setTTasks(e.target.value)}
                  placeholder="Step 1: Contract verification&#10;Step 2: UHPAB License registration&#10;Step 3: Biometric enrollment"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={creatingTpl || !tName.trim()}
                className="w-full rounded-xl py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                  color: t.textHi,
                }}
              >
                {creatingTpl ? 'Saving Template…' : '+ Save Checklist Template'}
              </button>
            </form>
          </div>

          {/* Start Onboarding Run */}
          <div
            className="rounded-[20px] p-5"
            style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: t.stroke }}>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${t.mint}15`, border: `1px solid ${t.mint}30` }}
                >
                  <Plus className="h-4 w-4" style={{ color: t.mint }} />
                </div>
                <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                  Launch Onboarding Run
                </h2>
              </div>
            </div>

            <form onSubmit={startRun} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                  Select Checklist Template
                </label>
                <select
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                    border: `1px solid ${t.stroke}`,
                    color: t.textHi,
                  }}
                  value={runTpl}
                  onChange={(e) => setRunTpl(e.target.value)}
                >
                  <option value="">Standard Onboarding (Default task)</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                    Staff Role
                  </label>
                  <select
                    className="w-full rounded-xl px-3 py-2 text-xs font-medium"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                    }}
                    value={runKind}
                    onChange={(e) => {
                      setRunKind(e.target.value as 'teacher' | 'other_staff');
                      setRunStaff('');
                    }}
                  >
                    <option value="teacher">Academic Staff (Teacher)</option>
                    <option value="other_staff">Support Staff</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: t.textLow }}>
                    New Hire Employee
                  </label>
                  <select
                    className="w-full rounded-xl px-3 py-2 text-xs font-medium"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      border: `1px solid ${t.stroke}`,
                      color: t.textHi,
                    }}
                    value={runStaff}
                    onChange={(e) => setRunStaff(e.target.value)}
                    required
                  >
                    <option value="">— Select Employee —</option>
                    {runKind === 'teacher'
                      ? teachers.map((teacher) => (
                          <option key={teacher.teacher_id} value={teacher.teacher_id}>
                            {teacher.name || 'Unnamed Teacher'}
                          </option>
                        ))
                      : other.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.full_name || 'Unnamed Staff'}
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={startingRun || !runStaff}
                className="w-full rounded-xl py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  background: t.mint,
                  color: '#042f24',
                  boxShadow: '0 2px 10px rgba(16, 217, 168, 0.3)',
                }}
              >
                {startingRun ? 'Launching Run…' : '+ Start Onboarding Checklist'}
              </button>
            </form>
          </div>
        </div>

        {/* Active & Historical Onboarding Runs */}
        <div
          className="rounded-[20px] p-5"
          style={{ background: cardGrad(t), border: `1px solid ${t.stroke}` }}
        >
          <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: t.stroke }}>
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                Active & Recent Onboarding Runs ({runs.length})
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: t.textLow }}>
                Current checklist progression for newly recruited institution staff.
              </p>
            </div>
          </div>

          {runs.length === 0 ? (
            <PosEmptyState
              icon={<ClipboardList className="h-8 w-8 text-purple-400" />}
              title="No Onboarding Runs"
              description="No staff members are currently undergoing onboarding. Start a new run when welcoming new employees."
              accentColor="purple"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: t.stroke, color: t.textLow }}>
                    <th className="py-2.5 pr-3 font-semibold">Staff Member</th>
                    <th className="py-2.5 pr-3 font-semibold">Role Category</th>
                    <th className="py-2.5 pr-3 font-semibold">Assigned Template</th>
                    <th className="py-2.5 pr-3 font-semibold">Started Date</th>
                    <th className="py-2.5 pr-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const isDone = r.status === 'completed';
                    const tplName = templates.find((tpl) => tpl.id === r.template_id)?.name || 'Default Protocol';
                    return (
                      <tr
                        key={r.id}
                        className="border-b transition-colors"
                        style={{ borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                      >
                        <td className="py-3 pr-3 font-bold" style={{ color: t.textHi }}>
                          {staffLabel(r)}
                        </td>
                        <td className="py-3 pr-3" style={{ color: t.textLow }}>
                          {r.subject_staff_kind === 'teacher' ? 'Academic Staff' : 'Support / Operations'}
                        </td>
                        <td className="py-3 pr-3" style={{ color: '#a78bfa' }}>
                          {tplName}
                        </td>
                        <td className="py-3 pr-3" style={{ color: t.textHi }}>
                          {new Date(r.started_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: isDone ? `${t.mint}20` : `${t.gold}20`,
                              color: isDone ? t.mint : t.gold,
                              border: `1px solid ${isDone ? t.mint : t.gold}40`,
                            }}
                          >
                            {r.status === 'in_progress' ? 'In Progress' : r.status}
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
    </AdminPageWrapper>
  );
}
