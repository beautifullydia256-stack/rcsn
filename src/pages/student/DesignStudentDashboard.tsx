import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';
import { useSchoolType } from '@/hooks/useSchoolType';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';

// TODO: Restore when design file is available
// import designRaw from '../../../new designs/pwezacore-student-dashboard-react.html?raw';
const designRaw = '<html><body><div id="ps-greeting"></div><div id="ps-date-line"></div><div id="ps-class-name"></div><div id="ps-attendance-rate"></div><div id="ps-fees-balance"></div><div id="ps-next-class"></div><div id="ps-timetable-list"></div><div id="ps-assignments-list"></div><div id="ps-announcements-list"></div></body></html>';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

export default function DesignStudentDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isTertiary } = useSchoolType();
  useDesignDashboardNav(containerRef, navigate, true);
  useDesignDashboardThemeSync(true);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('school_id, name, student_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const schoolId = (userData as { school_id?: string; student_id?: string } | null)?.school_id;
      const studentId = (userData as { student_id?: string } | null)?.student_id;
      const rawName =
        (userData as { name?: string })?.name?.split(/\s+/)[0] || user.email?.split('@')[0] || (isTertiary ? 'Trainee' : 'Student');
      const displayName = isTertiary ? `Trainee ${rawName}` : rawName;

      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      let avgPct = 0;
      let cgpa = 0;
      let bestPct = 0;
      let lowPct = 100;
      let weakSubject = '—';
      const scores: number[] = [];
      const gradePoints: number[] = [];
      let results: { subject?: string; marks_obtained?: number; total_marks?: number }[] | null = null;
      let cohortName = '';

      let attendPct = 0;
      let attendPresent = 0;
      let attendTotal = 0;
      if (schoolId && studentId) {
        const [examRes, attRes, studentRes] = await Promise.all([
          supabase
            .from('exam_results')
            .select('subject, marks_obtained, total_marks')
            .eq('school_id', schoolId)
            .eq('student_id', studentId),
          supabase
            .from('student_attendance')
            .select('present, status')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .limit(4000),
          supabase
            .from('students')
            .select('current_class')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .maybeSingle(),
        ]);

        cohortName = (studentRes.data as { current_class?: string } | null)?.current_class || '';
        results = examRes.data || [];

        (results || []).forEach((r: { marks_obtained?: number; total_marks?: number; subject?: string }) => {
          const tot = Number(r.total_marks || 0);
          const mo = Number(r.marks_obtained || 0);
          if (tot <= 0) return;
          const pct = Math.round((mo / tot) * 100);
          scores.push(pct);

          // Calculate Grade Point for Tertiary
          if (pct >= 80) gradePoints.push(5.0);
          else if (pct >= 75) gradePoints.push(4.5);
          else if (pct >= 70) gradePoints.push(4.0);
          else if (pct >= 65) gradePoints.push(3.5);
          else if (pct >= 60) gradePoints.push(3.0);
          else if (pct >= 55) gradePoints.push(2.5);
          else if (pct >= 50) gradePoints.push(2.0);
          else gradePoints.push(0.0);
        });

        if (scores.length) {
          avgPct = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          bestPct = Math.max(...scores);
          lowPct = Math.min(...scores);
          const lowIdx = scores.indexOf(lowPct);
          weakSubject = results?.[lowIdx]?.subject || '—';
          if (gradePoints.length) {
            cgpa = Number((gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length).toFixed(2));
          }
        }

        type AttRow = { present?: boolean | null; status?: string | null };
        const rows = (attRes.data || []) as AttRow[];
        attendPresent = rows.filter((r) => studentAttendanceRowIsPresent(r)).length;
        attendTotal = rows.length;
        attendPct = attendTotal ? Math.round((attendPresent / attendTotal) * 100) : 0;
      }

      let subjectsHtml = '';
      if (schoolId && studentId && results?.length) {
        subjectsHtml = results
          .map((g) => {
            const tot = Number(g.total_marks || 0);
            const mo = Number(g.marks_obtained || 0);
            const pct = tot > 0 ? Math.round((mo / tot) * 100) : 0;
            
            let grade = 'F';
            let color = 'var(--rose)';
            if (isTertiary) {
              if (pct >= 80) { grade = 'Distinction (5.0)'; color = 'var(--teal)'; }
              else if (pct >= 65) { grade = 'Credit (4.0)'; color = 'var(--indigo)'; }
              else if (pct >= 50) { grade = 'Pass (3.0)'; color = 'var(--amber)'; }
              else { grade = 'Retake (0.0)'; color = 'var(--rose)'; }
            } else {
              grade = pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
              color = pct >= 80 ? 'var(--teal)' : pct >= 50 ? 'var(--indigo)' : 'var(--rose)';
            }

            return `
                  <div class="pst-subj-row">
                    <span class="pst-subj-name">${g.subject || '—'}</span>
                    <div class="pst-subj-bar"><div class="pst-subj-fill" style="width:${pct}%;background:${color}"></div></div>
                    <span class="pst-subj-score" style="color:${color}">${pct}%</span>
                    <span class="pst-subj-grade" style="color:${color}">${grade}</span>
                  </div>`;
          })
          .join('');
      }

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => {
          const n = el.querySelector(sel);
          if (n) n.textContent = val;
        };

        set('#pst-greeting', `${greet}, ${displayName}`);
        set('#ps-greeting', `${greet}, ${displayName}`);
        if (cohortName) {
          set('#ps-class-name', cohortName);
          set('#pst-class-name', cohortName);
        }
        set(
          '#pst-date-line',
          new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );
        set(
          '[data-kpi="overall-avg"]',
          scores.length
            ? isTertiary
              ? `${cgpa.toFixed(2)} CGPA (${avgPct}%)`
              : `${avgPct}%`
            : '—'
        );
        set(
          '[data-kpi="attendance"]',
          attendTotal ? `${attendPct}% · ${attendPresent}/${attendTotal} days` : '—'
        );
        set('[data-kpi="pending-assignments"]', '0');
        set('[data-kpi="fee-balance"]', '—');
        set('#pst-radial-avg', scores.length ? (isTertiary ? `${cgpa.toFixed(2)} CGPA` : `${avgPct}%`) : '—');
        set('#pst-radial-best', scores.length ? `${bestPct}%` : '—');
        set('#pst-radial-low', scores.length ? `${lowPct}%` : '—');
        set('#pst-weak-subject', weakSubject);

        const subj = el.querySelector('#pst-subjects-list');
        if (subj) {
          subj.innerHTML =
            !schoolId || !studentId
              ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">${isTertiary ? 'Link your trainee account to see course unit grades.' : 'Link your student account to see grades.'}</div>`
              : !subjectsHtml
                ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">${isTertiary ? 'No semester exam results yet.' : 'No exam results yet.'}</div>`
                : subjectsHtml;
        }

        ['#pst-schedule-list', '#pst-exams-list', '#pst-assignments-list', '#pst-fees-list', '#pst-teachers-list'].forEach(
          (id) => {
            const n = el.querySelector(id);
            if (n)
              n.innerHTML = `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">Open the menu for full details.</div>`;
          }
        );
      });
    };

    void load();
  }, [isTertiary]);

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
