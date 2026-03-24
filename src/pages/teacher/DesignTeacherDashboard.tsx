import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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

/** Monday = 0 … Sunday = 6 (matches `timetables.day_of_week` in TeacherTimetablePage). */
function todayDbDayOfWeek(): number {
  const js = new Date().getDay();
  return (js + 6) % 7;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return '—';
  const s = t.slice(0, 5);
  return s;
}

async function fetchUserDisplayName(userId: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('name').eq('user_id', userId).maybeSingle();
  return (data as { name?: string } | null)?.name?.trim() || null;
}

export default function DesignTeacherDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const htmlReady = true;

  const user = useAuthStore((s) => s.user);
  const schoolId =
    useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const { teacherId, classNames, classesWithSubjects, isLoading: ctxLoading } = useTeacherContext();

  const { data: displayName } = useQuery({
    queryKey: ['users', 'display-name', user?.id],
    queryFn: () => fetchUserDisplayName(user!.id),
    enabled: !!user?.id,
  });

  const subjectsByClass = useMemo(() => {
    const m = new Map<string, string[]>();
    classesWithSubjects.forEach((c) => m.set(c.class_name, c.subjects));
    return m;
  }, [classesWithSubjects]);

  useDesignDashboardNav(containerRef, navigate, htmlReady);
  useDesignDashboardDarkOnly(htmlReady);

  useEffect(() => {
    if (!htmlReady || ctxLoading || !schoolId) return;

    const run = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const rawFirst =
        displayName?.split(/\s+/)[0] ||
        user?.user_metadata?.name?.toString?.().split(/\s+/)[0] ||
        user?.email?.split('@')[0] ||
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
      if (teacherId) {
        const { count } = await supabase
          .from('assignments')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId)
          .gte('due_date', today);
        openAssignments = count ?? 0;
      }

      const dbDay = todayDbDayOfWeek();
      type TRow = {
        class_name: string;
        subject: string;
        start_time: string;
        end_time: string;
        room?: string | null;
      };
      let timetableToday: TRow[] = [];
      if (teacherId) {
        const { data: tdata } = await supabase
          .from('timetables')
          .select('class_name, subject, start_time, end_time, room')
          .eq('teacher_id', teacherId)
          .eq('day_of_week', dbDay)
          .order('start_time');
        timetableToday = (tdata as TRow[]) ?? [];
      }

      type AttRow = { class_name?: string; present?: boolean; date?: string; created_at?: string };
      let recentAtt: AttRow[] = [];
      if (teacherId) {
        const { data: adata } = await supabase
          .from('student_attendance')
          .select('class_name, present, date, created_at')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(6);
        recentAtt = (adata as AttRow[]) ?? [];
      }

      let attendPct = 0;
      let attendRows: { present?: boolean }[] = [];
      if (teacherId) {
        const a = await supabase
          .from('student_attendance')
          .select('present')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId)
          .eq('date', today);
        attendRows = (a.data as { present?: boolean }[]) || [];
        const present = attendRows.filter((r) => r.present === true).length;
        attendPct = attendRows.length ? Math.round((present / attendRows.length) * 100) : 0;
      }

      const hour = new Date().getHours();
      const greet = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

      const assignPct = openAssignments > 0 ? Math.min(100, 15 + openAssignments * 8) : 0;

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;

        const set = (sel: string, val: string) => {
          const n = el.querySelector(sel);
          if (n) n.textContent = val;
        };

        set('#pt-greeting', `${greet}, ${firstName}`);
        set(
          '#pt-date-line',
          new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );

        set('[data-kpi="total-classes"]', String(classNames.length));
        set('[data-kpi="total-students"]', String(studentsCount));
        set('[data-kpi="open-assignments"]', String(openAssignments));
        set('[data-kpi="assign-sub"]', openAssignments ? 'Due today or later' : 'No open assignments');
        set('[data-kpi="attendance-today"]', attendRows.length ? `${attendPct}%` : '—');
        set('[data-kpi="attend-sub"]', attendRows.length ? `Recorded for ${attendRows.length} today` : 'No marks yet today');

        const prog = el.querySelector('[data-kpi-width="attend-progress"]') as HTMLElement | null;
        if (prog) prog.style.width = `${attendPct}%`;
        const progA = el.querySelector('[data-kpi-width="assign-progress"]') as HTMLElement | null;
        if (progA) progA.style.width = `${assignPct}%`;

        const classesList = el.querySelector('#pt-classes-list');
        if (classesList) {
          if (!classNames.length) {
            classesList.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">No classes assigned yet. Ask admin to link your classes.</div>`;
          } else {
            classesList.innerHTML = classNames
              .map((cn, i) => {
                const subs = subjectsByClass.get(cn)?.join(', ') || 'Subjects';
                const initial = subs.replace(/[^A-Za-z]/g, '').slice(0, 1) || '📚';
                return `
              <div class="pt-class-row" data-nav="/dashboard/teacher/classes">
                <div class="pt-class-av" style="background:${grad(i)}">${initial}</div>
                <div style="flex:1">
                  <div class="pt-class-name">${cn}</div>
                  <div class="pt-class-sub">${subs}</div>
                </div>
                <span class="pt-chip indigo">${subs.split(',').length || 1}</span>
              </div>`;
              })
              .join('');
          }
        }

        const schedList = el.querySelector('#pt-schedule-list');
        if (schedList) {
          if (!timetableToday.length) {
            schedList.innerHTML = `
            <div class="pt-sched-row" data-nav="/dashboard/teacher/timetable">
              <div class="pt-sched-time"><div class="pt-sched-h">—</div><div class="pt-sched-ap">Timetable</div></div>
              <div class="pt-sched-sep"></div>
              <div style="flex:1">
                <div class="pt-sched-subj">No periods today</div>
                <div class="pt-sched-meta">Open full timetable for your weekly schedule</div>
              </div>
              <span class="pt-chip indigo">View</span>
            </div>`;
          } else {
            schedList.innerHTML = timetableToday
              .map((row) => {
                const start = formatTime(row.start_time);
                const end = formatTime(row.end_time);
                const h = parseInt(String(row.start_time).slice(0, 2), 10) || 0;
                const ap = h >= 12 ? 'PM' : 'AM';
                return `
            <div class="pt-sched-row" data-nav="/dashboard/teacher/timetable">
              <div class="pt-sched-time"><div class="pt-sched-h">${start}</div><div class="pt-sched-ap">${ap}</div></div>
              <div class="pt-sched-sep"></div>
              <div style="flex:1">
                <div class="pt-sched-subj">${row.subject}</div>
                <div class="pt-sched-meta">${row.class_name}${row.room ? ` · ${row.room}` : ''} · ${start}–${end}</div>
              </div>
              <span class="pt-chip indigo">Class</span>
            </div>`;
              })
              .join('');
          }
        }

        const assignList = el.querySelector('#pt-assignments-list');
        if (assignList) {
          assignList.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">Open <strong>Assignments</strong> in the sidebar to create and manage tasks. <span data-nav="/dashboard/teacher/assignments" style="cursor:pointer;color:var(--indigo)">Go to assignments →</span></div>`;
        }

        const actList = el.querySelector('#pt-activity-list');
        if (actList) {
          if (!recentAtt.length) {
            actList.innerHTML = `
            <div class="pt-act-row"><div class="pt-act-av" style="background:${grad(0)}">📋</div><div><div class="pt-act-text">Record <strong>Attendance</strong> to see activity here.</div><div class="pt-act-time">—</div></div></div>`;
          } else {
            actList.innerHTML = recentAtt
              .map((r, i) => {
                const status = r.present === true ? 'Present' : r.present === false ? 'Absent' : 'Recorded';
                const when = r.date || r.created_at?.slice(0, 10) || '—';
                return `
            <div class="pt-act-row" data-nav="/dashboard/teacher/attendance">
              <div class="pt-act-av" style="background:${grad(i)}">✓</div>
              <div><div class="pt-act-text">${r.class_name ?? 'Class'} — ${status}</div><div class="pt-act-time">${when}</div></div>
            </div>`;
              })
              .join('');
          }
        }
      });
    };

    void run();
  }, [htmlReady, ctxLoading, schoolId, teacherId, classNames, subjectsByClass, displayName, user]);

  return (
    <>
      <style>{`${SCOPED_STYLE}\n#pt-greeting { text-transform: uppercase; letter-spacing: 0.02em; }\n`}</style>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: BODY_HTML }}
        style={{ width: '100%', minHeight: '100%', display: 'block' }}
      />
    </>
  );
}
