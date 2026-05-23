import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
  class_name?: string;
  present?: boolean;
  status?: string | null;
  date?: string;
  attendance_date?: string | null;
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

  let recentAtt: AttActivity[] = [];
  if (classNames.length > 0) {
    const { data: adata } = await supabase
      .from('student_attendance')
      .select('class_name, present, status, date, attendance_date, created_at')
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
          const st = String(r.status || '').toLowerCase();
          const status =
            st === 'late'
              ? 'Late'
              : st === 'excused'
                ? 'Excused'
                : studentAttendanceRowIsPresent(r)
                  ? 'Present'
                  : st === 'absent' || r.present === false
                    ? 'Absent'
                    : 'Recorded';
          const when =
            r.attendance_date || r.date || (r.created_at ? r.created_at.slice(0, 10) : '—');
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

type PunchState = {
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: string | null;
} | null;

function formatPunchTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return iso.slice(11, 16);
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

  if (punchInBtn) {
    const done = !!state?.punch_in_time;
    punchInBtn.style.opacity = done || busy ? '0.45' : '1';
    punchInBtn.style.pointerEvents = done || busy ? 'none' : 'auto';
  }
  if (punchOutBtn) {
    const canOut = !!state?.punch_in_time && !state.punch_out_time;
    punchOutBtn.style.opacity = !canOut || busy ? '0.45' : '1';
    punchOutBtn.style.pointerEvents = !canOut || busy ? 'none' : 'auto';
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

function showScanModal(phase: ScanPhase, detail?: string, onDismiss?: () => void) {
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
    const btn = document.createElement('button');
    btn.className = 'ptso-dismiss';
    btn.textContent = 'Dismiss';
    btn.onclick = () => { hideScanModal(); onDismiss?.(); };
    card.appendChild(btn);
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
    fetch(`/api/teacher/punch?schoolId=${encodeURIComponent(schoolId)}&teacherId=${encodeURIComponent(teacherId)}`)
      .then((r) => r.json())
      .then((json) => {
        punchStateRef.current = json.today ?? null;
        const el = containerRef.current;
        if (el) applyPunchBar(el, punchStateRef.current, false);
      })
      .catch(() => {});
  }, [schoolId, teacherId]);

  /** Wire punch buttons after shell is applied. */
  const wirePunchButtons = useEffect;
  wirePunchButtons(() => {
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

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 0 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        showScanModal('error', 'Location access denied. Please enable GPS and try again.', () => {
          punchBusyRef.current = false;
          applyPunchBar(el, punchStateRef.current, false);
        });
        return;
      }

      // Phase 2 — Confirming with server
      showScanModal('confirming');
      await new Promise<void>((r) => setTimeout(r, 500));

      try {
        const resp = await fetch('/api/teacher/punch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, schoolId, teacherId, latitude, longitude }),
        });
        const json = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          showScanModal('error', json.error || `Could not punch ${action}`, () => {
            punchBusyRef.current = false;
            applyPunchBar(el, punchStateRef.current, false);
          });
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
        showScanModal('error', 'Network error. Please check your connection and try again.', () => {
          punchBusyRef.current = false;
          applyPunchBar(el, punchStateRef.current, false);
        });
      }
    };

    const inBtn = el.querySelector('#pt-punch-in-btn');
    const outBtn = el.querySelector('#pt-punch-out-btn');

    const onIn = () => void handlePunch('in');
    const onOut = () => void handlePunch('out');

    inBtn?.addEventListener('click', onIn);
    outBtn?.addEventListener('click', onOut);

    return () => {
      inBtn?.removeEventListener('click', onIn);
      outBtn?.removeEventListener('click', onOut);
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
    </>
  );
}
