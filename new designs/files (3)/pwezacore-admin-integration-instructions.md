# PwezaCore Admin Dashboard — React Integration Instructions
## For: Cursor AI / Developer

---

## Overview of Problems Fixed in the New HTML

| Problem | Root Cause | Fix Applied |
|---|---|---|
| Dashboard doesn't fill screen | Old HTML used `position:fixed` sidebar + `margin-left` on main. React's root div constrained this. | New HTML has NO layout chrome. It's content-only. The sidebar/topbar is React's existing AdminLayout. |
| Sidebar click reverts to old design | Nav clicks triggered React Router, which unmounted the injected HTML component entirely. | New HTML uses `data-nav` attributes. React reads these and calls `useNavigate()`. No full remount. |
| Placeholder data not filling in | Old class selectors didn't match. DOM queries ran before HTML was injected. | New HTML uses stable, unique `data-kpi` attributes + `id` attributes for every injectable node. |
| Mobile unfriendly | Old HTML had fixed pixel widths. | New HTML uses CSS Grid with breakpoints at 1100px, 768px, 480px. |
| Slow to load | Data fetches ran sequentially. All data waited before render. | Instructions below show how to render HTML immediately and fill data progressively. |

---

## Step 1 — Replace the HTML file

Replace the contents of `new designs/pwezacore-admin-dashboard.html` with the new HTML file provided (`pwezacore-admin-dashboard-react.html`).

**Critical:** The new file wraps everything in `.pweza-admin`. All CSS is scoped to this class — nothing leaks into the rest of your React app.

---

## Step 2 — Update DesignAdminDashboard.tsx

Here is the complete updated component. Copy this exactly.

```tsx
// src/pages/admin/components/DesignAdminDashboard.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  schoolId: string;
}

export default function DesignAdminDashboard({ schoolId }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // ─── 1. INJECT HTML IMMEDIATELY (no waiting for data) ───────────────────
  useEffect(() => {
    import('new designs/pwezacore-admin-dashboard.html?raw').then((mod) => {
      // Extract only the body content inside .pweza-admin
      const raw: string = mod.default;
      const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const content = bodyMatch ? bodyMatch[1].trim() : raw;
      // Fix any CSS typos
      const fixed = content.replace(/::root/g, ':root');
      setHtmlContent(fixed);
    });
  }, []);

  // ─── 2. WIRE INTERACTIONS after HTML is injected ────────────────────────
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    const el = containerRef.current;

    // 2a. SPA navigation — data-nav attributes
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as Element).closest('[data-nav]');
      if (target) {
        e.preventDefault();
        const path = target.getAttribute('data-nav');
        if (path) navigate(path);
      }
    };
    el.addEventListener('click', handleClick);

    // 2b. Search input
    const searchInput = el.querySelector('#pa-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value.trim();
        clearTimeout(searchTimeoutRef.current);
        if (val.length < 2) return;
        searchTimeoutRef.current = setTimeout(() => runSearch(val, el), 300);
      });
    }

    // 2c. Expense approve/decline buttons (delegated)
    el.addEventListener('click', async (e: MouseEvent) => {
      const approveBtn = (e.target as Element).closest('.pa-ea-btn.approve');
      const declineBtn = (e.target as Element).closest('.pa-ea-btn.decline');
      if (!approveBtn && !declineBtn) return;

      const row = (approveBtn || declineBtn)!.closest('.pa-expense-row') as HTMLElement;
      if (!row) return;

      const expenseId = row.getAttribute('data-expense-id');
      if (!expenseId) return;

      const action = approveBtn ? 'approve' : 'reject';
      row.style.opacity = '0.4';
      row.style.pointerEvents = 'none';

      try {
        await fetch('/api/accountant/approve-expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expenseId, action }),
        });
        // Update badge count
        const countEl = el.querySelector('#pa-expense-count');
        if (countEl) {
          const current = parseInt(countEl.textContent || '0', 10);
          if (current > 1) {
            countEl.textContent = `${current - 1} pending`;
          } else {
            countEl.textContent = '0 pending';
          }
        }
      } catch {
        row.style.opacity = '1';
        row.style.pointerEvents = '';
      }
    });

    return () => {
      el.removeEventListener('click', handleClick);
      clearTimeout(searchTimeoutRef.current);
    };
  }, [htmlContent, navigate]);

  // ─── 3. LOAD DATA PROGRESSIVELY (don't block render) ────────────────────
  useEffect(() => {
    if (!htmlContent || !containerRef.current || !schoolId) return;
    const el = containerRef.current;

    // Helper to safely set a DOM node's text
    const setText = (selector: string, value: string) => {
      const node = el.querySelector(selector);
      if (node) node.textContent = value;
    };
    const setHtml = (id: string, html: string) => {
      const node = el.querySelector(`#${id}`);
      if (node) node.innerHTML = html;
    };
    const setAttr = (selector: string, attr: string, value: string) => {
      const node = el.querySelector(selector);
      if (node) node.setAttribute(attr, value);
    };

    // Run all data fetches — each updates the DOM as it resolves
    loadKPIs(schoolId, setText, el);
    loadStaff(schoolId, setHtml);
    loadExpenses(schoolId, setHtml, el);
    loadPayments(schoolId, setHtml);
    loadUpcoming(schoolId, setHtml);
    loadReminder(schoolId, setText);
    loadJobVacancies(schoolId, setHtml);
  }, [htmlContent, schoolId]);

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width: '100%', minHeight: '100vh' }}
    />
  );
}

// ─── SEARCH ─────────────────────────────────────────────────────────────────
async function runSearch(query: string, container: HTMLElement) {
  try {
    const [studentsRes, teachersRes] = await Promise.all([
      supabase.from('students').select('id, name, class').ilike('name', `%${query}%`).limit(5),
      supabase.from('teachers').select('id, name, subject').ilike('name', `%${query}%`).limit(3),
    ]);

    const results = [
      ...(studentsRes.data || []).map((s) => ({
        label: s.name,
        sub: `Student · ${s.class || ''}`,
        path: `/dashboard/admin/students`,
      })),
      ...(teachersRes.data || []).map((t) => ({
        label: t.name,
        sub: `Teacher · ${t.subject || ''}`,
        path: `/dashboard/admin/teachers`,
      })),
    ];

    // Remove existing dropdown
    container.querySelector('#pa-search-dropdown')?.remove();
    if (results.length === 0) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'pa-search-dropdown';
    Object.assign(dropdown.style, {
      position: 'absolute',
      top: '38px',
      left: '0',
      right: '0',
      background: '#0b1120',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '9px',
      zIndex: '999',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    });

    results.forEach((r) => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12.5px;color:#eef3ff;';
      item.innerHTML = `<div style="font-weight:600">${r.label}</div><div style="font-size:10.5px;color:#3d5278;margin-top:1px">${r.sub}</div>`;
      item.onmouseenter = () => { item.style.background = '#101828'; };
      item.onmouseleave = () => { item.style.background = ''; };
      item.onclick = () => {
        dropdown.remove();
        window.dispatchEvent(new CustomEvent('pweza-navigate', { detail: r.path }));
      };
      dropdown.appendChild(item);
    });

    const wrap = container.querySelector('.pa-search-wrap') as HTMLElement;
    if (wrap) {
      wrap.style.position = 'relative';
      wrap.appendChild(dropdown);
      // Close on outside click
      const closeDropdown = (e: MouseEvent) => {
        if (!dropdown.contains(e.target as Node)) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      };
      setTimeout(() => document.addEventListener('click', closeDropdown), 100);
    }
  } catch (err) {
    console.error('Search error:', err);
  }
}

// ─── KPIs ────────────────────────────────────────────────────────────────────
async function loadKPIs(
  schoolId: string,
  setText: (sel: string, val: string) => void,
  el: HTMLElement
) {
  try {
    // Get current term
    const { data: terms } = await supabase
      .from('school_terms')
      .select('id, start_date, end_date')
      .eq('school_id', schoolId)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .limit(1);

    const termId = terms?.[0]?.id;
    const today = new Date().toISOString().split('T')[0];

    const [studentsRes, teachersRes, attendanceRes, paymentsRes, expensesRes, classesRes, jobsRes] =
      await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('student_attendance').select('status').eq('school_id', schoolId).eq('date', today),
        termId
          ? supabase.from('student_payments').select('amount').eq('school_id', schoolId).eq('term_id', termId)
          : Promise.resolve({ data: [] }),
        supabase.from('school_expenses').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'pending'),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('school_id', schoolId),
        supabase.from('job_vacancies').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'open'),
      ]);

    // Students
    const totalStudents = studentsRes.count ?? 0;
    setText('[data-kpi="total-students"]', String(totalStudents));
    setText('[data-kpi="students-sub"]', 'Active enrollments');

    // Teachers
    const totalTeachers = teachersRes.count ?? 0;
    setText('[data-kpi="total-teachers"]', String(totalTeachers));

    // Fees
    const payments = (paymentsRes as any).data ?? [];
    const feesCollected = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const feesFormatted = feesCollected >= 1000000
      ? `USh ${(feesCollected / 1000000).toFixed(2)}M`
      : `USh ${feesCollected.toLocaleString()}`;
    setText('[data-kpi="fees-collected"]', feesFormatted);

    // Attendance
    const attRecords = attendanceRes.data ?? [];
    const present = attRecords.filter((r: any) => r.status === 'present').length;
    const total = attRecords.length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    setText('[data-kpi="attendance-today"]', `${pct}%`);
    setText('[data-kpi="attendance-sub"]', `${present} / ${total} present`);
    setText('[data-kpi="enrolled-count"]', String(totalStudents));
    setText('[data-kpi="absent-today"]', String(total - present));
    setText('[data-kpi="avg-attendance"]', `${pct}%`);

    // Pending expenses
    setText('[data-kpi="pending-expenses"]', String(expensesRes.count ?? 0));
    const expCount = el.querySelector('#pa-expense-count');
    if (expCount) expCount.textContent = `${expensesRes.count ?? 0} pending`;

    // Active classes
    setText('[data-kpi="active-classes"]', String(classesRes.count ?? 0));

    // Job applications
    setText('[data-kpi="job-applications"]', String(jobsRes.count ?? 0));

  } catch (err) {
    console.error('KPI load error:', err);
  }
}

// ─── STAFF ───────────────────────────────────────────────────────────────────
async function loadStaff(schoolId: string, setHtml: (id: string, html: string) => void) {
  try {
    const { data } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .eq('school_id', schoolId)
      .limit(5);

    if (!data || data.length === 0) {
      setHtml('pa-staff-list', '<div class="pa-empty-state"><span>No staff found</span></div>');
      return;
    }

    const gradients = [
      'linear-gradient(135deg,#10d9a8,#3d8ef8)',
      'linear-gradient(135deg,#9d7bf8,#ec4899)',
      'linear-gradient(135deg,#f5a623,#ef4444)',
      'linear-gradient(135deg,#22d3ee,#3d8ef8)',
      'linear-gradient(135deg,#f75c5c,#f5a623)',
    ];

    const html = data.map((t, i) => {
      const initials = t.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'T';
      const bg = gradients[i % gradients.length];
      return `
        <div class="pa-staff-row">
          <div class="pa-staff-av" style="background:${bg}">${initials}</div>
          <div style="flex:1;">
            <div class="pa-staff-name">${t.name || '—'}</div>
            <div class="pa-staff-sub">${t.subject || 'Teacher'}</div>
          </div>
          <span class="pa-chip teal">● Teaching</span>
        </div>`;
    }).join('');

    setHtml('pa-staff-list', html);
  } catch (err) {
    console.error('Staff load error:', err);
  }
}

// ─── EXPENSES ────────────────────────────────────────────────────────────────
async function loadExpenses(
  schoolId: string,
  setHtml: (id: string, html: string) => void,
  el: HTMLElement
) {
  try {
    const { data: expenses } = await supabase
      .from('school_expenses')
      .select('id, title, amount, recorded_by, created_at')
      .eq('school_id', schoolId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!expenses || expenses.length === 0) {
      setHtml('pa-expenses-list', '<div class="pa-empty-state"><span>No pending expenses ✓</span></div>');
      return;
    }

    const icons = ['🖨️', '🔧', '📚', '🚌', '📄'];
    const iconBgs = ['var(--amber-s)', 'var(--blue-s)', 'var(--teal-s)', 'var(--rose-s)', 'var(--violet-s)'];

    const html = expenses.map((exp, i) => {
      const amt = Number(exp.amount).toLocaleString();
      const date = exp.created_at ? new Date(exp.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : '';
      return `
        <div class="pa-expense-row" data-expense-id="${exp.id}">
          <div class="pa-expense-ic" style="background:${iconBgs[i % iconBgs.length]}">${icons[i % icons.length]}</div>
          <div style="flex:1;">
            <div class="pa-expense-title">${exp.title || 'Expense'}</div>
            <div class="pa-expense-sub">Submitted ${date}</div>
          </div>
          <div class="pa-expense-amount">USh ${amt}</div>
          <div class="pa-ea-btns">
            <button class="pa-ea-btn approve">✓ Approve</button>
            <button class="pa-ea-btn decline">✕ Decline</button>
          </div>
        </div>`;
    }).join('');

    setHtml('pa-expenses-list', html);
  } catch (err) {
    console.error('Expenses load error:', err);
  }
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
async function loadPayments(schoolId: string, setHtml: (id: string, html: string) => void) {
  try {
    // Get current term first
    const { data: terms } = await supabase
      .from('school_terms')
      .select('id')
      .eq('school_id', schoolId)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .limit(1);

    const termId = terms?.[0]?.id;
    if (!termId) {
      setHtml('pa-payments-list', '<div class="pa-empty-state"><span>No payments this term</span></div>');
      return;
    }

    const { data: payments } = await supabase
      .from('student_payments')
      .select('id, amount, payment_method, payment_date, students!inner(name)')
      .eq('school_id', schoolId)
      .eq('term_id', termId)
      .order('payment_date', { ascending: false })
      .limit(5);

    if (!payments || payments.length === 0) {
      setHtml('pa-payments-list', '<div class="pa-empty-state"><span>No payments found</span></div>');
      return;
    }

    const gradients = [
      'linear-gradient(135deg,#10d9a8,#3d8ef8)',
      'linear-gradient(135deg,#9d7bf8,#f43f5e)',
      'linear-gradient(135deg,#f5a623,#ef4444)',
      'linear-gradient(135deg,#22d3ee,#9d7bf8)',
      'linear-gradient(135deg,#3d8ef8,#10d9a8)',
    ];

    const html = payments.map((p: any, i: number) => {
      const name = p.students?.name || 'Student';
      const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
      const amt = Number(p.amount).toLocaleString();
      const date = p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : '—';
      const method = p.payment_method || 'Cash';
      return `
        <div class="pa-pay-row">
          <div class="pa-pay-av" style="background:${gradients[i % gradients.length]}">${initials}</div>
          <div style="flex:1;">
            <div class="pa-pay-name">${name}</div>
            <div class="pa-pay-meta">${date}</div>
          </div>
          <span class="pa-pay-method">${method}</span>
          <div class="pa-pay-amount">USh ${amt}</div>
        </div>`;
    }).join('');

    setHtml('pa-payments-list', html);
  } catch (err) {
    console.error('Payments load error:', err);
  }
}

// ─── UPCOMING ────────────────────────────────────────────────────────────────
async function loadUpcoming(schoolId: string, setHtml: (id: string, html: string) => void) {
  try {
    const currentYear = new Date().getFullYear();
    const { data: exams } = await supabase
      .from('exam_sets')
      .select('id, name, start_date, end_date, term')
      .eq('school_id', schoolId)
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(5);

    if (!exams || exams.length === 0) {
      setHtml('pa-upcoming-list', '<div class="pa-empty-state"><span>No upcoming events</span></div>');
      return;
    }

    const urgencyChips: Record<number, string> = {
      0: '<span class="pa-chip rose">Urgent</span>',
      1: '<span class="pa-chip amber">Soon</span>',
      2: '<span class="pa-chip blue">Planned</span>',
      3: '<span class="pa-chip violet">Term End</span>',
      4: '<span class="pa-chip teal">Upcoming</span>',
    };

    const html = exams.map((exam: any, i: number) => {
      const d = new Date(exam.start_date);
      const day = d.getDate().toString().padStart(2, '0');
      const mon = d.toLocaleString('en', { month: 'short' }).toUpperCase();
      const chip = urgencyChips[Math.min(i, 4)];
      return `
        <div class="pa-upcoming-item">
          <div class="pa-upcoming-date">
            <div class="pa-ud-day">${day}</div>
            <div class="pa-ud-mon">${mon}</div>
          </div>
          <div class="pa-upcoming-sep"></div>
          <div style="flex:1;">
            <div class="pa-upcoming-title">${exam.name || 'Exam'}</div>
            <div class="pa-upcoming-sub">${exam.term ? `Term ${exam.term}` : ''}</div>
          </div>
          ${chip}
        </div>`;
    }).join('');

    setHtml('pa-upcoming-list', html);
  } catch (err) {
    console.error('Upcoming load error:', err);
  }
}

// ─── REMINDER ────────────────────────────────────────────────────────────────
async function loadReminder(schoolId: string, setText: (sel: string, val: string) => void) {
  try {
    const { data } = await supabase
      .from('notifications')
      .select('title, message, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data[0]) {
      setText('#pa-reminder-title', data[0].title || 'Reminder');
      setText('#pa-reminder-text', data[0].message || '—');
    } else {
      setText('#pa-reminder-title', 'No upcoming reminders');
      setText('#pa-reminder-text', 'All caught up!');
    }
  } catch (err) {
    console.error('Reminder load error:', err);
  }
}

// ─── JOB VACANCIES ───────────────────────────────────────────────────────────
async function loadJobVacancies(schoolId: string, setHtml: (id: string, html: string) => void) {
  try {
    const { data } = await supabase
      .from('job_vacancies')
      .select('id, title, created_at, applications_count')
      .eq('school_id', schoolId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(3);

    if (!data || data.length === 0) {
      setHtml('pa-jobs-list', '<div class="pa-empty-state" style="padding:16px"><span>No open vacancies</span></div>');
      return;
    }

    const icons = ['⚗️', '📚', '🔭'];
    const chips = ['pa-chip teal', 'pa-chip violet', 'pa-chip blue'];

    const html = data.map((job: any, i: number) => {
      const date = job.created_at ? new Date(job.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : '';
      const apps = job.applications_count ?? 0;
      return `
        <div class="pa-job-row" data-nav="/dashboard/admin/job-vacancies">
          <div style="width:30px;height:30px;border-radius:8px;background:var(--teal-s);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${icons[i % icons.length]}</div>
          <div style="flex:1;">
            <div class="pa-job-title">${job.title || 'Position'}</div>
            <div class="pa-job-sub">Posted ${date}</div>
          </div>
          <span class="${chips[i % chips.length]}">${apps} applied</span>
        </div>`;
    }).join('');

    setHtml('pa-jobs-list', html);
  } catch (err) {
    console.error('Jobs load error:', err);
  }
}
```

---

## Step 3 — Remove the Layout Bypass in AdminLayout.tsx

The old code had a special case:
```tsx
// OLD — REMOVE THIS
if (location.pathname === '/dashboard/admin') {
  return <Outlet />;
}
```

**Remove that block entirely.** The new design works inside the normal AdminLayout chrome (with the sidebar + topbar React renders). The injected HTML only controls the main content area — it no longer tries to render its own sidebar.

---

## Step 4 — Update AdminDashboard.tsx to pass schoolId

Make sure `Dashboard.tsx` passes the `schoolId` to the component:

```tsx
// src/pages/admin/Dashboard.tsx (the part that renders the design)
import DesignAdminDashboard from './components/DesignAdminDashboard';

// Inside the component, after effectiveSchoolId is resolved:
return <DesignAdminDashboard schoolId={effectiveSchoolId} />;
```

---

## Step 5 — Handle the search navigate event

In the search function, we dispatch a custom event. Wire this up in `DesignAdminDashboard.tsx`:

```tsx
useEffect(() => {
  const handler = (e: Event) => {
    navigate((e as CustomEvent).detail);
  };
  window.addEventListener('pweza-navigate', handler);
  return () => window.removeEventListener('pweza-navigate', handler);
}, [navigate]);
```

---

## Step 6 — Mobile Viewport

Make sure your root `index.html` has:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

The new HTML's CSS breakpoints will handle the rest:
- **≥ 1100px** — 4-column KPI grid, 2-column layouts
- **768px–1100px** — 2-column KPI grid, single-column layouts
- **≤ 768px** — 2-column KPI grid, filter selects hidden, buttons reduced
- **≤ 480px** — compact everything, 2-column quick actions

---

## CSS Scoping — Why This Approach

All styles in the new HTML are prefixed `.pweza-admin`. This means:

1. ✅ Styles don't leak into AdminLayout's sidebar, topbar, or any other React components
2. ✅ The existing React component styles don't affect the dashboard content
3. ✅ You can update the dashboard HTML/CSS without touching any other part of the codebase

---

## Data Selector Reference

When adding new data to the dashboard, use these selectors:

| Data | Selector | Method |
|---|---|---|
| Total students | `[data-kpi="total-students"]` | `textContent` |
| Total teachers | `[data-kpi="total-teachers"]` | `textContent` |
| Fees collected | `[data-kpi="fees-collected"]` | `textContent` |
| Outstanding fees | `[data-kpi="outstanding-fees"]` | `textContent` |
| Attendance today | `[data-kpi="attendance-today"]` | `textContent` |
| Attendance sub | `[data-kpi="attendance-sub"]` | `textContent` |
| Pending expenses | `[data-kpi="pending-expenses"]` | `textContent` |
| Active classes | `[data-kpi="active-classes"]` | `textContent` |
| Job applications | `[data-kpi="job-applications"]` | `textContent` |
| Staff list | `#pa-staff-list` | `innerHTML` |
| Expenses list | `#pa-expenses-list` | `innerHTML` |
| Payments list | `#pa-payments-list` | `innerHTML` |
| Upcoming list | `#pa-upcoming-list` | `innerHTML` |
| Reminder title | `#pa-reminder-title` | `textContent` |
| Reminder text | `#pa-reminder-text` | `textContent` |
| Jobs list | `#pa-jobs-list` | `innerHTML` |
| Expense count badge | `#pa-expense-count` | `textContent` |
| Fee progress bar | `#pa-fee-progress` | `style.width` |
| Donut percentage | `#pa-donut-pct` | `textContent` |

---

## Performance Notes

- The HTML injects and renders immediately — users see the layout with loading states within ~50ms
- KPIs, staff, expenses, payments, upcoming items, and reminders all load independently in parallel
- Each section updates the DOM as its own query resolves — no single slow query blocks everything
- The old approach waited for ALL data before showing ANYTHING — this was the main source of slowness

---

## Common Mistakes to Avoid

| ❌ Don't | ✅ Do |
|---|---|
| Add `position:fixed` to any `.pweza-admin` element | Use `position:sticky` for topbar only |
| Use `overflow:hidden` on the root `.pweza-admin` | Let content scroll naturally |
| Put `<style>` tags outside `.pweza-admin` scope | Keep all styles inside `.pweza-admin {}` selectors |
| Use `window.location.href` for navigation | Always use `useNavigate()` or `data-nav` attribute + click handler |
| Query DOM before `htmlContent` state is set | Always check `if (!htmlContent || !containerRef.current)` first |
| Use `document.querySelector()` | Always use `containerRef.current.querySelector()` to stay scoped |
