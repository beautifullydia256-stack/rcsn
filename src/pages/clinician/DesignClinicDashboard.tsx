import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';

import designRaw from '../../../new designs/pwezacore-clinician-dashboard-react.html?raw';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

export default function DesignClinicDashboard() {
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
      const firstName =
        (userData as { name?: string })?.name?.split(/\s+/)[0] || user.email?.split('@')[0] || 'Clinician';
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => {
          const n = el.querySelector(sel);
          if (n) n.textContent = val;
        };
        set('#pc-greeting', `${greet}, ${firstName}`);
        set(
          '#pc-date-line',
          new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );
        const wrap = el.querySelector('#pc-emergency-wrap') as HTMLElement | null;
        if (wrap) wrap.style.display = 'none';
        set('#pc-patients-today', '0');
        set('#pc-in-queue', '0');
        set('#pc-emergencies', '0');
        set('#pc-referred', '0');
        set('[data-kpi="patients-kpi"]', '0');
        set('[data-kpi="emerg-kpi"]', '0');
        set('[data-kpi="medicine-low"]', '0');
        set('[data-kpi="vacc-due"]', '0');
        set('#pc-queue-badge', '0 waiting');
        set('#pc-medicine-low-badge', '0 low');

        [
          '#pc-queue-list',
          '#pc-appointments-list',
          '#pc-medicines-list',
          '#pc-referrals-list',
          '#pc-vaccinations-list',
          '#pc-activity-list',
        ].forEach((id) => {
          const n = el.querySelector(id);
          if (n)
            n.innerHTML = `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">Clinic modules can be connected to your database when tables are available.</div>`;
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
