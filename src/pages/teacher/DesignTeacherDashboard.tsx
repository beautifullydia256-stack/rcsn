import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardDarkOnly } from '@/lib/designDashboardHtml';
import { useTeacherContext } from './useTeacherContext';

import designRaw from '../../../new designs/pwezacore-teacher-dashboard-react.html?raw';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

const GRADIENTS = [
  'linear-gradient(135deg,#4f8ef7,#38bdf8)',
  'linear-gradient(135deg,#10d9a8,#4f8ef7)',
  'linear-gradient(135deg,#8b5cf6,#4f8ef7)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#22c55e,#10d9a8)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Monday = 0 … Sunday = 6 (matches `timetables.day_of_week`). */
function todayDbDayOfWeek(): number {
  const js = new Date().getDay();
  return (js + 6) % 7;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '—';
  return t.slice(0, 5);
}

function formatDue(d: string): string {
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

async function fetchUserDisplayName(userId: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('name').eq('user_id', userId).maybeSingle();
  return (data as { name?: string } | null)?.name?.trim() || null;
}

type TimetableRow = {
  class_name: string;
  subject: string;
  start_time: string;
  end_time: string;
  room?: string | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  due_date: string;
  class_name: string;
  subject: string;
};

type AttActivity = {
  class_name?: string;
  present?: boolean;
  date?: string;
  created_at?: string;
};

async function fetchTeacherDashboardData(
  schoolId: string,
  teacherId: string | null,
  classNames: string[],
  userId: string,
  userEmail: string | undefined
) {
  const displayName = await fetchUserDisplayName(userId);
  const today = new Date().toISOString().slice(0, 10);
  const dbDay = todayDbDayOfWeek();

  const rawFirst =
    displayName?.split(/\s+/)[0] ||
    userEmail?.split('@')[0] ||
    'Teacher';
  const firstName = rawFirst.toUpperCase();

  let studentsCount = 0;
  if (teacherId && classNames.length > 0) {
    const { count } = await supabase
      .from('students')
      .select('student_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .in('current_class', classNames);
    studentsCount = count ?? 0;
  }

  let openAssignments = 0;
  let dueTodayCount = 0;
  let assignmentRows: AssignmentRow[] = [];
  let pendingSubmissionCount = 0;

  if (teacherId) {
    const { count: openC } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .gte('due_date', today);
    openAssignments = openC ?? 0;

    const { count: dueC } = await supabase
      .from('assignments')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .eq('due_date', today);
    dueTodayCount = dueC ?? 0;

    const { data: assigns } = await supabase
      .from('assignments')
      .select('id,title,due_date,class_name,subject')
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(12);
    assignmentRows = (assigns as AssignmentRow[]) ?? [];

    const { data: aidRows } = await supabase
      .from('assignments')
      .select('id')
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId);
    const ids = ((aidRows as { id: string }[]) ?? []).map((r) => r.id);
    if (ids.length > 0) {
      const { count: pend } = await supabase
        .from('assignment_submissions')
        .select('id', { count: 'exact', head: true })
        .in('assignment_id', ids)
        .in('status', ['submitted', 'late']);
      pendingSubmissionCount = pend ?? 0;
    }
  }

  let timetableToday: TimetableRow[] = [];
  if (teacherId) {
    const { data: tdata } = await supabase
      .from('timetables')
      .select('class_name, subject, start_time, end_time, room')
      .eq('teacher_id', teacherId)
      .eq('day_of_week', dbDay)
      .order('start_time');
    timetableToday = (tdata as TimetableRow[]) ?? [];
  }

  let attendRows: { present?: boolean }[] = [];
  if (classNames.length > 0) {
    let q = supabase
      .from('student_attendance')
      .select('present')
      .eq('school_id', schoolId)
      .eq('date', today)
      .in('class_name', classNames);
    const a = await q;
    attendRows = (a.data as { present?: boolean }[]) || [];
  }

  const present = attendRows.filter((r) => r.present === true).length;
  const attendPct = attendRows.length ? Math.round((present / attendRows.length) * 100) : 0;

  let recentAtt: AttActivity[] = [];
  if (classNames.length > 0) {
    const { data: adata } = await supabase
      .from('student_attendance')
      .select('class_name, present, date, created_at')
      .eq('school_id', schoolId)
      .in('class_name', classNames)
      .order('created_at', { ascending: false })
      .limit(10);
    recentAtt = (adata as AttActivity[]) ?? [];
  }

  const assignProgPct = Math.min(100, pendingSubmissionCount * 18);

  return {
    today,
    firstName,
    studentsCount,
    openAssignments,
    dueTodayCount,
    assignmentRows,
    pendingSubmissionCount,
    timetableToday,
    attendRows,
    attendPct,
    recentAtt,
    assignProgPct,
  };
}

export type TeacherDashSnapshot = Awaited<ReturnType<typeof fetchTeacherDashboardData>>;

/** Imperative DOM paint (HTML template + data). Kept out of render so React never clobbers filled nodes via dangerouslySetInnerHTML. */
function applyTeacherDashboardPaint(
  el: HTMLElement,
  d: TeacherDashSnapshot,
  classNames: string[],
  teacherId: string | null,
  subjectsByClass: Map<string, string[]>
) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

  const dateLine = new Date().toLocaleDateString('en-UG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const subLine =
    classNames.length === 0
      ? 'You have no classes assigned yet. Ask your administrator to link your timetable and classes.'
      : `You teach ${classNames.length} class${classNames.length === 1 ? '' : 'es'} with ${d.studentsCount} active student${
          d.studentsCount === 1 ? '' : 's'
        } across your timetable.`;

  const set = (sel: string, val: string) => {
    const n = el.querySelector(sel);
    if (n) n.textContent = val;
  };

  set('#pt-greeting', `${greet}, ${d.firstName}`);
  set('#pt-date-line', dateLine);
  set('#pt-sub-line', subLine);

  set('[data-kpi="classes-badge"]', `${classNames.length} class${classNames.length === 1 ? '' : 'es'}`);
  set('[data-kpi="students-badge"]', String(d.studentsCount));
  set('[data-kpi="assign-badge"]', d.dueTodayCount > 0 ? `${d.dueTodayCount} due today` : `${d.openAssignments} open`);
  set('[data-kpi="attend-badge"]', d.attendRows.length ? `${d.attendPct}% present` : 'No records');

  set('[data-kpi="total-classes"]', String(classNames.length));
  set('[data-kpi="total-students"]', String(d.studentsCount));
  set('[data-kpi="open-assignments"]', String(d.openAssignments));
  set('[data-kpi="classes-sub"]', classNames.length ? 'Assigned to you this term' : 'None assigned');
  set(
    '[data-kpi="students-sub"]',
    classNames.length ? `Across ${classNames.length} class${classNames.length === 1 ? '' : 'es'}` : '—'
  );
  set(
    '[data-kpi="assign-sub"]',
    d.pendingSubmissionCount > 0
      ? `${d.pendingSubmissionCount} submission${d.pendingSubmissionCount === 1 ? '' : 's'} to review`
      : d.openAssignments > 0
        ? 'No pending submissions'
        : 'No open assignments'
  );
  set('[data-kpi="attendance-today"]', d.attendRows.length ? `${d.attendPct}%` : '—');
  set(
    '[data-kpi="attend-sub"]',
    d.attendRows.length ? `${d.attendRows.length} record${d.attendRows.length === 1 ? '' : 's'} today` : 'No attendance today'
  );

  const prog = el.querySelector('[data-kpi-width="attend-progress"]') as HTMLElement | null;
  if (prog) prog.style.width = `${d.attendPct}%`;
  const progA = el.querySelector('[data-kpi-width="assign-progress"]') as HTMLElement | null;
  if (progA) progA.style.width = `${d.assignProgPct}%`;

  const classesList = el.querySelector('#pt-classes-list');
  if (classesList) {
    if (!classNames.length) {
      classesList.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">No classes assigned. Your administrator can link classes in staff settings.</div>`;
    } else {
      classesList.innerHTML = classNames
        .map((cn, i) => {
          const subs = subjectsByClass.get(cn)?.join(', ') || '—';
          const initial = subs.replace(/[^A-Za-z]/g, '').slice(0, 1) || '📚';
          return `
              <div class="pt-class-row" data-nav="/dashboard/teacher/classes">
                <div class="pt-class-av" style="background:${grad(i)}">${initial}</div>
                <div style="flex:1">
                  <div class="pt-class-name">${esc(cn)}</div>
                  <div class="pt-class-sub">${esc(subs)}</div>
                </div>
                <span class="pt-chip indigo">${subjectsByClass.get(cn)?.length ?? 0} subj.</span>
              </div>`;
        })
        .join('');
    }
  }

  const schedList = el.querySelector('#pt-schedule-list');
  if (schedList) {
    if (!d.timetableToday.length) {
      schedList.innerHTML = `
            <div class="pt-sched-row" data-nav="/dashboard/teacher/timetable">
              <div class="pt-sched-time"><div class="pt-sched-h">—</div><div class="pt-sched-ap">—</div></div>
              <div class="pt-sched-sep"></div>
              <div style="flex:1">
                <div class="pt-sched-subj">No periods scheduled today</div>
                <div class="pt-sched-meta">Your admin can add periods in the school timetable.</div>
              </div>
              <span class="pt-chip indigo">View</span>
            </div>`;
    } else {
      schedList.innerHTML = d.timetableToday
        .map((row) => {
          const start = formatTime(row.start_time);
          const end = formatTime(row.end_time);
          const h = parseInt(String(row.start_time).slice(0, 2), 10) || 0;
          const ap = h >= 12 ? 'PM' : 'AM';
          return `
            <div class="pt-sched-row" data-nav="/dashboard/teacher/timetable">
              <div class="pt-sched-time"><div class="pt-sched-h">${esc(start)}</div><div class="pt-sched-ap">${ap}</div></div>
              <div class="pt-sched-sep"></div>
              <div style="flex:1">
                <div class="pt-sched-subj">${esc(row.subject)}</div>
                <div class="pt-sched-meta">${esc(row.class_name)}${row.room ? ` · Room ${esc(row.room)}` : ''} · ${esc(start)}–${esc(end)}</div>
              </div>
              <span class="pt-chip indigo">Class</span>
            </div>`;
        })
        .join('');
    }
  }

  const assignList = el.querySelector('#pt-assignments-list');
  if (assignList) {
    if (!teacherId) {
      assignList.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">Your teacher profile is not linked. Contact the school administrator.</div>`;
    } else if (!d.assignmentRows.length) {
      assignList.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">No upcoming assignments. Create one from <span data-nav="/dashboard/teacher/assignments" style="cursor:pointer;color:var(--indigo);font-weight:600">Assignments</span>.</div>`;
    } else {
      assignList.innerHTML = d.assignmentRows
        .map((row) => {
          const due = formatDue(row.due_date);
          return `
            <div class="pt-assign-row" data-nav="/dashboard/teacher/assignments">
              <div style="flex:1;min-width:0">
                <div class="pt-assign-title">${esc(row.title)}</div>
                <div class="pt-assign-sub">${esc(row.class_name)} · ${esc(row.subject)} · Due ${esc(due)}</div>
              </div>
              <span class="pt-chip amber">${row.due_date === d.today ? 'Today' : 'Open'}</span>
            </div>`;
        })
        .join('');
    }
  }

  const actList = el.querySelector('#pt-activity-list');
  if (actList) {
    if (!d.recentAtt.length) {
      actList.innerHTML = `
            <div class="pt-act-row" data-nav="/dashboard/teacher/attendance">
              <div class="pt-act-av" style="background:${grad(0)}">·</div>
              <div><div class="pt-act-text">No recent attendance rows for your classes.</div><div class="pt-act-time">Take attendance to see history here.</div></div>
            </div>`;
    } else {
      actList.innerHTML = d.recentAtt
        .map((r, i) => {
          const status = r.present === true ? 'Present' : r.present === false ? 'Absent' : 'Recorded';
          const when = r.date || (r.created_at ? r.created_at.slice(0, 10) : '—');
          return `
            <div class="pt-act-row" data-nav="/dashboard/teacher/attendance">
              <div class="pt-act-av" style="background:${grad(i)}">✓</div>
              <div><div class="pt-act-text">${esc(r.class_name ?? 'Class')} — ${status}</div><div class="pt-act-time">${esc(when)}</div></div>
            </div>`;
        })
        .join('');
    }
  }
}

/** Matches historical cache prefix `['teacher', 'design-dashboard', …]` (no longer includes class list in key). */
const DASH_QUERY_SEGMENT = 'design-dashboard' as const;

export default function DesignTeacherDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  /** Ensures we assign the static shell HTML once per mount / identity change, not on every React re-render. */
  const shellApplied = useRef(false);
  const htmlReady = true;

  const user = useAuthStore((s) => s.user);
  const schoolId =
    useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const { teacherId, classNames, classesWithSubjects, isLoading: ctxLoading } = useTeacherContext();

  const classesKey = useMemo(() => [...classNames].sort().join('|'), [classNames]);
  const contextReadySig = `${teacherId ?? ''}|${classesKey}`;

  const dashQueryKey = useMemo(
    () => ['teacher', DASH_QUERY_SEGMENT, schoolId ?? '', user?.id ?? ''] as const,
    [schoolId, user?.id]
  );

  const subjectsByClass = useMemo(() => {
    const m = new Map<string, string[]>();
    classesWithSubjects.forEach((c) => m.set(c.class_name, c.subjects));
    return m;
  }, [classesWithSubjects]);

  const dashEnabled = !!schoolId && !!user && !ctxLoading;

  const {
    data: dashData,
    isPending: dashPending,
    isPlaceholderData: dashIsPlaceholder,
    isError: dashError,
    error: dashErr,
    refetch: refetchDash,
  } = useQuery({
    queryKey: dashQueryKey,
    queryFn: () =>
      fetchTeacherDashboardData(
        schoolId!,
        teacherId,
        classNames,
        user!.id,
        user?.email ?? undefined
      ),
    enabled: dashEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  /** When teacher/classes context changes, refetch dashboard so snapshot matches (stable cache key). */
  const prevContextSig = useRef<string | null>(null);
  useEffect(() => {
    if (!schoolId || !user?.id || ctxLoading) return;
    if (prevContextSig.current === contextReadySig) return;
    prevContextSig.current = contextReadySig;
    void queryClient.invalidateQueries({ queryKey: dashQueryKey });
  }, [contextReadySig, ctxLoading, schoolId, user?.id, queryClient, dashQueryKey]);

  const cachedDash = queryClient.getQueryData<TeacherDashSnapshot>(dashQueryKey);
  const effectiveDash = dashData ?? cachedDash ?? undefined;

  /** Never swap the whole page for a spinner once we can show data (including stale/previous) */
  const showDashboardLoader =
    !!schoolId &&
    !!user &&
    !effectiveDash &&
    !dashIsPlaceholder &&
    (ctxLoading || (dashEnabled && dashPending));

  useDesignDashboardNav(containerRef, navigate, htmlReady);
  useDesignDashboardDarkOnly(htmlReady);

  useEffect(() => {
    shellApplied.current = false;
  }, [schoolId, user?.id]);

  useLayoutEffect(() => {
    if (!htmlReady || !schoolId || !effectiveDash) return;
    const el = containerRef.current;
    if (!el) return;

    if (!shellApplied.current) {
      el.innerHTML = BODY_HTML;
      shellApplied.current = true;
    }
    applyTeacherDashboardPaint(el, effectiveDash, classNames, teacherId, subjectsByClass);
  }, [htmlReady, schoolId, effectiveDash, classNames, subjectsByClass, teacherId]);

  if (!schoolId || !user) {
    return null;
  }

  if (showDashboardLoader) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="ac-text-secondary text-sm">Loading dashboard…</p>
      </div>
    );
  }

  if (dashError && !effectiveDash) {
    const msg = dashErr instanceof Error ? dashErr.message : 'Could not load dashboard.';
    return (
      <div className="ac-glass-card mx-auto max-w-md p-8 text-center border border-[var(--ac-border)]">
        <p className="ac-text-primary mb-2 font-medium">Dashboard unavailable</p>
        <p className="ac-text-muted mb-4 text-sm">{msg}</p>
        <button
          type="button"
          className="ac-glass-btn-primary rounded-xl px-4 py-2 text-sm font-medium"
          onClick={() => void refetchDash()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!effectiveDash) {
    return null;
  }

  return (
    <>
      <style>{`${SCOPED_STYLE}\n#pt-greeting { text-transform: uppercase; letter-spacing: 0.02em; }\n.pw-teacher { min-height: auto !important; }\n`}</style>
      <div ref={containerRef} style={{ width: '100%', minHeight: '100%', display: 'block' }} />
    </>
  );
}
