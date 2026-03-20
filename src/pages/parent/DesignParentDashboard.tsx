import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';

import designRaw from '../../../new designs/pwezacore-parent-dashboard-react.html?raw';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

const fmt = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

export default function DesignParentDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  useDesignDashboardNav(containerRef, navigate, true);
  useDesignDashboardThemeSync(true);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user?.email) return;

      const { data: userData } = await supabase
        .from('users')
        .select('school_id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      const schoolId = (userData as { school_id?: string } | null)?.school_id;
      const firstName =
        (userData as { name?: string })?.name?.split(/\s+/)[0] || user.email?.split('@')[0] || 'Parent';

      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      let childName = '—';
      let studentId: string | null = null;
      if (schoolId) {
        const { data: parentRows } = await supabase
          .from('parents')
          .select('student_id, name')
          .eq('school_id', schoolId)
          .ilike('email', user.email.trim());
        if (parentRows?.length) {
          studentId = (parentRows[0] as { student_id: string }).student_id;
          const { data: st } = await supabase
            .from('students')
            .select('name')
            .eq('student_id', studentId)
            .eq('school_id', schoolId)
            .maybeSingle();
          childName = (st as { name?: string } | null)?.name || '—';
        }
      }

      let avg = 0;
      let attendPct = 0;
      let feeBal = 0;
      if (schoolId && studentId) {
        const { data: results } = await supabase
          .from('exam_results')
          .select('marks_obtained, total_marks')
          .eq('school_id', schoolId)
          .eq('student_id', studentId);
        const scores: number[] = [];
        (results || []).forEach((r: { marks_obtained?: number; total_marks?: number }) => {
          const tot = Number(r.total_marks || 0);
          const mo = Number(r.marks_obtained || 0);
          if (tot <= 0) return;
          scores.push(Math.round((mo / tot) * 100));
        });
        if (scores.length) avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        const { data: att } = await supabase
          .from('student_attendance')
          .select('present')
          .eq('school_id', schoolId)
          .eq('student_id', studentId);
        const rows = att || [];
        const present = rows.filter((r: { present?: boolean }) => r.present === true).length;
        attendPct = rows.length ? Math.round((present / rows.length) * 100) : 0;

        const { data: bals } = await supabase
          .from('student_balances')
          .select('balance')
          .eq('school_id', schoolId)
          .eq('student_id', studentId);
        feeBal = (bals || []).reduce((s: number, b: { balance?: number }) => s + Number(b.balance || 0), 0);
      }

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => {
          const n = el.querySelector(sel);
          if (n) n.textContent = val;
        };
        set('#pp-greeting', `${greet}, ${firstName}`);
        set(
          '#pp-date-line',
          new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );
        set('#pp-viewing-child', childName !== '—' ? `Viewing — ${childName}` : 'No linked child');
        set('[data-kpi="child-avg"]', studentId ? `${avg}%` : '—');
        set('[data-kpi="child-attend"]', studentId ? `${attendPct}%` : '—');
        set('[data-kpi="child-fee-bal"]', studentId ? fmt(feeBal) : '—');
        set('[data-kpi="child-rank"]', '—');
        set('#pp-outstanding-amt', studentId ? fmt(feeBal) : '—');
        set('#pp-due-date', '—');
        set('#pp-fee-pct', '—');
        set('#pp-fee-paid', '—');
        set('#pp-fee-total', '—');
        const fill = el.querySelector('#pp-fee-progress-fill') as HTMLElement | null;
        if (fill) fill.style.width = '0%';

        const tabs = el.querySelector('#pp-children-list');
        if (tabs && childName !== '—') {
          tabs.innerHTML = `<div class="pp-child-tab active" data-child-id="1"><div class="pp-child-dot" style="background:#10d9a8"></div>${childName.split(' ')[0]}</div>`;
        }

        ['#pp-subjects-list', '#pp-schedule-list', '#pp-exams-list', '#pp-payment-history', '#pp-teachers-list'].forEach(
          (id) => {
            const n = el.querySelector(id);
            if (n)
              n.innerHTML = `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">Use the menu for full details.</div>`;
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
