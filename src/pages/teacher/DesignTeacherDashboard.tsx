import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';
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
  useDesignDashboardThemeSync(htmlReady);

  useEffect(() => {
    if (!htmlReady || ctxLoading || !schoolId) return;

    const run = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const firstName =
        displayName?.split(/\s+/)[0] ||
        user?.user_metadata?.name?.toString?.().split(/\s+/)[0] ||
        user?.email?.split('@')[0] ||
        'Teacher';

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

      let attendPct = 0;
      let attendRows: { present?: boolean }[] = [];
      if (teacherId) {
        const a = await supabase
          .from('student_attendance')
          .select('present')
          .eq('school_id', schoolId)
          .eq('teacher_id', teacherId)
          .eq('attendance_date', today);
        if (a.error) {
          const b = await supabase
            .from('student_attendance')
            .select('present')
            .eq('school_id', schoolId)
            .eq('teacher_id', teacherId)
            .eq('date', today);
          attendRows = (b.data as { present?: boolean }[]) || [];
        } else {
          attendRows = (a.data as { present?: boolean }[]) || [];
        }
        const present = attendRows.filter((r) => r.present === true).length;
        attendPct = attendRows.length ? Math.round((present / attendRows.length) * 100) : 0;
      }

      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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
        set('[data-kpi="open-assignments"]', '0');
        set('[data-kpi="assign-sub"]', 'Use Assignments when connected');
        set('[data-kpi="attendance-today"]', attendRows.length ? `${attendPct}%` : '—');
        set('[data-kpi="attend-sub"]', attendRows.length ? `Recorded for ${attendRows.length} today` : 'No marks yet today');

        const prog = el.querySelector('[data-kpi-width="attend-progress"]') as HTMLElement | null;
        if (prog) prog.style.width = `${attendPct}%`;
        const progA = el.querySelector('[data-kpi-width="assign-progress"]') as HTMLElement | null;
        if (progA) progA.style.width = '0%';

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
          schedList.innerHTML = `
            <div class="pt-sched-row" data-nav="/dashboard/teacher/timetable">
              <div class="pt-sched-time"><div class="pt-sched-h">—</div><div class="pt-sched-ap">Timetable</div></div>
              <div class="pt-sched-sep"></div>
              <div style="flex:1">
                <div class="pt-sched-subj">Weekly schedule</div>
                <div class="pt-sched-meta">Open full timetable for times</div>
              </div>
              <span class="pt-chip indigo">View</span>
            </div>`;
        }

        const assignList = el.querySelector('#pt-assignments-list');
        if (assignList) {
          assignList.innerHTML = `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">Assignments module — create tasks from <strong>Assignments</strong> in the sidebar.</div>`;
        }

        const actList = el.querySelector('#pt-activity-list');
        if (actList) {
          actList.innerHTML = `
            <div class="pt-act-row"><div class="pt-act-av" style="background:${grad(0)}">📋</div><div><div class="pt-act-text">Tip: use <strong>Attendance</strong> to record today&apos;s class.</div><div class="pt-act-time">Today</div></div></div>
            <div class="pt-act-row"><div class="pt-act-av" style="background:${grad(1)}">📊</div><div><div class="pt-act-text">Exam results and marks live under <strong>Exam results</strong>.</div><div class="pt-act-time">—</div></div></div>`;
        }
      });
    };

    void run();
  }, [htmlReady, ctxLoading, schoolId, teacherId, classNames, subjectsByClass, displayName, user]);

  return (
    <>
      <style>{SCOPED_STYLE}</style>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: BODY_HTML }}
        style={{ width: '100%', minHeight: '100%', display: 'block' }}
      />
    </>
  );
}
