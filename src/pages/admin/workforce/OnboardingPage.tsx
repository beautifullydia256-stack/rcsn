import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';

type Template = { id: string; name: string; created_at: string };
type Run = {
  id: string;
  subject_staff_kind: string;
  subject_staff_id: string;
  status: string;
  started_at: string;
  template_id: string | null;
};

export default function OnboardingPage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [tName, setTName] = useState('Standard hire');
  const [tTasks, setTTasks] = useState('Sign contract\nID verified\nInduction day');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [teachers, setTeachers] = useState<{ teacher_id: string; name: string | null }[]>([]);
  const [other, setOther] = useState<{ id: string; full_name: string | null }[]>([]);
  const [runKind, setRunKind] = useState<'teacher' | 'other_staff'>('teacher');
  const [runStaff, setRunStaff] = useState('');
  const [runTpl, setRunTpl] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: u, error: ue } = await supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single();
    if (ue || !u?.school_id) {
      setErr('No school');
      setLoading(false);
      return;
    }
    setSchoolId(u.school_id);
    const [a, b, t, o] = await Promise.all([
      supabase.from('hr_onboarding_templates').select('id, name, created_at').eq('school_id', u.school_id).order('name'),
      supabase
        .from('hr_onboarding_runs')
        .select('id, subject_staff_kind, subject_staff_id, status, started_at, template_id')
        .eq('school_id', u.school_id)
        .order('started_at', { ascending: false })
        .limit(50),
      supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id).order('name'),
      supabase.from('other_staff_members').select('id, full_name').eq('school_id', u.school_id).order('full_name'),
    ]);
    if (a.error) setErr(a.error.message);
    else setTemplates((a.data || []) as Template[]);
    if (!a.error) setRuns((b.data || []) as Run[]);
    if (t.data) setTeachers(t.data as { teacher_id: string; name: string | null }[]);
    if (o.data) setOther(o.data as { id: string; full_name: string | null }[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <AdminPageWrapper title="Onboarding" subtitle="Loading…">
        <div className="ac-text-secondary text-sm">Loading…</div>
      </AdminPageWrapper>
    );
  }
  if (!canHr) {
    return (
      <AdminPageWrapper title="Onboarding" subtitle="Checklists">
        <div className={`${adminCardClass} text-amber-200/90`}>Workforce and HR permission required.</div>
      </AdminPageWrapper>
    );
  }

  const createTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !tName.trim()) return;
    setErr(null);
    const { data: ins, error } = await supabase
      .from('hr_onboarding_templates')
      .insert({ school_id: schoolId, name: tName.trim() })
      .select('id')
      .single();
    if (error || !ins) {
      setErr(error?.message || 'Failed');
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
    setTName('Standard hire');
    setTTasks('Sign contract\nID verified\nInduction day');
    void load();
  };

  const startRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !runStaff) return;
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
      setErr(re?.message || 'Failed to start run');
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
        title: 'First task',
        sort_order: 0,
      });
    }
    setRunStaff('');
    void load();
  };

  const staffLabel = (r: Run) => {
    if (r.subject_staff_kind === 'teacher') {
      return teachers.find((t) => t.teacher_id === r.subject_staff_id)?.name || r.subject_staff_id;
    }
    return other.find((o) => o.id === r.subject_staff_id)?.full_name || r.subject_staff_id;
  };

  return (
    <AdminPageWrapper
      title="Onboarding"
      subtitle="Reusable checklists and per-hire task runs. Tasks can be generated from a template or started empty."
    >
      {err && <div className="mb-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-2">New template</h2>
          <form onSubmit={createTemplate} className="space-y-2">
            <input
              className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
              value={tName}
              onChange={(e) => setTName(e.target.value)}
              placeholder="Template name"
            />
            <textarea
              className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
              rows={4}
              value={tTasks}
              onChange={(e) => setTTasks(e.target.value)}
              placeholder="One task per line"
            />
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">
              Save template
            </button>
          </form>
        </div>

        <div className={adminCardClass}>
          <h2 className="text-base font-semibold text-slate-100 mb-2">Start onboarding</h2>
          <form onSubmit={startRun} className="space-y-2">
            <select
              className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
              value={runTpl}
              onChange={(e) => setRunTpl(e.target.value)}
            >
              <option value="">No template (single placeholder task)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
              value={runKind}
              onChange={(e) => {
                setRunKind(e.target.value as 'teacher' | 'other_staff');
                setRunStaff('');
              }}
            >
              <option value="teacher">Teacher</option>
              <option value="other_staff">Other staff</option>
            </select>
            <select
              className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
              value={runStaff}
              onChange={(e) => setRunStaff(e.target.value)}
            >
              <option value="">Select person</option>
              {runKind === 'teacher'
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
            <button type="submit" className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white">
              Start run
            </button>
          </form>
        </div>
      </div>

      <div className={adminCardClass}>
        <h2 className="text-base font-semibold text-slate-100 mb-2">Active & recent runs</h2>
        <ul className="space-y-1 text-sm text-slate-200">
          {runs.map((r) => (
            <li key={r.id} className="flex justify-between gap-2 border-b border-white/5 py-1">
              <span>{staffLabel(r)}</span>
              <span className="text-slate-400">
                {r.status} — {new Date(r.started_at).toLocaleDateString()}
              </span>
            </li>
          ))}
          {runs.length === 0 && <li className="text-slate-500">No runs yet.</li>}
        </ul>
      </div>
    </AdminPageWrapper>
  );
}
