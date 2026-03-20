import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';

import designRaw from '../../../new designs/pwezacore-student-dashboard-react.html?raw';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

export default function DesignStudentDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
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
      const displayName =
        (userData as { name?: string })?.name?.split(/\s+/)[0] || user.email?.split('@')[0] || 'Student';

      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      let avgPct = 0;
      let bestPct = 0;
      let lowPct = 100;
      let weakSubject = '—';
      const scores: number[] = [];
      let results: { subject?: string; marks_obtained?: number; total_marks?: number }[] | null = null;

      if (schoolId && studentId) {
        const res = await supabase
          .from('exam_results')
          .select('subject, marks_obtained, total_marks')
          .eq('school_id', schoolId)
          .eq('student_id', studentId);
        results = res.data || [];

        (results || []).forEach((r: { marks_obtained?: number; total_marks?: number; subject?: string }) => {
          const tot = Number(r.total_marks || 0);
          const mo = Number(r.marks_obtained || 0);
          if (tot <= 0) return;
          const pct = Math.round((mo / tot) * 100);
          scores.push(pct);
        });
        if (scores.length) {
          avgPct = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          bestPct = Math.max(...scores);
          lowPct = Math.min(...scores);
          const lowIdx = scores.indexOf(lowPct);
          weakSubject = results?.[lowIdx]?.subject || '—';
        }
      }

      let attendPct = 0;
      if (schoolId && studentId) {
        const { data: att } = await supabase
          .from('student_attendance')
          .select('present')
          .eq('school_id', schoolId)
          .eq('student_id', studentId);
        const rows = att || [];
        const present = rows.filter(
          (r: { present?: boolean }) => r.present === true
        ).length;
        attendPct = rows.length ? Math.round((present / rows.length) * 100) : 0;
      }

      let subjectsHtml = '';
      if (schoolId && studentId && results?.length) {
        subjectsHtml = results
          .map((g) => {
            const tot = Number(g.total_marks || 0);
            const mo = Number(g.marks_obtained || 0);
            const pct = tot > 0 ? Math.round((mo / tot) * 100) : 0;
            const grade = pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
            const color = pct >= 80 ? 'var(--teal)' : pct >= 50 ? 'var(--indigo)' : 'var(--rose)';
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
        set(
          '#pst-date-line',
          new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );
        set('[data-kpi="overall-avg"]', scores.length ? `${avgPct}%` : '—');
        set('[data-kpi="attendance"]', `${attendPct}%`);
        set('[data-kpi="pending-assignments"]', '0');
        set('[data-kpi="fee-balance"]', '—');
        set('#pst-radial-avg', scores.length ? `${avgPct}%` : '—');
        set('#pst-radial-best', scores.length ? `${bestPct}%` : '—');
        set('#pst-radial-low', scores.length ? `${lowPct}%` : '—');
        set('#pst-weak-subject', weakSubject);

        const subj = el.querySelector('#pst-subjects-list');
        if (subj) {
          subj.innerHTML =
            !schoolId || !studentId
              ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">Link your student account to see grades.</div>`
              : !subjectsHtml
                ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No exam results yet.</div>`
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
  }, []);

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
