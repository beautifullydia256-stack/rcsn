import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import { useAcademicPeriod } from '@/lib/academicPeriodTerminology';
import NativeModal from '@/components/NativeModal';
import { fetchPerformancePageData, fetchPerformanceGoals } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';
import {
  Target,
  Award,
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  AlertCircle,
  X,
  ArrowLeft,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import { Link } from 'react-router-dom';
import '@/styles/government-system.css';

export default function PerformancePage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);
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

  if (!user) return null;

  if (perfQ.isError) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-4 border-l-4 border-l-rose-600 bg-rose-50 text-xs font-mono text-rose-800">
          {perfQ.error instanceof Error ? perfQ.error.message : 'Failed to load performance data'}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <GovPageLoader message="LOADING PERFORMANCE APPRAISAL DESK..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  if (!canHr) {
    return (
      <div className="admin-terminal-page space-y-4 p-4">
        <div className="gov-card p-6 text-xs font-mono space-y-2 border-l-4 border-l-amber-500 bg-amber-50 text-amber-900">
          <p className="font-bold uppercase">ACCESS RESTRICTED: WORKFORCE &amp; HR CLEARANCE REQUIRED</p>
          <p>
            Workforce and HR administration clearance is required to manage evaluation cycles and faculty appraisal metrics.
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
            INSTITUTIONAL FACULTY APPRAISAL &amp; PERFORMANCE DESK
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            STATUTORY EVALUATION CYCLES, OBJECTIVES &amp; FACULTY KEY PERFORMANCE INDICATORS • REPUBLIC OF UGANDA
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
            onClick={() => {
              void perfQ.refetch();
              if (activeCycle) void goalsQ.refetch();
            }}
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
            title="Refresh Appraisal Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications */}
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

      {successMsg && (
        <div className="gov-card p-3 border-l-4 border-l-emerald-600 bg-emerald-50 flex items-center justify-between text-xs font-mono text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-bold">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 2. MONOCHROME KPI SUMMARY STRIP ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ACTIVE APPRAISAL WINDOW
          </div>
          <div className="text-lg font-bold font-mono text-[#111111] mt-1 truncate">
            {activeCycle?.name || 'NONE ACTIVE'}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            {activeCycle ? `STATUS: ${activeCycle.status.toUpperCase()}` : 'NO ACTIVE CYCLE'}
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            REGISTERED REVIEW CYCLES
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.totalCycles}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            {stats.activeCycles} CURRENTLY ACTIVE
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            GOALS LOGGED IN WINDOW
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.totalGoals}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            FACULTY OBJECTIVES
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ACHIEVED MILESTONES
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.achievedGoals}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            {stats.totalGoals > 0
              ? `${Math.round((stats.achievedGoals / stats.totalGoals) * 100)}% COMPLETION RATE`
              : 'NO GOALS IN CYCLE'}
          </div>
        </div>
      </div>

      {/* ── 3. HIGH-DENSITY CONTROL TOOLBAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {cycles.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase font-bold text-[#333333]">
                REVIEW WINDOW:
              </span>
              <select
                value={selCycleId}
                onChange={(e) => setSelCycleId(e.target.value)}
                className="gov-select text-xs font-mono font-bold"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.toUpperCase()} ({c.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowNewCycleModal(true)}
            className="gov-btn gov-btn-secondary gov-btn-sm font-mono text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>NEW REVIEW CYCLE</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewGoalModal(true)}
            disabled={!activeCycle}
            className="gov-btn gov-btn-primary gov-btn-sm font-mono text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Target className="h-3.5 w-3.5" />
            <span>RECORD STAFF GOAL</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 border border-[#CCCCCC] p-0.5 bg-[#EEEEEE]">
          {(['all', 'pending', 'in_progress', 'achieved'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-2.5 py-1 text-xs font-mono uppercase transition-colors ${
                statusFilter === tab
                  ? 'bg-[#111111] text-white font-bold'
                  : 'text-[#555555] hover:text-[#111111]'
              }`}
            >
              {tab === 'in_progress' ? 'IN PROGRESS' : tab.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. FACULTY PERFORMANCE GOALS TABLE ── */}
      <div className="gov-card p-0 overflow-hidden">
        <div className="border-b border-[#CCCCCC] p-3 flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono uppercase text-[#111111]">
              CYCLE OBJECTIVES: {activeCycle?.name?.toUpperCase() || 'NONE SELECTED'}
            </span>
            {activeCycle && (
              <span className="inline-block border border-[#CCCCCC] bg-[#F4F4F6] px-2 py-0.5 text-[10px] font-bold font-mono uppercase text-[#111111]">
                STATUS: {activeCycle.status.toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-[#555555] uppercase">
            {filteredGoals.length} OF {goals.length} OBJECTIVES DISPLAYED
          </span>
        </div>

        {goalsQ.isPending ? (
          <div className="py-12 flex justify-center">
            <GovRollingBox size="md" />
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#555555] space-y-2">
            <FolderOpen className="w-8 h-8 mx-auto text-[#888888]" />
            <p className="font-bold uppercase text-[#111111]">NO PERFORMANCE OBJECTIVES LOGGED</p>
            <p>
              {activeCycle
                ? 'No staff KPI milestones recorded for this cycle. Use "+ RECORD STAFF GOAL" to establish targets.'
                : 'Create or select an appraisal review window above to configure staff objectives.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="gov-table w-full text-left text-xs">
              <thead>
                <tr>
                  <th className="font-mono uppercase">STAFF MEMBER</th>
                  <th className="font-mono uppercase">ROLE CATEGORY</th>
                  <th className="font-mono uppercase">PERFORMANCE OBJECTIVE / MILESTONE</th>
                  <th className="font-mono uppercase">CURRENT PROGRESS</th>
                  <th className="font-mono uppercase text-right">UPDATE STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredGoals.map((g) => {
                  const staffName = staffNameFor(g.staff_kind, g.staff_id);
                  const isTeacher = g.staff_kind === 'teacher';
                  const currentStatus = g.status?.toLowerCase() || 'pending';
                  const isAchieved = currentStatus === 'achieved' || currentStatus === 'completed';

                  return (
                    <tr key={g.id} className="hover:bg-[#F9F9FB]">
                      <td className="font-mono">
                        <div className="font-bold text-[#111111]">{staffName}</div>
                        <div className="text-[10px] text-[#777777]">
                          ID: {g.staff_id?.slice(0, 8).toUpperCase() || 'N/A'}
                        </div>
                      </td>

                      <td className="font-mono">
                        <span
                          className={`inline-block border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isTeacher
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-purple-50 text-purple-800 border-purple-300'
                          }`}
                        >
                          {isTeacher ? 'ACADEMIC FACULTY' : 'SUPPORT STAFF'}
                        </span>
                      </td>

                      <td className="font-mono">
                        <div className="flex items-center gap-2 text-[#111111]">
                          <Target className="h-3.5 w-3.5 text-[#555555] shrink-0" />
                          <span>{g.title}</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`inline-block border px-2 py-0.5 text-[10px] font-bold font-mono uppercase ${
                            isAchieved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : currentStatus === 'in_progress'
                                ? 'bg-sky-50 text-sky-800 border-sky-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {currentStatus === 'in_progress' ? 'IN PROGRESS' : currentStatus.toUpperCase()}
                        </span>
                      </td>

                      <td className="text-right">
                        <select
                          value={currentStatus}
                          onChange={(e) => updateGoalStatus(g.id, e.target.value)}
                          className="gov-select text-xs font-mono uppercase font-bold py-1"
                        >
                          <option value="pending">PENDING</option>
                          <option value="in_progress">IN PROGRESS</option>
                          <option value="achieved">ACHIEVED</option>
                          <option value="deferred">DEFERRED</option>
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

      {/* ── 5. MODAL: ADD REVIEW CYCLE ── */}
      <NativeModal
        isOpen={showNewCycleModal}
        onClose={() => setShowNewCycleModal(false)}
        title="NEW APPRAISAL REVIEW CYCLE"
        subtitle={`Configure institutional evaluation window for ${labels.periodNoun}`}
        icon={Calendar}
        size="md"
      >
        <form onSubmit={addCycle} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
              CYCLE DESIGNATION *
            </label>
            <input
              type="text"
              required
              value={cname}
              onChange={(e) => setCname(e.target.value)}
              placeholder={`e.g. ${labels.periodNoun} 1 2026`}
              className="gov-input w-full text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
                COMMENCEMENT DATE *
              </label>
              <input
                type="date"
                required
                value={cstart}
                onChange={(e) => setCstart(e.target.value)}
                className="gov-input w-full text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
                CONCLUSION DATE *
              </label>
              <input
                type="date"
                required
                value={cend}
                onChange={(e) => setCend(e.target.value)}
                className="gov-input w-full text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
              OPERATIONAL STATUS
            </label>
            <select
              value={cstatus}
              onChange={(e) => setCstatus(e.target.value)}
              className="gov-select w-full text-xs font-mono"
            >
              <option value="active">ACTIVE</option>
              <option value="draft">DRAFT</option>
              <option value="completed">COMPLETED</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#CCCCCC]">
            <button
              type="button"
              onClick={() => setShowNewCycleModal(false)}
              className="gov-btn gov-btn-secondary gov-btn-sm font-mono text-xs"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={savingCycle}
              className="gov-btn gov-btn-primary gov-btn-sm font-mono text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {savingCycle ? <GovRollingBox size="sm" /> : <span>ESTABLISH CYCLE</span>}
            </button>
          </div>
        </form>
      </NativeModal>

      {/* ── 6. MODAL: ADD STAFF GOAL ── */}
      <NativeModal
        isOpen={showNewGoalModal}
        onClose={() => setShowNewGoalModal(false)}
        title="RECORD STAFF PERFORMANCE GOAL"
        subtitle="Assign statutory evaluation objective or metric"
        icon={Target}
        size="md"
      >
        <form onSubmit={addGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
              STAFF CATEGORY *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGKind('teacher');
                  setGStaff('');
                }}
                className={`gov-btn gov-btn-sm font-mono text-xs ${
                  gKind === 'teacher' ? 'gov-btn-primary' : 'gov-btn-secondary'
                }`}
              >
                ACADEMIC FACULTY
              </button>
              <button
                type="button"
                onClick={() => {
                  setGKind('other_staff');
                  setGStaff('');
                }}
                className={`gov-btn gov-btn-sm font-mono text-xs ${
                  gKind === 'other_staff' ? 'gov-btn-primary' : 'gov-btn-secondary'
                }`}
              >
                SUPPORT STAFF
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
              SELECT STAFF MEMBER *
            </label>
            <select
              required
              value={gStaff}
              onChange={(e) => setGStaff(e.target.value)}
              className="gov-select w-full text-xs font-mono"
            >
              <option value="">— CHOOSE A STAFF MEMBER —</option>
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
            <label className="block text-xs font-mono uppercase font-bold text-[#333333] mb-1">
              OBJECTIVE SPECIFICATION / MILESTONE *
            </label>
            <textarea
              required
              rows={3}
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="e.g. Complete clinical ward instruction syllabus, achieve minimum 90% student logbook completion"
              className="gov-input w-full text-xs font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#CCCCCC]">
            <button
              type="button"
              onClick={() => setShowNewGoalModal(false)}
              className="gov-btn gov-btn-secondary gov-btn-sm font-mono text-xs"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={savingGoal}
              className="gov-btn gov-btn-primary gov-btn-sm font-mono text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {savingGoal ? <GovRollingBox size="sm" /> : <span>SAVE OBJECTIVE</span>}
            </button>
          </div>
        </form>
      </NativeModal>
    </div>
  );
}
