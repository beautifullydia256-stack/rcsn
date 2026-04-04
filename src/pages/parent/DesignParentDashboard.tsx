import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';

import designRaw from '@/assets/pwezacore-parent-dashboard.html?raw';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

const GRADIENTS = [
  'linear-gradient(135deg,#ff6b6b,#9d7eff)',
  'linear-gradient(135deg,#3d7eff,#9d7eff)',
  'linear-gradient(135deg,#ffb547,#ff6b6b)',
  'linear-gradient(135deg,#27e09f,#3d7eff)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

const SCHED_COLORS = ['#00e5c3', '#9d7eff', '#ffb547', '#3d7eff', '#ff6b6b', '#27e09f'];

function initials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fmt(n: number) {
  return `UGX ${Math.round(n || 0).toLocaleString()}`;
}

function displayStudentName(s: Record<string, unknown>): string {
  const fn = String(s.first_name ?? '').trim();
  const mn = String(s.middle_name ?? '').trim();
  const ln = String(s.last_name ?? '').trim();
  const parts = [fn, mn, ln].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(s.name ?? '').trim() || '—';
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type StudentRow = {
  student_id: string;
  name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  current_class?: string | null;
  admission_number?: string | null;
};

export default function DesignParentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  useDesignDashboardNav(containerRef, navigate, true);
  useDesignDashboardThemeSync(true);

  useLayoutEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sidebar = el.querySelector('#pd-sidebar');
    const overlay = el.querySelector('#pd-overlay');
    const burger = el.querySelector('#pd-hamburger');
    const open = () => {
      sidebar?.classList.add('open');
      overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    const close = () => {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('open');
      document.body.style.overflow = '';
    };
    burger?.addEventListener('click', open);
    overlay?.addEventListener('click', close);
    const navClose = (e: MouseEvent) => {
      if (window.innerWidth <= 768 && (e.target as HTMLElement).closest('.pd-nav-item')) close();
    };
    el.addEventListener('click', navClose);
    return () => {
      burger?.removeEventListener('click', open);
      overlay?.removeEventListener('click', close);
      el.removeEventListener('click', navClose);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const path = location.pathname;
    el.querySelectorAll('.pd-nav-item').forEach((i) => {
      const nav = (i as HTMLElement).dataset.nav;
      i.classList.toggle('active', nav === path);
    });
  }, [location.pathname]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTab = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest('.pd-child-tab');
      if (!t || !el.contains(t)) return;
      const id = (t as HTMLElement).dataset.childId;
      if (id) setActiveStudentId(id);
    };
    el.addEventListener('click', onTab);
    return () => el.removeEventListener('click', onTab);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onLogout = async (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('#pd-btn-logout');
      if (!btn || !el.contains(btn)) return;
      e.preventDefault();
      await supabase.auth.signOut();
      navigate('/login');
    };
    el.addEventListener('click', onLogout);
    return () => el.removeEventListener('click', onLogout);
  }, [navigate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const setDateStr = () => {
      const now = new Date();
      const ds = el.querySelector('#pd-date-str');
      if (ds) {
        ds.textContent = now.toLocaleDateString('en-UG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    };
    setDateStr();

    let cancelled = false;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || cancelled) return;

      const { data: userRow } = await supabase
        .from('users')
        .select('school_id, name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      const schoolId = (userRow as { school_id?: string } | null)?.school_id ?? null;
      const parentNameFull =
        String((userRow as { name?: string })?.name || '').trim() ||
        String(user.email || '').split('@')[0] ||
        'Parent';

      let parentLinkRows: { student_id: string }[] = [];
      if (schoolId) {
        const { data: byId } = await supabase
          .from('parents')
          .select('student_id')
          .eq('school_id', schoolId)
          .eq('parent_id', user.id);
        parentLinkRows = (byId as { student_id: string }[]) || [];
        if (!parentLinkRows.length && user.email) {
          const { data: byEmail } = await supabase
            .from('parents')
            .select('student_id')
            .eq('school_id', schoolId)
            .ilike('email', user.email.trim());
          parentLinkRows = (byEmail as { student_id: string }[]) || [];
        }
      }

      const studentIds = [...new Set(parentLinkRows.map((r) => r.student_id).filter(Boolean))];
      let children: StudentRow[] = [];
      if (schoolId && studentIds.length) {
        const { data: studs } = await supabase
          .from('students')
          .select('student_id, name, first_name, middle_name, last_name, current_class, admission_number')
          .eq('school_id', schoolId)
          .in('student_id', studentIds);
        children = (studs as StudentRow[]) || [];
      }

      const selectedId =
        activeStudentId && children.some((c) => c.student_id === activeStudentId)
          ? activeStudentId
          : children[0]?.student_id ?? null;
      if (selectedId !== activeStudentId && children.length) {
        setActiveStudentId(selectedId);
      }

      const child = children.find((c) => c.student_id === selectedId) || children[0] || null;
      const childDisplayName = child ? displayStudentName(child) : '—';
      const childClass = child?.current_class ? String(child.current_class) : '—';

      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const greetFirst = parentNameFull.split(/\s+/)[0] || parentNameFull;

      let avgScore: number | null = null;
      let attPct = 0;
      let todayPresent: boolean | null = null;
      let feeBalance = 0;
      let feeTotal = 0;
      let feePaid = 0;
      let perfRows: { subject: string; score: number; max: number; grade: string | null }[] = [];
      let timetableRows: { time: string; subject: string; teacher: string }[] = [];
      let examRows: { name: string; sub: string; day: string; mon: string }[] = [];
      let noticesHtml = '';
      let messagesHtml = '';
      let unreadInbox = 0;

      const today = new Date().toISOString().slice(0, 10);
      const weekdayLong = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      if (schoolId && child) {
        const sid = child.student_id;

        const [
          examRes,
          attRes,
          balRes,
          ttRes,
          examSetsRes,
          noticesRes,
          inboxRes,
          todayAttRes,
        ] = await Promise.all([
          supabase
            .from('exam_results')
            .select('subject, marks_obtained, total_marks, grade')
            .eq('school_id', schoolId)
            .eq('student_id', sid)
            .limit(80),
          supabase.from('student_attendance').select('present').eq('school_id', schoolId).eq('student_id', sid),
          supabase
            .from('student_balances')
            .select('total_fees, total_paid, balance')
            .eq('school_id', schoolId)
            .eq('student_id', sid)
            .maybeSingle(),
          supabase
            .from('timetable_periods')
            .select('start_time, end_time, subject, teacher_id')
            .eq('school_id', schoolId)
            .eq('class_name', childClass)
            .eq('day_of_week', weekdayLong)
            .order('start_time'),
          supabase
            .from('exam_sets')
            .select('id, name, term, year, target_classes, is_active')
            .eq('school_id', schoolId)
            .order('year', { ascending: false })
            .order('term', { ascending: false })
            .limit(12),
          supabase
            .from('notifications')
            .select('id, title, message, created_at')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('user_in_app_notifications')
            .select('id, title, body, created_at, read_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(6),
          supabase
            .from('student_attendance')
            .select('present')
            .eq('school_id', schoolId)
            .eq('student_id', sid)
            .eq('date', today)
            .maybeSingle(),
        ]);

        const results = (examRes.data || []) as {
          subject?: string;
          marks_obtained?: number;
          total_marks?: number;
          grade?: string | null;
        }[];
        const scores: number[] = [];
        perfRows = [];
        for (const r of results) {
          const tot = Number(r.total_marks || 0);
          const mo = Number(r.marks_obtained || 0);
          const sub = String(r.subject || 'Subject');
          if (tot > 0) {
            const pct = Math.round((mo / tot) * 100);
            scores.push(pct);
            perfRows.push({ subject: sub, score: mo, max: tot, grade: r.grade ?? null });
          }
        }
        if (scores.length) avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        const attData = (attRes.data || []) as { present?: boolean }[];
        const presentDays = attData.filter((a) => a.present === true).length;
        attPct = attData.length ? Math.round((presentDays / attData.length) * 100) : 0;

        const trow = todayAttRes.data as { present?: boolean } | null;
        if (trow && typeof trow.present === 'boolean') todayPresent = trow.present;

        const bal = balRes.data as { total_fees?: number; total_paid?: number; balance?: number } | null;
        if (bal) {
          feeTotal = Number(bal.total_fees || 0);
          feePaid = Number(bal.total_paid || 0);
          feeBalance = Number(bal.balance ?? Math.max(0, feeTotal - feePaid));
        }

        const tt = (ttRes.data || []) as {
          start_time?: string;
          end_time?: string;
          subject?: string;
          teacher_id?: string;
        }[];
        const tids = [...new Set(tt.map((t) => t.teacher_id).filter(Boolean))] as string[];
        let tmap: Record<string, string> = {};
        if (tids.length) {
          const { data: teaches } = await supabase
            .from('teachers')
            .select('teacher_id, name')
            .eq('school_id', schoolId)
            .in('teacher_id', tids);
          for (const t of teaches || []) {
            const row = t as { teacher_id: string; name?: string };
            tmap[row.teacher_id] = row.name || '';
          }
        }
        timetableRows = tt.map((t) => ({
          time: `${String(t.start_time || '').slice(0, 5)}–${String(t.end_time || '').slice(0, 5)}`,
          subject: String(t.subject || '—'),
          teacher: t.teacher_id ? tmap[t.teacher_id] || '—' : '—',
        }));

        const sets = (examSetsRes.data || []) as {
          name?: string;
          term?: number;
          year?: number;
          target_classes?: string[] | null;
          is_active?: boolean;
        }[];
        const cls = childClass;
        const filtered = sets.filter((e) => {
          if (e.is_active === false) return false;
          const tc = e.target_classes;
          if (!tc || tc.length === 0) return true;
          return tc.includes(cls);
        });
        examRows = filtered.slice(0, 4).map((ex) => ({
          name: String(ex.name || 'Exam'),
          sub: `Class ${cls}`,
          day: ex.term != null ? `T${ex.term}` : '—',
          mon: ex.year != null ? String(ex.year) : '',
        }));

        const notices = (noticesRes.data || []) as { id?: string; title?: string; created_at?: string }[];
        if (notices.length === 0) {
          noticesHtml = `<div class="pd-empty"><div class="pd-empty-ic">📢</div><div class="pd-empty-txt">No notices at this time.</div></div>`;
        } else {
          noticesHtml = notices
            .map((n) => {
              const d = n.created_at ? new Date(n.created_at) : null;
              const dateStr = d
                ? `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`
                : '—';
              return `
            <div class="pd-notice-row" data-nav="/dashboard/parent/notices">
              <div class="pd-notice-dot new"></div>
              <div style="flex:1">
                <div class="pd-notice-title">${esc(String(n.title || 'Notice'))}</div>
                <div class="pd-notice-date">${esc(dateStr)}</div>
              </div>
            </div>`;
            })
            .join('');
        }

        const inbox = (inboxRes.data || []) as {
          title?: string;
          body?: string | null;
          created_at?: string;
          read_at?: string | null;
        }[];
        unreadInbox = inbox.filter((m) => !m.read_at).length;
        if (inbox.length === 0) {
          messagesHtml = `<div class="pd-empty"><div class="pd-empty-ic">💬</div><div class="pd-empty-txt">No messages yet.</div></div>`;
        } else {
          messagesHtml = inbox
            .map((m, i) => {
              const preview = String(m.body || m.title || '')
                .slice(0, 60)
                .concat(String(m.body || m.title || '').length > 60 ? '…' : '');
              const timeStr = m.created_at
                ? new Date(m.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
                : '—';
              const unread = !m.read_at;
              return `
            <div class="pd-msg-row" data-nav="/dashboard/parent/messages">
              <div class="pd-msg-av" style="background:${grad(i)}">${esc(initials(String(m.title || 'School')))}</div>
              <div style="flex:1;min-width:0">
                <div class="pd-msg-name">${esc(String(m.title || 'School'))}</div>
                <div class="pd-msg-preview">${esc(preview)}</div>
              </div>
              <span class="pd-msg-time">${esc(timeStr)}</span>
              ${unread ? '<div class="pd-msg-unread"></div>' : ''}
            </div>`;
            })
            .join('');
        }
      }

      if (cancelled) return;

      const feePct = feeTotal > 0 ? Math.round((feePaid / feeTotal) * 100) : 0;

      requestAnimationFrame(() => {
        const root = containerRef.current;
        if (!root) return;

        const ini = initials(parentNameFull);
        const pIni = root.querySelector('#pd-parent-initials');
        const pName = root.querySelector('#pd-parent-name');
        const topAv = root.querySelector('#pd-topbar-av');
        if (pIni) pIni.textContent = ini;
        if (pName) pName.textContent = parentNameFull;
        if (topAv) topAv.textContent = ini;

        const gEl = root.querySelector('#pd-greeting');
        if (gEl) gEl.textContent = `${greet}, ${greetFirst}`;

        const tabsEl = root.querySelector('#pd-child-tabs');
        if (tabsEl) {
          if (children.length === 0) {
            tabsEl.innerHTML = `<div style="font-size:12px;color:var(--t3);padding:4px">No children linked yet.</div>`;
          } else {
            tabsEl.innerHTML = children
              .map((c) => {
                const nm = displayStudentName(c);
                const active = c.student_id === selectedId ? 'active' : '';
                return `<div class="pd-child-tab ${active}" data-child-id="${esc(c.student_id)}"><div class="pd-child-dot"></div>${esc(nm)}</div>`;
              })
              .join('');
          }
        }

        root.querySelector('#pd-viewing-name')!.textContent = childDisplayName;
        root.querySelector('#pd-viewing-class')!.textContent = childClass;

        const statEl = root.querySelector('#pd-attendance-status') as HTMLElement | null;
        if (statEl) {
          if (!child) {
            statEl.textContent = '—';
            statEl.className = 'pd-child-status';
          } else if (todayPresent === true) {
            statEl.textContent = 'Present today';
            statEl.className = 'pd-child-status present';
          } else if (todayPresent === false) {
            statEl.textContent = 'Marked absent today';
            statEl.className = 'pd-child-status absent';
          } else {
            statEl.textContent = 'No attendance record today';
            statEl.className = 'pd-child-status';
          }
        }

        root.querySelector('[data-kpi="avg-score"]')!.textContent = avgScore !== null ? `${avgScore}%` : '—';
        root.querySelector('[data-kpi="attendance"]')!.textContent = child ? `${attPct}%` : '—';
        root.querySelector('[data-kpi="fee-balance"]')!.textContent =
          !child ? '—' : feeBalance > 0 ? fmt(feeBalance) : 'Cleared';
        root.querySelector('[data-kpi="class-rank"]')!.textContent = '—';

        const feeAmt = root.querySelector('#pd-fee-amount') as HTMLElement | null;
        const feeDue = root.querySelector('#pd-fee-due') as HTMLElement | null;
        const feeBar = root.querySelector('#pd-fee-bar') as HTMLElement | null;
        const feePaidLbl = root.querySelector('#pd-fee-paid') as HTMLElement | null;
        const feeTotalEl = root.querySelector('#pd-fee-total') as HTMLElement | null;
        const feeTerm = root.querySelector('#pd-fee-term') as HTMLElement | null;
        const feeFoot = root.querySelector('#pd-fee-paid-foot') as HTMLElement | null;
        const feeBreakdown = root.querySelector('#pd-fee-breakdown');

        if (feeAmt) feeAmt.textContent = !child ? '—' : feeBalance > 0 ? fmt(feeBalance) : 'UGX 0';
        if (feeDue) {
          feeDue.textContent = !child
            ? 'Link a student to see fees.'
            : feeBalance > 0
              ? 'Due by end of term — pay on time to avoid disruption.'
              : 'Fees cleared for this period.';
        }
        if (feeBar) feeBar.style.width = `${feePct}%`;
        if (feePaidLbl) feePaidLbl.textContent = child ? `${feePct}% paid` : '—';
        if (feeFoot) feeFoot.textContent = child ? `${fmt(feePaid)} paid` : '—';
        if (feeTotalEl) feeTotalEl.textContent = child ? `Total: ${fmt(feeTotal)}` : 'Total: —';
        if (feeTerm)
          feeTerm.textContent = child ? `${childClass} · Term payment progress` : '—';

        if (feeBreakdown) {
          if (!child) {
            feeBreakdown.innerHTML = '';
          } else {
            feeBreakdown.innerHTML = `
            <div class="pd-fee-item">
              <span class="pd-fee-item-label">Total fees</span>
              <span class="pd-fee-item-val">${fmt(feeTotal)}</span>
            </div>
            <div class="pd-fee-item">
              <span class="pd-fee-item-label">Amount paid</span>
              <span class="pd-fee-item-val" style="color:var(--green)">${fmt(feePaid)}</span>
            </div>
            <div class="pd-fee-item">
              <span class="pd-fee-item-label">Balance</span>
              <span class="pd-fee-item-val" style="color:var(--coral)">${fmt(feeBalance)}</span>
            </div>`;
          }
        }

        const perfBody = root.querySelector('#pd-performance-body');
        if (perfBody) {
          if (!perfRows.length) {
            perfBody.innerHTML = `<div class="pd-empty"><div class="pd-empty-ic">📊</div><div class="pd-empty-txt">Results will appear here once published by the school.</div></div>`;
          } else {
            perfBody.innerHTML = perfRows
              .map((r) => {
                const pct = r.max > 0 ? Math.round((r.score / r.max) * 100) : 0;
                const cls = pct >= 70 ? 'high' : pct >= 50 ? 'mid' : 'low';
                const color = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--rose)';
                const grade = r.grade || `${pct}%`;
                return `<div class="pd-perf-row">
              <span class="pd-perf-subject">${esc(r.subject)}</span>
              <span class="pd-perf-score ${cls}">${r.score}/${r.max}</span>
              <span class="pd-perf-grade">${esc(grade)}</span>
              <div class="pd-perf-bar-wrap">
                <div class="pd-perf-bar" style="width:${pct}%;background:${color}"></div>
              </div>
            </div>`;
              })
              .join('');
          }
        }

        const schedBody = root.querySelector('#pd-schedule-body');
        if (schedBody) {
          if (!timetableRows.length) {
            schedBody.innerHTML = `<div class="pd-empty"><div class="pd-empty-ic">📅</div><div class="pd-empty-txt">No classes scheduled for today.</div></div>`;
          } else {
            schedBody.innerHTML = timetableRows
              .map(
                (t, i) => `
          <div class="pd-sched-row">
            <span class="pd-sched-time">${esc(t.time)}</span>
            <div class="pd-sched-dot" style="background:${SCHED_COLORS[i % SCHED_COLORS.length]}"></div>
            <span class="pd-sched-subject">${esc(t.subject)}</span>
            <span class="pd-sched-teacher">${esc(t.teacher)}</span>
          </div>`
              )
              .join('');
          }
        }

        const examsBody = root.querySelector('#pd-exams-body');
        if (examsBody) {
          if (!examRows.length || !child) {
            examsBody.innerHTML = `<div class="pd-empty"><div class="pd-empty-ic">✏️</div><div class="pd-empty-txt">No upcoming exams scheduled.</div></div>`;
          } else {
            examsBody.innerHTML = examRows
              .map(
                (e) => `
            <div class="pd-exam-row" data-nav="/dashboard/parent/exams">
              <div class="pd-exam-date">
                <div class="pd-exam-day">${esc(e.day)}</div>
                <div class="pd-exam-mon">${esc(e.mon)}</div>
              </div>
              <div style="flex:1">
                <div class="pd-exam-name">${esc(e.name)}</div>
                <div class="pd-exam-sub">${esc(e.sub)}</div>
              </div>
              <span class="pd-exam-chip">Upcoming</span>
            </div>`
              )
              .join('');
          }
        }

        const noticesBody = root.querySelector('#pd-notices-body');
        if (noticesBody) noticesBody.innerHTML = noticesHtml || '';

        const msgBody = root.querySelector('#pd-messages-body');
        if (msgBody) msgBody.innerHTML = messagesHtml || '';

        const badge = root.querySelector('#pd-notif-badge') as HTMLElement | null;
        if (badge) {
          if (unreadInbox > 0) {
            badge.textContent = String(unreadInbox);
            badge.style.display = 'flex';
          } else {
            badge.style.display = 'none';
          }
        }

        const pay = root.querySelector('#pd-btn-pay-now');
        const mm = root.querySelector('#pd-btn-mobile-money');
        const bank = root.querySelector('#pd-btn-bank');
        const sidQ = child?.student_id || '';
        if (pay) {
          (pay as HTMLElement).onclick = () => navigate(`/dashboard/parent/fees${sidQ ? `?child=${sidQ}` : ''}`);
        }
        if (mm) {
          (mm as HTMLElement).onclick = () =>
            navigate(`/dashboard/parent/fees${sidQ ? `?child=${sidQ}&method=mobile_money` : '?method=mobile_money'}`);
        }
        if (bank) {
          (bank as HTMLElement).onclick = () =>
            navigate(`/dashboard/parent/fees${sidQ ? `?child=${sidQ}&method=bank_transfer` : '?method=bank_transfer'}`);
        }

      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeStudentId]);

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
