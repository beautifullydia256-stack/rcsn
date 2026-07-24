import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';
import { useAuthStore } from '@/store/authStore';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardDarkOnly } from '@/lib/designDashboardHtml';
import { useTeacherContext } from './useTeacherContext';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { formatTimetableTime, timetableIndexToDayName } from '@/lib/timetableDay';

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
  class_name: string;
  attendance_date: string;
  created_at: string;
};

async function fetchTeacherDashboardData(
  schoolId: string,
  teacherId: string | null,
  classNames: string[],
  userId: string,
  userEmail: string | undefined
) {
  const displayName = await fetchUserDisplayName(userId);
  const today = schoolCalendarTodayIso();
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
  if (teacherId && schoolId) {
    const dayName = timetableIndexToDayName(dbDay);
    if (dayName) {
      const { data: tdata } = await supabase
        .from('timetable_periods')
        .select('class_name, subject, start_time, end_time')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacherId)
        .eq('day_of_week', dayName)
        .order('start_time');
      const raw = (tdata as TimetableRow[]) ?? [];
      timetableToday = raw.map((r) => ({
        class_name: r.class_name,
        subject: r.subject,
        start_time: formatTimetableTime(r.start_time),
        end_time: formatTimetableTime(r.end_time),
        room: r.room,
      }));
    }
  }

  let attendRows: { present?: boolean; status?: string | null }[] = [];
  if (classNames.length > 0) {
    let q = supabase
      .from('student_attendance')
      .select('present, status')
      .eq('school_id', schoolId)
      .eq('attendance_date', today)
      .in('class_name', classNames);
    const a = await q;
    attendRows = (a.data as { present?: boolean; status?: string | null }[]) || [];
  }

  const present = attendRows.filter((r) => studentAttendanceRowIsPresent(r)).length;
  const attendPct = attendRows.length ? Math.round((present / attendRows.length) * 100) : 0;

  // Attendance is stored per-student, so a single "take attendance" action produces one row
  // per student in the class. Recent Activity should read as one entry per action a teacher
  // took, not one entry per student — pull a wider raw batch and collapse to one entry per
  // (class, date) session, keeping only the most recent 5 sessions.
  let recentAtt: AttActivity[] = [];
  if (classNames.length > 0) {
    const { data: adata } = await supabase
      .from('student_attendance')
      .select('class_name, attendance_date, created_at')
      .eq('school_id', schoolId)
      .in('class_name', classNames)
      .order('created_at', { ascending: false })
      .limit(1000);
    const raw = (adata as { class_name: string; attendance_date: string; created_at: string }[]) ?? [];
    const sessions = new Map<string, AttActivity>();
    for (const r of raw) {
      const key = `${r.class_name}|${r.attendance_date}`;
      const existing = sessions.get(key);
      if (!existing || r.created_at > existing.created_at) {
        sessions.set(key, { class_name: r.class_name, attendance_date: r.attendance_date, created_at: r.created_at });
      }
    }
    recentAtt = Array.from(sessions.values())
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5);
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
    presentCount: present,
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
  set(
    '[data-kpi="attend-badge"]',
    d.attendRows.length ? `${d.presentCount} / ${d.attendRows.length} present (${d.attendPct}%)` : 'No records'
  );

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
  set(
    '[data-kpi="attendance-today"]',
    d.attendRows.length ? `${d.presentCount} / ${d.attendRows.length}` : '—'
  );
  set(
    '[data-kpi="attend-sub"]',
    d.attendRows.length
      ? `${d.attendPct}% present · ${d.studentsCount} on your class register${d.studentsCount ? ` (${d.attendRows.length} marked today)` : ''}`
      : 'No attendance today'
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
          const initial = cn.replace(/[^A-Za-z0-9]/g, '').slice(0, 1) || '📚';
          return `
              <div class="pt-class-row" data-nav="/dashboard/teacher/classes">
                <div class="pt-class-av" style="background:${grad(i)}">${initial}</div>
                <div style="flex:1">
                  <div class="pt-class-name">${esc(cn)}</div>
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
          const when = formatDue(r.attendance_date);
          return `
            <div class="pt-act-row" data-nav="/dashboard/teacher/attendance">
              <div class="pt-act-av" style="background:${grad(i)}">✓</div>
              <div><div class="pt-act-text">Took attendance for ${esc(r.class_name)}</div><div class="pt-act-time">${esc(when)}</div></div>
            </div>`;
        })
        .join('');
    }
  }
}

/** Matches historical cache prefix `['teacher', 'design-dashboard', …]` (no longer includes class list in key). */
const DASH_QUERY_SEGMENT = 'design-dashboard' as const;

type PunchState = {
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: string | null;
} | null;

function formatPunchTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Kampala' });
  } catch {
    // Manual EAT (+3h) fallback when Intl timezone data unavailable
    const eat = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000);
    const h = eat.getUTCHours();
    const m = eat.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }
}

function applyPunchBar(el: HTMLElement, state: PunchState, busy: boolean) {
  const bar = el.querySelector('#pt-punch-bar') as HTMLElement | null;
  const iconEl = el.querySelector('#pt-punch-icon') as HTMLElement | null;
  const statusEl = el.querySelector('#pt-punch-status-text') as HTMLElement | null;
  const subEl = el.querySelector('#pt-punch-status-sub') as HTMLElement | null;

  if (!bar) return;
  bar.style.display = 'block';

  if (state?.punch_in_time && state.punch_out_time) {
    if (iconEl) iconEl.textContent = '✅';
    if (statusEl) statusEl.textContent = 'Signed out — attendance complete';
    if (subEl) subEl.textContent = `In: ${formatPunchTime(state.punch_in_time)} · Out: ${formatPunchTime(state.punch_out_time)}`;
  } else if (state?.punch_in_time) {
    if (iconEl) iconEl.textContent = '🟢';
    if (statusEl) statusEl.textContent = `Punched in at ${formatPunchTime(state.punch_in_time)}${state.status === 'late' ? ' (Late)' : ''}`;
    if (subEl) subEl.textContent = 'You are currently signed in. Punch out when you leave.';
  } else {
    if (iconEl) iconEl.textContent = '⏰';
    if (statusEl) statusEl.textContent = "You haven't punched in today";
    if (subEl) subEl.textContent = 'Use Punch In when you arrive at school.';
  }

  const punchInBtn = el.querySelector('#pt-punch-in-btn') as HTMLElement | null;
  const punchOutBtn = el.querySelector('#pt-punch-out-btn') as HTMLElement | null;
  const useCodeBtn = el.querySelector('#pt-use-code-btn') as HTMLElement | null;

  if (punchInBtn) {
    const done = !!state?.punch_in_time;
    punchInBtn.style.display = done ? 'none' : 'flex';
    if (!done) {
      punchInBtn.style.opacity = busy ? '0.45' : '1';
      punchInBtn.style.pointerEvents = busy ? 'none' : 'auto';
    }
  }
  if (punchOutBtn) {
    const notYetIn = !state?.punch_in_time;
    punchOutBtn.style.display = notYetIn ? 'none' : 'flex';
    if (!notYetIn) {
      const allDone = !!state?.punch_out_time;
      punchOutBtn.style.opacity = allDone || busy ? '0.45' : '1';
      punchOutBtn.style.pointerEvents = allDone || busy ? 'none' : 'auto';
    }
  }
  if (useCodeBtn) {
    const allDone = !!state?.punch_in_time && !!state.punch_out_time;
    useCodeBtn.style.display = allDone || busy ? 'none' : 'flex';
  }
}

function showPunchToast(el: HTMLElement, message: string, isError = false) {
  const toast = el.querySelector('#pt-punch-toast') as HTMLElement | null;
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = isError ? '#ef4444' : 'var(--indigo)';
  toast.style.display = 'block';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 4000);
}

// ── Futuristic scan modal ────────────────────────────────────────────────────

const SCAN_MODAL_ID = 'pt-scan-overlay';
const SCAN_STYLE_ID = 'pt-scan-style';

function ensureScanStyles() {
  if (document.getElementById(SCAN_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = SCAN_STYLE_ID;
  s.textContent = `
    #${SCAN_MODAL_ID} {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(2,6,23,0.82);
      backdrop-filter: blur(10px) saturate(160%);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.22s ease;
    }
    #${SCAN_MODAL_ID}.ptso-in { opacity: 1; }
    .ptso-card {
      background: linear-gradient(145deg, rgba(15,23,42,0.97), rgba(23,37,65,0.97));
      border: 1px solid rgba(99,179,237,0.25);
      border-radius: 28px;
      padding: 44px 52px 36px;
      text-align: center;
      min-width: 290px;
      max-width: 340px;
      box-shadow: 0 0 0 1px rgba(99,179,237,0.08), 0 32px 80px rgba(0,0,0,0.6), 0 0 80px rgba(56,189,248,0.06);
      transform: translateY(8px) scale(0.97);
      transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1);
    }
    #${SCAN_MODAL_ID}.ptso-in .ptso-card { transform: translateY(0) scale(1); }
    .ptso-ring-wrap {
      width: 100px; height: 100px;
      position: relative;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 28px;
    }
    @keyframes ptso-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes ptso-pulse {
      0%   { transform: scale(1); opacity: 0.55; }
      70%  { transform: scale(2.1); opacity: 0; }
      100% { transform: scale(2.1); opacity: 0; }
    }
    @keyframes ptso-pop {
      0%   { transform: scale(0.6); opacity: 0; }
      65%  { transform: scale(1.18); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes ptso-scanner {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .ptso-ring-spin {
      position: absolute; inset: 0;
      border-radius: 50%;
      border: 3px solid transparent;
      border-top-color: #63b3ed;
      border-right-color: rgba(99,179,237,0.4);
      animation: ptso-spin 0.9s linear infinite;
    }
    .ptso-ring-spin-2 {
      position: absolute; inset: 8px;
      border-radius: 50%;
      border: 2px solid transparent;
      border-bottom-color: #38bdf8;
      border-left-color: rgba(56,189,248,0.3);
      animation: ptso-spin 1.4s linear infinite reverse;
    }
    .ptso-ring-pulse {
      position: absolute; inset: 18px;
      border-radius: 50%;
      background: rgba(99,179,237,0.18);
      animation: ptso-pulse 1.6s ease-out infinite;
    }
    .ptso-icon {
      font-size: 30px; position: relative; z-index: 1;
      filter: drop-shadow(0 0 8px rgba(99,179,237,0.6));
    }
    .ptso-confirmed .ptso-ring-spin,
    .ptso-confirmed .ptso-ring-spin-2,
    .ptso-confirmed .ptso-ring-pulse { display: none; }
    .ptso-confirmed .ptso-ring-wrap { animation: ptso-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .ptso-confirmed .ptso-icon { filter: drop-shadow(0 0 12px rgba(52,211,153,0.8)); }
    .ptso-error .ptso-ring-spin { border-top-color: #f87171; border-right-color: rgba(248,113,113,0.3); }
    .ptso-error .ptso-ring-spin-2 { border-bottom-color: #f87171; border-left-color: rgba(248,113,113,0.3); }
    .ptso-phase {
      font-size: 10px; font-weight: 800;
      letter-spacing: 0.2em; text-transform: uppercase;
      color: #63b3ed; margin-bottom: 8px;
    }
    .ptso-confirmed .ptso-phase { color: #34d399; }
    .ptso-error .ptso-phase { color: #f87171; }
    .ptso-title {
      font-size: 22px; font-weight: 700;
      color: #f0f9ff; margin-bottom: 6px;
      letter-spacing: -0.02em;
    }
    .ptso-sub {
      font-size: 13px; line-height: 1.5;
      color: rgba(186,230,253,0.65);
    }
    .ptso-dismiss {
      margin-top: 24px;
      background: rgba(248,113,113,0.12);
      border: 1px solid rgba(248,113,113,0.35);
      color: #fca5a5;
      padding: 9px 28px; border-radius: 99px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; letter-spacing: 0.03em;
      transition: background 0.15s;
    }
    .ptso-dismiss:hover { background: rgba(248,113,113,0.2); }
    .ptso-dots::after {
      content: '';
      animation: ptso-dot-cycle 1.4s steps(4, end) infinite;
    }
    @keyframes ptso-dot-cycle {
      0%   { content: ''; }
      25%  { content: '.'; }
      50%  { content: '..'; }
      75%  { content: '...'; }
      100% { content: ''; }
    }
  `;
  document.head.appendChild(s);
}

type ScanPhase = 'detecting' | 'confirming' | 'confirmed' | 'error';

function showScanModal(phase: ScanPhase, detail?: string, onDismiss?: () => void, onUseCode?: () => void) {
  ensureScanStyles();

  let overlay = document.getElementById(SCAN_MODAL_ID) as HTMLElement | null;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = SCAN_MODAL_ID;
    overlay.innerHTML = `
      <div class="ptso-card" id="ptso-card">
        <div class="ptso-ring-wrap">
          <div class="ptso-ring-pulse"></div>
          <div class="ptso-ring-spin"></div>
          <div class="ptso-ring-spin-2"></div>
          <span class="ptso-icon" id="ptso-icon">📡</span>
        </div>
        <div class="ptso-phase" id="ptso-phase">INITIALIZING</div>
        <div class="ptso-title" id="ptso-title">Please wait<span class="ptso-dots"></span></div>
        <div class="ptso-sub" id="ptso-sub"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay!.classList.add('ptso-in'));
  }

  const card = overlay.querySelector('#ptso-card') as HTMLElement;
  const iconEl = overlay.querySelector('#ptso-icon') as HTMLElement;
  const phaseEl = overlay.querySelector('#ptso-phase') as HTMLElement;
  const titleEl = overlay.querySelector('#ptso-title') as HTMLElement;
  const subEl = overlay.querySelector('#ptso-sub') as HTMLElement;

  card.classList.remove('ptso-confirmed', 'ptso-error');
  overlay.querySelector('.ptso-dismiss')?.remove();

  const setDots = (on: boolean) => {
    const dots = titleEl.querySelector('.ptso-dots');
    if (on && !dots) { const d = document.createElement('span'); d.className = 'ptso-dots'; titleEl.appendChild(d); }
    if (!on) dots?.remove();
  };

  if (phase === 'detecting') {
    iconEl.textContent = '📡';
    phaseEl.textContent = 'STEP 1 OF 2 · DETECTING';
    titleEl.childNodes[0]!.textContent = 'Locating You';
    setDots(true);
    subEl.textContent = 'Acquiring GPS signal…';
  } else if (phase === 'confirming') {
    iconEl.textContent = '🛰️';
    phaseEl.textContent = 'STEP 2 OF 2 · CONFIRMING';
    titleEl.childNodes[0]!.textContent = 'Verifying Presence';
    setDots(true);
    subEl.textContent = 'Checking school boundary…';
  } else if (phase === 'confirmed') {
    card.classList.add('ptso-confirmed');
    iconEl.textContent = '✅';
    phaseEl.textContent = 'ACCESS GRANTED';
    titleEl.childNodes[0]!.textContent = 'Confirmed';
    setDots(false);
    subEl.textContent = detail || '';
  } else {
    card.classList.add('ptso-error');
    iconEl.textContent = '⚠️';
    phaseEl.textContent = 'VERIFICATION FAILED';
    titleEl.childNodes[0]!.textContent = 'Could Not Confirm';
    setDots(false);
    subEl.textContent = detail || 'An error occurred. Please try again.';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'margin-top:24px;display:flex;flex-direction:column;gap:10px;';

    if (onUseCode) {
      const codeBtn = document.createElement('button');
      codeBtn.className = 'ptso-dismiss';
      codeBtn.style.cssText = 'background:rgba(16,185,129,0.12);border-color:rgba(16,185,129,0.35);color:#34d399;';
      codeBtn.textContent = '🔑 Use Attendance Code';
      codeBtn.onclick = () => { hideScanModal(); onDismiss?.(); onUseCode(); };
      btnRow.appendChild(codeBtn);
    }

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'ptso-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.onclick = () => { hideScanModal(); onDismiss?.(); };
    btnRow.appendChild(dismissBtn);

    card.appendChild(btnRow);
  }
}

function hideScanModal(delayMs = 0) {
  const overlay = document.getElementById(SCAN_MODAL_ID);
  if (!overlay) return;
  setTimeout(() => {
    overlay.classList.remove('ptso-in');
    setTimeout(() => overlay.remove(), 250);
  }, delayMs);
}

export default function DesignTeacherDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const shellApplied = useRef(false);
  const htmlReady = true;
  const punchBusyRef = useRef(false);
  const punchStateRef = useRef<PunchState>(null);
  const [codeModal, setCodeModal] = useState<{ action: 'in' | 'out' } | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const openCodeModalRef = useRef<((action: 'in' | 'out') => void) | null>(null);

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

  const prevContextSig = useRef<string | null>(null);
  useEffect(() => {
    if (!schoolId || !user?.id || ctxLoading) return;
    if (prevContextSig.current === contextReadySig) return;
    prevContextSig.current = contextReadySig;
    void queryClient.invalidateQueries({ queryKey: dashQueryKey });
  }, [contextReadySig, ctxLoading, schoolId, user?.id, queryClient, dashQueryKey]);

  const cachedDash = queryClient.getQueryData<TeacherDashSnapshot>(dashQueryKey);
  const effectiveDash = dashData ?? cachedDash ?? undefined;

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

  /** Load today's punch state once dashboard mounts. */
  useEffect(() => {
    if (!schoolId || !teacherId) return;
    fetch(registerApiUrl(`/api/teacher/punch?schoolId=${encodeURIComponent(schoolId)}&teacherId=${encodeURIComponent(teacherId)}`))
      .then((r) => r.json())
      .then((json) => {
        punchStateRef.current = json.today ?? null;
        const el = containerRef.current;
        if (el) applyPunchBar(el, punchStateRef.current, false);
      })
      .catch(() => {});
  }, [schoolId, teacherId]);

  // Keep the ref in sync so DOM event listeners can open the React modal.
  // Must be before any conditional returns.
  useEffect(() => {
    openCodeModalRef.current = (action: 'in' | 'out') => {
      setCodeInput('');
      setCodeError('');
      setCodeModal({ action });
    };
  }, []);

  const handleCodeSubmit = useCallback(async () => {
    if (!schoolId || !teacherId || !codeModal) return;
    setCodeBusy(true);
    setCodeError('');
    try {
      const resp = await fetch(registerApiUrl('/api/teacher/punch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: codeModal.action, schoolId, teacherId, attendanceCode: codeInput.replace(/\s/g, '') }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.success === false) {
        setCodeError(json.error || 'Invalid code. Please try again.');
      } else {
        setCodeModal(null);
        const time = formatPunchTime(json.punchTime);
        punchStateRef.current = codeModal.action === 'in'
          ? { punch_in_time: json.punchTime, punch_out_time: null, status: json.status ?? 'present' }
          : { ...(punchStateRef.current ?? { punch_in_time: null, status: null }), punch_out_time: json.punchTime };
        const el = containerRef.current;
        if (el) applyPunchBar(el, punchStateRef.current, false);
        showScanModal('confirmed', codeModal.action === 'in'
          ? `Punched in at ${time}${json.status === 'late' ? ' · Marked Late' : ''}`
          : `Punched out at ${time} · Have a great day!`);
        hideScanModal(2000);
      }
    } catch {
      setCodeError('Network error. Please try again.');
    } finally {
      setCodeBusy(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, teacherId, codeModal, codeInput]);

  /** Wire punch buttons after shell is applied. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePunch = async (action: 'in' | 'out') => {
      if (punchBusyRef.current) return;
      if (!schoolId || !teacherId) {
        showScanModal('error', 'Teacher profile not linked. Contact your administrator.');
        return;
      }
      punchBusyRef.current = true;
      applyPunchBar(el, punchStateRef.current, true);

      // Phase 1 — Detecting location
      showScanModal('detecting');

      let latitude: number | null = null;
      let longitude: number | null = null;
      let accuracy: number | null = null;

      const resetPunch = () => {
        punchBusyRef.current = false;
        applyPunchBar(el, punchStateRef.current, false);
      };
      const openCode = () => openCodeModalRef.current?.(action);

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 0 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        accuracy = pos.coords.accuracy;
      } catch {
        showScanModal('error', 'Location access denied. Enable GPS or use the attendance code.', resetPunch, openCode);
        return;
      }

      // Phase 2 — Confirming with server
      showScanModal('confirming');
      await new Promise<void>((r) => setTimeout(r, 500));

      try {
        const resp = await fetch(registerApiUrl('/api/teacher/punch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, schoolId, teacherId, latitude, longitude, accuracy }),
        });
        const json = await resp.json().catch(() => ({}));

        if (!resp.ok || json.success === false) {
          if (json.locationNotConfigured) {
            showScanModal('error', 'School boundary not configured. Ask your administrator to set up the location in Settings → Location.', resetPunch, openCode);
            return;
          }
          const useCode = json.isAtSchool === false ? openCode : undefined;
          showScanModal('error', json.error || `Could not punch ${action}`, resetPunch, useCode);
        } else {
          const time = formatPunchTime(json.punchTime);
          const detail = action === 'in'
            ? `Punched in at ${time}${json.status === 'late' ? ' · Marked Late' : ''}`
            : `Punched out at ${time} · Have a great day!`;

          punchStateRef.current = action === 'in'
            ? { punch_in_time: json.punchTime, punch_out_time: null, status: json.status ?? 'present' }
            : { ...(punchStateRef.current ?? { punch_in_time: null, status: null }), punch_out_time: json.punchTime };

          // Phase 3 — Confirmed
          showScanModal('confirmed', detail);
          hideScanModal(2000);
          setTimeout(() => {
            punchBusyRef.current = false;
            applyPunchBar(el, punchStateRef.current, false);
          }, 2200);
        }
      } catch {
        showScanModal('error', 'Network error. Please check your connection and try again.', resetPunch, openCode);
      }
    };

    const inBtn = el.querySelector('#pt-punch-in-btn');
    const outBtn = el.querySelector('#pt-punch-out-btn');
    const codeBtn = el.querySelector('#pt-use-code-btn');

    const onIn = () => void handlePunch('in');
    const onOut = () => void handlePunch('out');
    const onCode = () => {
      const state = punchStateRef.current;
      const action: 'in' | 'out' = state?.punch_in_time && !state.punch_out_time ? 'out' : 'in';
      openCodeModalRef.current?.(action);
    };

    inBtn?.addEventListener('click', onIn);
    outBtn?.addEventListener('click', onOut);
    codeBtn?.addEventListener('click', onCode);

    return () => {
      inBtn?.removeEventListener('click', onIn);
      outBtn?.removeEventListener('click', onOut);
      codeBtn?.removeEventListener('click', onCode);
    };
  });

  useLayoutEffect(() => {
    if (!htmlReady || !schoolId || !effectiveDash) return;
    const el = containerRef.current;
    if (!el) return;

    if (!shellApplied.current) {
      el.innerHTML = BODY_HTML;
      shellApplied.current = true;
      applyPunchBar(el, punchStateRef.current, false);
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

      {/* Attendance code input dialog */}
      {codeModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(2,6,23,0.82)',
            backdropFilter: 'blur(10px) saturate(160%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setCodeModal(null); punchBusyRef.current = false; const el = containerRef.current; if (el) applyPunchBar(el, punchStateRef.current, false); } }}
        >
          <div style={{
            background: 'linear-gradient(145deg, rgba(15,23,42,0.97), rgba(23,37,65,0.97))',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 28, padding: '40px 36px 32px',
            textAlign: 'center', minWidth: 300, maxWidth: 360,
            boxShadow: '0 0 0 1px rgba(16,185,129,0.08), 0 32px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(16,185,129,0.8)', marginBottom: 8 }}>
              Attendance Verification
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f9ff', marginBottom: 6 }}>
              Enter the code
            </div>
            <div style={{ fontSize: 13, color: 'rgba(186,230,253,0.65)', marginBottom: 24, lineHeight: 1.5 }}>
              Ask the secretary or administrator for the current 6-digit attendance code.
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={7}
              placeholder="_ _ _ _ _ _"
              value={codeInput}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                setCodeInput(v);
                setCodeError('');
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && codeInput.length === 6) void handleCodeSubmit(); }}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.06)',
                border: `1.5px solid ${codeError ? 'rgba(248,113,113,0.5)' : 'rgba(16,185,129,0.3)'}`,
                borderRadius: 12, padding: '14px 16px',
                fontSize: 28, fontWeight: 700, textAlign: 'center',
                color: '#f0f9ff', letterSpacing: '0.25em',
                fontFamily: "'Geist Mono', monospace",
                outline: 'none', marginBottom: 8,
              }}
            />
            {codeError && (
              <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{codeError}</div>
            )}
            <button
              type="button"
              disabled={codeInput.length !== 6 || codeBusy}
              onClick={() => void handleCodeSubmit()}
              style={{
                width: '100%', padding: '13px 0',
                background: codeInput.length === 6 && !codeBusy ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.07)',
                border: 'none', borderRadius: 12,
                color: codeInput.length === 6 && !codeBusy ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: 15, fontWeight: 700, cursor: codeInput.length === 6 && !codeBusy ? 'pointer' : 'default',
                marginBottom: 10, transition: 'all 0.2s',
              }}
            >
              {codeBusy ? 'Verifying…' : `Punch ${codeModal.action === 'in' ? 'In' : 'Out'}`}
            </button>
            <button
              type="button"
              onClick={() => { setCodeModal(null); punchBusyRef.current = false; const el = containerRef.current; if (el) applyPunchBar(el, punchStateRef.current, false); }}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(186,230,253,0.5)', fontSize: 13,
                cursor: 'pointer', padding: '6px 0',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
