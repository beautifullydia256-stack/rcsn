import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { fetchPerformancePageData, fetchPerformanceGoals } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';

export default function PerformancePage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);
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

  const [sel, setSel] = useState<string>('');
  const [goalTitle, setGoalTitle] = useState('');
  const [gKind, setGKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [gStaff, setGStaff] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const [cname, setCname] = useState('T1 2026');
  const [cstart, setCstart] = useState('');
  const [cend, setCend] = useState('');

  const goalsQ = useQuery({
    queryKey: workforceQueryKeys.performanceGoals(schoolId ?? '', sel),
    queryFn: () => fetchPerformanceGoals(schoolId!, sel),
    enabled: !!schoolId && !!sel,
  });
  const goals = goalsQ.data ?? [];

  if (perfQ.isError) {
    return (
      <AdminPageWrapper title="Performance" subtitle="Review cycles and goals">
        <div className={`${adminCardClass} text-red-200/90 text-sm`} role="alert">
          {perfQ.error instanceof Error ? perfQ.error.message : 'Failed to load'}
        </div>
      </AdminPageWrapper>
    );
  }
  if (loading) {
    return (
      <AdminPageWrapper title="Performance" subtitle="Loading…">
        <div className="ac-text-secondary text-sm">Loading…</div>
      </AdminPageWrapper>
    );
  }
  if (!canHr) {
    return (
      <AdminPageWrapper title="Performance" subtitle="Review cycles and goals">
        <div className={`${adminCardClass} text-amber-200/90`}>Workforce &amp; HR permission required.</div>
      </AdminPageWrapper>
    );
  }

  const addCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !cname || !cstart || !cend || !user?.id) return;
    setErr(null);
    const { error } = await supabase.from('hr_review_cycles').insert({
      school_id: schoolId,
      name: cname,
      period_start: cstart,
      period_end: cend,
      status: 'draft',
    });
    if (error) setErr(error.message);
    else {
      void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.performance(user.id) });
      setCname('T1 2026');
    }
  };

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !sel || !goalTitle.trim() || !gStaff) return;
    setErr(null);
    const { error } = await supabase.from('hr_staff_goals').insert({
      school_id: schoolId,
      cycle_id: sel,
      staff_kind: gKind,
      staff_id: gStaff,
      title: goalTitle.trim(),
    });
    if (error) setErr(error.message);
    else {
      setGoalTitle('');
      void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.performanceGoals(schoolId, sel) });
    }
  };

  return (
    <AdminPageWrapper
      title="Performance"
      subtitle="Create review windows and staff goals. Formal ratings live in staff reviews (next iteration)."
    >
      {err && <div className="mb-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
      {goalsQ.isError && (
        <div className="mb-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {goalsQ.error instanceof Error ? goalsQ.error.message : 'Failed to load goals'}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-2">Review cycle</h2>
          <form onSubmit={addCycle} className="space-y-2">
            <input
              className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
              value={cname}
              onChange={(e) => setCname(e.target.value)}
              placeholder="Name"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={cstart}
                onChange={(e) => setCstart(e.target.value)}
              />
              <input
                type="date"
                className="rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={cend}
                onChange={(e) => setCend(e.target.value)}
              />
            </div>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
              Add cycle
            </button>
          </form>
        </div>

        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-2">Goals in selected cycle</h2>
          <select
            className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm mb-2"
            value={sel}
            onChange={(e) => setSel(e.target.value)}
          >
            <option value="">Select review cycle</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
          {sel && (
            <form onSubmit={addGoal} className="space-y-2 border-t border-white/10 pt-2">
              <select
                className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={gKind}
                onChange={(e) => {
                  setGKind(e.target.value as 'teacher' | 'other_staff');
                  setGStaff('');
                }}
              >
                <option value="teacher">Teacher</option>
                <option value="other_staff">Other staff</option>
              </select>
              <select
                className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={gStaff}
                onChange={(e) => setGStaff(e.target.value)}
              >
                <option value="">Person</option>
                {gKind === 'teacher'
                  ? teachers.map((t) => (
                      <option key={t.teacher_id} value={t.teacher_id}>
                        {t.name}
                      </option>
                    ))
                  : other.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.full_name}
                      </option>
                    ))}
              </select>
              <input
                className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Goal title"
              />
              <button type="submit" className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white">
                Add goal
              </button>
            </form>
          )}
        </div>
      </div>

      {goals.length > 0 && (
        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-2">Goals</h2>
          <ul className="text-sm text-slate-200 space-y-1">
            {goals.map((g) => (
              <li key={g.id} className="border-b border-white/5 py-0.5">
                {g.title} <span className="text-slate-500">({g.staff_kind})</span> — {g.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminPageWrapper>
  );
}
