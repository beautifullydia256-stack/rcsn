import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { useAcademicPeriod } from '@/lib/academicPeriodTerminology';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { fetchPerformancePageData, fetchPerformanceGoals } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';
import {
  Target,
  Award,
  TrendingUp,
  Calendar,
  User,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

export default function PerformancePage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { labels } = useAcademicPeriod();
  const queryClient = useQueryClient();

  const perfQ = useQuery({
    queryKey: workforceQueryKeys.performance(user?.id ?? ''),
    queryFn: () => fetchPerformancePageData(user!.id),
    enabled: !!user?.id,
  });

  const schoolId = perfQ.data?.schoolId ?? null;
  const cycles = perfQ.data?.cycles ?? [];
  const teachers = perfQ.data?.teachers ?? [];
  const other = perfQ.data?.other ?? [];
  const loading = perfQ.isPending;

  const [selCycleId, setSelCycleId] = useState<string>('');
  const [goalTitle, setGoalTitle] = useState('');
  const [gKind, setGKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [gStaff, setGStaff] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Cycle form state
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [cname, setCname] = useState(`${labels.periodNoun} 1 ${new Date().getFullYear()}`);
  const [cstart, setCstart] = useState('');
  const [cend, setCend] = useState('');
  const [cstatus, setCstatus] = useState('active');
  const [savingCycle, setSavingCycle] = useState(false);

  // New Goal form state
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'achieved'>('all');

  // Auto-select first cycle if not set
  React.useEffect(() => {
    if (cycles.length > 0 && !selCycleId) {
      setSelCycleId(cycles[0].id);
    }
  }, [cycles, selCycleId]);

  const activeCycle = useMemo(
    () => cycles.find((c) => c.id === selCycleId) || cycles[0] || null,
    [cycles, selCycleId]
  );

  const goalsQ = useQuery({
    queryKey: workforceQueryKeys.performanceGoals(schoolId ?? '', activeCycle?.id ?? ''),
    queryFn: () => fetchPerformanceGoals(schoolId!, activeCycle!.id),
    enabled: !!schoolId && !!activeCycle?.id,
  });

  const goals = useMemo(() => goalsQ.data ?? [], [goalsQ.data]);

  const filteredGoals = useMemo(() => {
    if (statusFilter === 'all') return goals;
    return goals.filter((g) => g.status?.toLowerCase() === statusFilter);
  }, [goals, statusFilter]);

  const staffNameFor = useCallback(
    (kind: string, id: string) => {
      if (kind === 'teacher') {
        return teachers.find((t) => t.teacher_id === id)?.name || 'Teacher';
      }
      return other.find((o) => o.id === id)?.full_name || 'Staff Member';
    },
    [teachers, other]
  );

  // KPI calculations
  const stats = useMemo(() => {
    const totalCycles = cycles.length;
    const activeCycles = cycles.filter((c) => c.status === 'active').length;
    const totalGoals = goals.length;
    const achievedGoals = goals.filter((g) => g.status === 'achieved' || g.status === 'completed').length;
    return {
      totalCycles,
      activeCycles,
      totalGoals,
      achievedGoals,
    };
  }, [cycles, goals]);

  const addCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !cname || !cstart || !cend || !user?.id) return;
    setErr(null);
    setSavingCycle(true);
    const { error } = await supabase.from('hr_review_cycles').insert({
      school_id: schoolId,
      name: cname.trim(),
      period_start: cstart,
      period_end: cend,
      status: cstatus,
    });
    setSavingCycle(false);
    if (error) {
      setErr(error.message);
    } else {
      setSuccessMsg(`Review cycle "${cname}" created successfully.`);
      setShowNewCycleModal(false);
      setCname(`${labels.periodNoun} 1 ${new Date().getFullYear()}`);
      setCstart('');
      setCend('');
      void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.performance(user.id) });
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !activeCycle?.id || !goalTitle.trim() || !gStaff) return;
    setErr(null);
    setSavingGoal(true);
    const { error } = await supabase.from('hr_staff_goals').insert({
      school_id: schoolId,
      cycle_id: activeCycle.id,
      staff_kind: gKind,
      staff_id: gStaff,
      title: goalTitle.trim(),
      status: 'pending',
    });
    setSavingGoal(false);
    if (error) {
      setErr(error.message);
    } else {
      setGoalTitle('');
      setShowNewGoalModal(false);
      setSuccessMsg('Staff performance goal logged successfully.');
      void queryClient.invalidateQueries({
        queryKey: workforceQueryKeys.performanceGoals(schoolId, activeCycle.id),
      });
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const updateGoalStatus = async (goalId: string, newStatus: string) => {
    if (!schoolId || !activeCycle?.id) return;
    const { error } = await supabase
      .from('hr_staff_goals')
      .update({ status: newStatus })
      .eq('id', goalId);
    if (error) {
      setErr(error.message);
    } else {
      void queryClient.invalidateQueries({
        queryKey: workforceQueryKeys.performanceGoals(schoolId, activeCycle.id),
      });
    }
  };

  if (perfQ.isError) {
    return (
      <AdminPageWrapper title="Performance & Appraisals" subtitle="Review cycles and staff KPI goals">
        <div className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{perfQ.error instanceof Error ? perfQ.error.message : 'Failed to load performance data'}</span>
          </div>
        </div>
      </AdminPageWrapper>
    );
  }

  if (loading) {
    return (
      <AdminPageWrapper title="Performance & Appraisals" subtitle="Loading staff performance records…">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      </AdminPageWrapper>
    );
  }

  if (!canHr) {
    return (
      <AdminPageWrapper title="Performance & Appraisals" subtitle="Review cycles and staff KPI goals">
        <div className="w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200">
          Workforce &amp; HR permission required to manage performance cycles and staff appraisals.
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Performance & Appraisals"
      subtitle={`Configure ${labels.periodNoun.toLowerCase()} review windows, manage appraisals, and track employee performance goals.`}
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
                Active Window
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold truncate text-slate-100" style={{ fontFamily: SORA }}>
              {activeCycle?.name || 'None Active'}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90 font-medium">
              {activeCycle ? `Status: ${activeCycle.status}` : 'Create a review cycle'}
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
                Total Cycles
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.totalCycles}
            </p>
            <p className="mt-1 text-xs text-blue-400/90 font-medium">
              {stats.activeCycles} currently active
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
                Goals Set
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.totalGoals}
            </p>
            <p className="mt-1 text-xs text-purple-400/90 font-medium">
              In selected cycle
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
                Achieved
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {stats.achievedGoals}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              {stats.totalGoals > 0
                ? `${Math.round((stats.achievedGoals / stats.totalGoals) * 100)}% completion rate`
                : 'No goals logged'}
            </p>
          </div>
        </div>

        {/* Action Header / Cycle Selector Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                Review Windows &amp; Appraisals
              </h2>
              <p className="text-xs text-slate-400">
                Switch cycles to manage targets or create new appraisal intervals
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {cycles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Cycle:</span>
                <select
                  value={selCycleId}
                  onChange={(e) => setSelCycleId(e.target.value)}
                  className="rounded-xl border px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: t.surfaceSubtle,
                    borderColor: t.border,
                    color: t.textPrimary,
                  }}
                >
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowNewCycleModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/15 px-3.5 py-2 text-xs font-semibold text-teal-300 transition-all hover:bg-teal-500/25"
            >
              <Plus className="h-3.5 w-3.5" />
              New Cycle
            </button>

            <button
              type="button"
              onClick={() => setShowNewGoalModal(true)}
              disabled={!activeCycle}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
            >
              <Target className="h-3.5 w-3.5" />
              Add Staff Goal
            </button>
          </div>
        </div>

        {/* Goals Management Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
          }}
        >
          {/* Table Header / Filter Bar */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b p-4"
            style={{ borderColor: t.border }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200" style={{ fontFamily: SORA }}>
                Cycle Goals: {activeCycle?.name || 'None'}
              </span>
              {activeCycle && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 capitalize">
                  {activeCycle.status}
                </span>
              )}
            </div>

            {/* Filter Tabs */}
            <div
              className="inline-flex rounded-xl p-1"
              style={{ backgroundColor: t.surfaceSubtle }}
            >
              {(['all', 'pending', 'in_progress', 'achieved'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all ${
                    statusFilter === tab
                      ? 'bg-teal-500/20 text-teal-300 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'in_progress' ? 'In Progress' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table Body */}
          {goalsQ.isPending ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="p-8">
              <PosEmptyState
                icon={<Award className="w-8 h-8 text-teal-400" />}
                title="No Goals Found"
                description={
                  activeCycle
                    ? 'No performance objectives logged for this cycle yet. Create measurable staff KPI goals to foster growth.'
                    : 'Create a review cycle above to start setting goals.'
                }
                accentColor="mint"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-200">
                <thead
                  className="border-b text-xs font-semibold uppercase tracking-wider text-slate-400"
                  style={{
                    backgroundColor: t.surfaceSubtle,
                    borderColor: t.border,
                  }}
                >
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Performance Goal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: t.border }}>
                  {filteredGoals.map((g) => {
                    const staffName = staffNameFor(g.staff_kind, g.staff_id);
                    const isTeacher = g.staff_kind === 'teacher';
                    const currentStatus = g.status?.toLowerCase() || 'pending';

                    return (
                      <tr
                        key={g.id}
                        className="transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-xs font-bold text-teal-400">
                              {staffName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-100">{staffName}</p>
                              <p className="text-xs text-slate-400 font-mono">ID: {g.staff_id?.slice(0, 8) || 'N/A'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                              isTeacher
                                ? 'bg-blue-500/15 text-blue-300'
                                : 'bg-purple-500/15 text-purple-300'
                            }`}
                          >
                            {isTeacher ? 'Teacher' : 'Support Staff'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-teal-400 shrink-0" />
                            <span className="font-medium text-slate-200">{g.title}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              currentStatus === 'achieved' || currentStatus === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : currentStatus === 'in_progress'
                                  ? 'bg-blue-500/15 text-blue-400'
                                  : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {currentStatus === 'achieved' ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {currentStatus === 'in_progress' ? 'In Progress' : currentStatus}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <select
                            value={currentStatus}
                            onChange={(e) => updateGoalStatus(g.id, e.target.value)}
                            className="rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: t.surfaceSubtle,
                              borderColor: t.border,
                              color: t.textPrimary,
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="achieved">Achieved</option>
                            <option value="deferred">Deferred</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Add Review Cycle */}
        {showNewCycleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                    New Review Cycle
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewCycleModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={addCycle} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-300">Cycle Name</label>
                  <input
                    type="text"
                    required
                    value={cname}
                    onChange={(e) => setCname(e.target.value)}
                    placeholder={`e.g. ${labels.periodNoun} 1 2026`}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Start Date</label>
                    <input
                      type="date"
                      required
                      value={cstart}
                      onChange={(e) => setCstart(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                      style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">End Date</label>
                    <input
                      type="date"
                      required
                      value={cend}
                      onChange={(e) => setCend(e.target.value)}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                      style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Initial Status</label>
                  <select
                    value={cstatus}
                    onChange={(e) => setCstatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCycleModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCycle}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
                  >
                    {savingCycle ? 'Creating…' : 'Create Cycle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Staff Goal */}
        {showNewGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
              style={{
                backgroundColor: t.surface,
                border: `1px solid ${t.border}`,
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: t.border }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <Target className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-slate-100" style={{ fontFamily: SORA }}>
                    Add Performance Goal
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewGoalModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={addGoal} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-300">Staff Category</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGKind('teacher');
                        setGStaff('');
                      }}
                      className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                        gKind === 'teacher'
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      Teaching Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGKind('other_staff');
                        setGStaff('');
                      }}
                      className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                        gKind === 'other_staff'
                          ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      Support Staff
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Select Staff Member</label>
                  <select
                    required
                    value={gStaff}
                    onChange={(e) => setGStaff(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  >
                    <option value="">Choose a staff member…</option>
                    {gKind === 'teacher'
                      ? teachers.map((tc) => (
                          <option key={tc.teacher_id} value={tc.teacher_id}>
                            {tc.name}
                          </option>
                        ))
                      : other.map((os) => (
                          <option key={os.id} value={os.id}>
                            {os.full_name}
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Goal Description / Milestone</label>
                  <textarea
                    required
                    rows={3}
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="e.g. Complete curriculum milestone for Semester 1, achieve 90% attendance"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-slate-100"
                    style={{ backgroundColor: t.surfaceSubtle, borderColor: t.border }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewGoalModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingGoal}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingGoal ? 'Saving…' : 'Save Goal'}
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
