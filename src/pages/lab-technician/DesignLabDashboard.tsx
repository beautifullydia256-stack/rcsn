import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';

import designRaw from '../../../new designs/pwezacore-lab-technician-dashboard-react.html?raw';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

export default function DesignLabDashboard() {
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
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();
      const firstName =
        (userData as { name?: string })?.name?.split(/\s+/)[0] || user.email?.split('@')[0] || 'Technician';
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => {
          const n = el.querySelector(sel);
          if (n) n.textContent = val;
        };
        set('#plb-greeting', `${greet}, ${firstName}`);
        set(
          '#plb-date-line',
          new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );
        const hazard = el.querySelector('#plb-hazard-wrap') as HTMLElement | null;
        if (hazard) hazard.style.display = 'none';
        set('#plb-sessions-today', '0');
        set('#plb-students-in-lab', '0');
        set('#plb-low-stock', '0');
        set('#plb-damage-reports', '0');
        set('#plb-chem-low-badge', '0 low');
        set('#plb-bookings-badge', '0 pending');
        set('#plb-checklist-session', '—');
        set('[data-kpi="chem-low"]', '0');
        set('[data-kpi="damage-open"]', '0');

        [
          '#plb-schedule-list',
          '#plb-checklist-list',
          '#plb-chemicals-list',
          '#plb-equipment-list',
          '#plb-bookings-list',
          '#plb-damage-list',
          '#plb-safety-list',
          '#plb-activity-list',
        ].forEach((id) => {
          const n = el.querySelector(id);
          if (n)
            n.innerHTML = `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">Lab inventory and sessions can be wired when your schema includes lab tables.</div>`;
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
