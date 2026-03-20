import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';

import designRaw from '../../../../new designs/pwezacore-librarian-dashboard-react.html?raw';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

export default function DesignLibrarianDashboard() {
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
        .select('school_id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      const schoolId = (userData as { school_id?: string } | null)?.school_id;
      const firstName =
        (userData as { name?: string })?.name?.split(/\s+/)[0] || user.email?.split('@')[0] || 'Librarian';
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      const catalog = 0;
      const loans = 0;

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => {
          const n = el.querySelector(sel);
          if (n) n.textContent = val;
        };
        set('#pl-greeting', `${greet}, ${firstName}`);
        set(
          '#pl-date-line',
          new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );
        set('#pl-active-loans', String(loans));
        set('#pl-available', String(catalog));
        set('#pl-overdue', '—');
        set('[data-kpi="catalog-size"]', String(catalog));
        set('[data-kpi="overdue-count"]', '0');
        set('[data-kpi="fines-total"]', 'UGX 0');
        set('[data-kpi="issued-today"]', '—');
        set('[data-kpi="returned-today"]', '—');
        set('[data-kpi="overdue-strip"]', '0');
        set('[data-kpi="fines-strip"]', 'UGX 0');
        set('#pl-renew-count', '0');

        ['#pl-loans-list', '#pl-overdue-list', '#pl-reservations-list', '#pl-activity-list'].forEach((id) => {
          const n = el.querySelector(id);
          if (n)
            n.innerHTML = `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">Library data will appear here when loans and catalog are configured.</div>`;
        });
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
