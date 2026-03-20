# PwezaCore — All Role Dashboards: Developer Integration Guide

## Implemented in this repo (Vite + React)

| Area | Use |
|------|-----|
| Supabase client | `import { supabase } from '@/lib/supabase'` (not `@/integrations/supabase/client`) |
| Auth profile row | `public.users` keyed by **`user_id`** (matches `auth.users.id`), not `users.id` |
| HTML + CSS | `extractStyleAndBody()` from `@/lib/designDashboardHtml` — inject **`<style>`** and **body** (design files are `*-react.html` under `new designs/`) |
| Navigation | `useDesignDashboardNav(containerRef, navigate, true)` — **delegated** `[data-nav]` clicks (works after list `innerHTML` updates) |
| Theme | `useDesignDashboardThemeSync(true)` — toggles `html.light` vs dark |
| Lab route | App uses `/dashboard/lab-technician` (component: `DesignLabDashboard.tsx`) |

**Current route wiring** (`src/App.tsx`): Teacher, Student, Parent, Accountant, Librarian, Lab technician, and Clinician index routes load the **Design\*** dashboard components that map to the HTML files in the table below.

---

## How This Works

Each dashboard follows the **same 4-step pattern**:

1. **Save the HTML file** → `new designs/pwezacore-[role]-dashboard.html`
2. **Create the TSX component** → `src/pages/[role]/Design[Role]Dashboard.tsx`
3. **Swap the route** in `App.tsx`
4. **Wire Supabase data** using the selector table provided

### The HTML injection pattern (same for every dashboard)

```tsx
// Module-level cache — HTML parsed once, never re-parsed on remount
let cachedHtml: string | null = null;

useEffect(() => {
  if (cachedHtml) { setHtmlContent(cachedHtml); return; }
  import('new designs/pwezacore-[role]-dashboard.html?raw').then((mod) => {
    const raw: string = mod.default;
    const match = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    cachedHtml = match ? match[1].trim() : raw;
    setHtmlContent(cachedHtml);
  });
}, []);
```

### Writing to the DOM (same for every dashboard)

```tsx
// Always wrap in requestAnimationFrame after dangerouslySetInnerHTML
requestAnimationFrame(() => {
  const el = containerRef.current;
  // Set a single text value
  const n = el.querySelector('[data-kpi="fees-collected"]');
  if (n) n.textContent = 'UGX 4,200,000';

  // Set innerHTML of a list
  const list = el.querySelector('#pt-classes-list');
  if (list) list.innerHTML = `<div>...row HTML...</div>`;
});
```

### Navigation wiring (same for every dashboard)

```tsx
// Wire all data-nav buttons once after HTML is injected
useEffect(() => {
  if (!htmlContent || !containerRef.current) return;
  containerRef.current.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', () => {
      const path = el.getAttribute('data-nav');
      if (path) navigate(path);
    });
  });
}, [htmlContent, navigate]);
```

### Theme sync (same for every dashboard)

```tsx
// Sync theme on mount and whenever html class changes
useEffect(() => {
  if (!containerRef.current) return;
  const syncTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
  };
  syncTheme();
  const observer = new MutationObserver(syncTheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  return () => observer.disconnect();
}, [htmlContent]);
```

---

## HTML File Reference

| Role | HTML File | CSS Scope | Prefix |
|---|---|---|---|
| Teacher | `pwezacore-teacher-dashboard-react.html` | `.pw-teacher` | `pt-` |
| Accountant | `pwezacore-accountant-dashboard-react.html` | `.pw-acct` | `pa-` |
| Student | `pwezacore-student-dashboard-react.html` | `.pw-student` | `pst-` |
| Parent | `pwezacore-parent-dashboard-react.html` | `.pw-parent` | `pp-` |
| Librarian | `pwezacore-librarian-dashboard-react.html` | `.pw-lib` | `pl-` |
| Clinician | `pwezacore-clinician-dashboard-react.html` | `.pw-clinic` | `pc-` |
| Lab Tech | `pwezacore-lab-technician-dashboard-react.html` | `.pw-lab` | `plb-` |

---

---

# 1. TEACHER DASHBOARD

**File:** `pwezacore-teacher-dashboard-react.html`
**Route:** `/dashboard/teacher`
**Layout:** `TeacherLayout` (provides sidebar + topbar)

## DOM Selector Reference

| What to update | Selector | Method |
|---|---|---|
| Greeting | `#pt-greeting` | `.textContent` |
| Date line | `#pt-date-line` | `.textContent` |
| Total classes | `[data-kpi="total-classes"]` | `.textContent` |
| Total students | `[data-kpi="total-students"]` | `.textContent` |
| Open assignments | `[data-kpi="open-assignments"]` | `.textContent` |
| Attendance today | `[data-kpi="attendance-today"]` | `.textContent` |
| Attendance progress bar | `[data-kpi-width="attend-progress"]` | `.style.width = "72%"` |
| Classes list | `#pt-classes-list` | `.innerHTML` |
| Schedule list | `#pt-schedule-list` | `.innerHTML` |
| Assignments list | `#pt-assignments-list` | `.innerHTML` |
| Activity list | `#pt-activity-list` | `.innerHTML` |

## Copy-paste TSX Component

```tsx
// src/pages/teacher/DesignTeacherDashboard.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let cachedHtml: string | null = null;

const GRADIENTS = [
  'linear-gradient(135deg,#4f8ef7,#38bdf8)',
  'linear-gradient(135deg,#10d9a8,#4f8ef7)',
  'linear-gradient(135deg,#8b5cf6,#4f8ef7)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#22c55e,#10d9a8)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

export default function DesignTeacherDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // 1. Inject HTML
  useEffect(() => {
    if (cachedHtml) { setHtmlContent(cachedHtml); return; }
    import('new designs/pwezacore-teacher-dashboard.html?raw').then((mod) => {
      const match = (mod.default as string).match(/<body[^>]*>([\s\S]*)<\/body>/i);
      cachedHtml = match ? match[1].trim() : mod.default;
      setHtmlContent(cachedHtml);
    });
  }, []);

  // 2. Fetch and render data
  useEffect(() => {
    if (!htmlContent) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('school_id, name').eq('id', user.id).single();
      if (!userData?.school_id) return;
      const sid = userData.school_id;
      const today = new Date().toISOString().split('T')[0];

      // Run queries in parallel
      const [classesRes, assignmentsRes, attendanceRes] = await Promise.all([
        supabase.from('classes').select('id, name, subject, student_count').eq('teacher_id', user.id),
        supabase.from('assignments').select('id, title, class_id, due_date, status').eq('teacher_id', user.id).eq('status', 'open'),
        supabase.from('student_attendance').select('status').eq('teacher_id', user.id).eq('date', today),
      ]);

      const classes = classesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const attendance = attendanceRes.data || [];
      const totalStudents = classes.reduce((sum: number, c: any) => sum + (c.student_count || 0), 0);
      const presentCount = attendance.filter((a: any) => a.status === 'present').length;
      const attendPct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => {
          const n = el.querySelector(sel); if (n) n.textContent = val;
        };

        // Greeting
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const name = userData.name?.split(' ')[0] || 'Teacher';
        set('#pt-greeting', `${greet}, ${name} 👋`);
        set('#pt-date-line', new Date().toLocaleDateString('en-UG', { weekday:'long', day:'numeric', month:'long', year:'numeric' }));

        // KPIs
        set('[data-kpi="total-classes"]', String(classes.length));
        set('[data-kpi="total-students"]', String(totalStudents));
        set('[data-kpi="open-assignments"]', String(assignments.length));
        set('[data-kpi="attendance-today"]', `${attendPct}%`);
        const progBar = el.querySelector('[data-kpi-width="attend-progress"]') as HTMLElement;
        if (progBar) progBar.style.width = `${attendPct}%`;

        // Classes list
        const classesList = el.querySelector('#pt-classes-list');
        if (classesList) {
          classesList.innerHTML = classes.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No classes assigned yet.</div>`
            : classes.map((c: any, i: number) => `
              <div class="pt-class-row" data-nav="/dashboard/teacher/classes/${c.id}">
                <div class="pt-class-av" style="background:${grad(i)}">${c.subject?.[0] || '📚'}</div>
                <div style="flex:1">
                  <div class="pt-class-name">${c.name}</div>
                  <div class="pt-class-sub">${c.subject || ''} · ${c.student_count || 0} students</div>
                </div>
                <span class="pt-chip indigo">${c.student_count || 0}</span>
              </div>`).join('');
        }

        // Assignments list
        const assignList = el.querySelector('#pt-assignments-list');
        if (assignList) {
          assignList.innerHTML = assignments.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No open assignments.</div>`
            : assignments.slice(0, 5).map((a: any) => {
                const due = a.due_date ? new Date(a.due_date).toLocaleDateString('en-UG', { day:'numeric', month:'short' }) : 'No due date';
                const isToday = a.due_date === today;
                return `
                  <div class="pt-assign-row" data-nav="/dashboard/teacher/assignments/${a.id}">
                    <div style="flex:1">
                      <div class="pt-assign-title">${a.title}</div>
                      <div class="pt-assign-sub">Due ${due}</div>
                    </div>
                    <span class="pt-chip ${isToday ? 'rose' : 'amber'}">${isToday ? '📅 Today' : due}</span>
                  </div>`;
              }).join('');
        }
      });
    }
    load();
  }, [htmlContent]);

  // 3. Wire navigation
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    containerRef.current.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-nav') || '/'));
    });
  }, [htmlContent, navigate]);

  // 4. Theme sync
  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () => {
      const dark = document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('light', !dark);
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class','data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width:'100%', minHeight:'100vh', display:'block' }} />
  );
}
```

## Route change

```tsx
// In App.tsx — swap this:
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
// For this:
import DesignTeacherDashboard from '@/pages/teacher/DesignTeacherDashboard';

// Route stays the same:
<Route path="teacher" element={<TeacherLayout />}>
  <Route index element={<DesignTeacherDashboard />} />
  ...
</Route>
```

## Supabase tables used

| Table | Columns | Filter |
|---|---|---|
| `users` | `school_id`, `name` | `id = user.id` |
| `classes` | `id`, `name`, `subject`, `student_count` | `teacher_id = user.id` |
| `assignments` | `id`, `title`, `class_id`, `due_date`, `status` | `teacher_id`, `status = open` |
| `student_attendance` | `status` | `teacher_id`, `date = today` |

---

---

# 2. ACCOUNTANT DASHBOARD

**File:** `pwezacore-accountant-dashboard-react.html`
**Route:** `/dashboard/accountant`
**Layout:** `AccountantLayout`

## DOM Selector Reference

| What to update | Selector | Method |
|---|---|---|
| Greeting | `#pa-greeting` | `.textContent` |
| Date line | `#pa-date-line` | `.textContent` |
| Fees collected | `[data-kpi="fees-collected"]` | `.textContent` |
| Total expected | `[data-kpi="fees-expected"]` | `.textContent` |
| Outstanding balance | `[data-kpi="outstanding-balance"]` | `.textContent` |
| Collected today | `[data-kpi="collected-today"]` | `.textContent` |
| Total expenses | `[data-kpi="total-expenses"]` | `.textContent` |
| Net cash | `[data-kpi="net-cash"]` | `.textContent` |
| Pending invoices | `[data-kpi="pending-invoices"]` | `.textContent` |
| Bank balance | `[data-kpi="bank-balance"]` | `.textContent` |
| Collection rate | `#pa-collection-pct` | `.textContent` |
| Fee progress bar | `#pa-progress-bar` | `.style.width` |
| Transactions list | `#pa-transactions-list` | `.innerHTML` |
| Outstanding list | `#pa-outstanding-list` | `.innerHTML` |
| Invoices list | `#pa-invoices-list` | `.innerHTML` |
| Reminder text | `#pa-reminder-text` | `.textContent` |
| Stanbic balance | `[data-kpi="bank-stanbic"]` | `.textContent` |
| DFCU balance | `[data-kpi="bank-dfcu"]` | `.textContent` |

## Copy-paste TSX Component

```tsx
// src/pages/accountant/DesignAccountantDashboard.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let cachedHtml: string | null = null;

const GRADIENTS = [
  'linear-gradient(135deg,#00d084,#10d9a8)',
  'linear-gradient(135deg,#3d8ef8,#10d9a8)',
  'linear-gradient(135deg,#8b5cf6,#3d8ef8)',
  'linear-gradient(135deg,#f43f5e,#f59e0b)',
  'linear-gradient(135deg,#f59e0b,#00d084)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];
const fmt = (n: number) => `UGX ${n.toLocaleString()}`;

export default function DesignAccountantDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // 1. Inject HTML
  useEffect(() => {
    if (cachedHtml) { setHtmlContent(cachedHtml); return; }
    import('new designs/pwezacore-accountant-dashboard.html?raw').then((mod) => {
      const match = (mod.default as string).match(/<body[^>]*>([\s\S]*)<\/body>/i);
      cachedHtml = match ? match[1].trim() : mod.default;
      setHtmlContent(cachedHtml);
    });
  }, []);

  // 2. Fetch and render data
  useEffect(() => {
    if (!htmlContent) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('school_id, name').eq('id', user.id).single();
      if (!userData?.school_id) return;
      const sid = userData.school_id;
      const today = new Date().toISOString().split('T')[0];

      const [paymentsRes, invoicesRes, expensesRes, studentsRes] = await Promise.all([
        supabase.from('fee_payments').select('id, student_name, amount, payment_date, method').eq('school_id', sid).order('payment_date', { ascending: false }).limit(20),
        supabase.from('invoices').select('id, student_name, student_class, amount, due_date, status').eq('school_id', sid).eq('status', 'pending').order('due_date'),
        supabase.from('expenses').select('amount, status').eq('school_id', sid).eq('approved', true),
        supabase.from('students').select('id, name, fee_balance').eq('school_id', sid).gt('fee_balance', 0).order('fee_balance', { ascending: false }).limit(5),
      ]);

      const payments = paymentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const expenses = expensesRes.data || [];
      const outstanding = studentsRes.data || [];

      const totalCollected = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const totalExpenses  = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const todayPayments  = payments.filter((p: any) => p.payment_date?.startsWith(today));
      const todayCollected = todayPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const totalOutstanding = outstanding.reduce((s: number, st: any) => s + (st.fee_balance || 0), 0);
      const netCash = totalCollected - totalExpenses;

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => { const n = el.querySelector(sel); if (n) n.textContent = val; };

        // Greeting
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        set('#pa-greeting', `${greet}, ${userData.name?.split(' ')[0] || 'Accountant'} 👋`);
        set('#pa-date-line', new Date().toLocaleDateString('en-UG', { weekday:'long', day:'numeric', month:'long', year:'numeric' }));

        // KPIs
        set('[data-kpi="fees-collected"]', fmt(totalCollected));
        set('[data-kpi="outstanding-balance"]', fmt(totalOutstanding));
        set('[data-kpi="collected-today"]', fmt(todayCollected));
        set('[data-kpi="total-expenses"]', fmt(totalExpenses));
        set('[data-kpi="net-cash"]', fmt(netCash));
        set('[data-kpi="pending-invoices"]', String(invoices.length));

        // Progress bar
        const expected = totalCollected + totalOutstanding;
        const pct = expected > 0 ? Math.round((totalCollected / expected) * 100) : 0;
        (el.querySelector('#pa-progress-bar') as HTMLElement)?.style && ((el.querySelector('#pa-progress-bar') as HTMLElement).style.width = `${pct}%`);
        set('#pa-collection-pct', `${pct}%`);

        // Transactions list
        const txList = el.querySelector('#pa-transactions-list');
        if (txList) {
          txList.innerHTML = payments.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No payments recorded yet.</div>`
            : payments.slice(0, 6).map((p: any, i: number) => {
                const initials = (p.student_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                const date = p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-UG', { day:'numeric', month:'short' }) : '—';
                return `
                  <div class="pa-tx-row">
                    <div class="pa-tx-av" style="background:${grad(i)}">${initials}</div>
                    <div style="flex:1">
                      <div class="pa-tx-name">${p.student_name || '—'}</div>
                      <div class="pa-tx-sub">${p.method || 'Cash'} · ${date}</div>
                    </div>
                    <span class="pa-tx-amt credit">+${fmt(p.amount)}</span>
                  </div>`;
              }).join('');
        }

        // Outstanding list
        const outList = el.querySelector('#pa-outstanding-list');
        if (outList) {
          outList.innerHTML = outstanding.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">All fees paid — great job! 🎉</div>`
            : outstanding.map((s: any, i: number) => {
                const initials = (s.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                return `
                  <div class="pa-out-row">
                    <div class="pa-out-av" style="background:${grad(i+1)}">${initials}</div>
                    <div style="flex:1">
                      <div class="pa-out-name">${s.name}</div>
                      <div class="pa-out-days">Balance due</div>
                    </div>
                    <span class="pa-out-amt">${fmt(s.fee_balance)}</span>
                  </div>`;
              }).join('');
        }

        // Invoices list
        const invList = el.querySelector('#pa-invoices-list');
        if (invList) {
          invList.innerHTML = invoices.length === 0
            ? `<div style="padding:16px 18px;color:var(--t3);font-size:13px">No pending invoices.</div>`
            : invoices.slice(0, 6).map((inv: any) => {
                const due = inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-UG', { day:'numeric', month:'short' }) : '—';
                const isOver = inv.due_date && new Date(inv.due_date) < new Date();
                return `
                  <div style="display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 80px;padding:11px 18px;border-bottom:1px solid var(--border);align-items:center;cursor:pointer;transition:background .14s"
                    onmouseover="this.style.background='var(--s2)'" onmouseout="this.style.background=''">
                    <div>
                      <div style="font-size:12.5px;font-weight:600;color:var(--t1)">${inv.student_name}</div>
                      <div style="font-size:11px;color:var(--t3)">${inv.student_class || ''}</div>
                    </div>
                    <div style="font-size:12px;color:var(--t2);font-family:'JetBrains Mono',monospace">#INV-${String(inv.id).slice(-4).padStart(4,'0')}</div>
                    <div style="font-size:12.5px;font-weight:700;color:var(--t1)">${fmt(inv.amount)}</div>
                    <div style="font-size:12px;color:${isOver ? 'var(--rose)' : 'var(--t2)'}">${due}</div>
                    <span class="pa-chip ${isOver ? 'rose' : 'amber'}">${isOver ? 'Overdue' : 'Pending'}</span>
                  </div>`;
              }).join('');
        }

        // Reminder
        set('#pa-reminder-text', outstanding.length > 0
          ? `${outstanding.length} student${outstanding.length !== 1 ? 's' : ''} have outstanding fee balances totalling ${fmt(totalOutstanding)}. Consider sending reminders.`
          : 'All students are up to date with payments.');
      });
    }
    load();
  }, [htmlContent]);

  // 3. Wire navigation
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    containerRef.current.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-nav') || '/'));
    });
  }, [htmlContent, navigate]);

  // 4. Theme sync
  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () => document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class','data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width:'100%', minHeight:'100vh', display:'block' }} />
  );
}
```

## Route change

```tsx
import DesignAccountantDashboard from '@/pages/accountant/DesignAccountantDashboard';
<Route index element={<DesignAccountantDashboard />} />
```

## Supabase tables used

| Table | Columns | Notes |
|---|---|---|
| `users` | `school_id`, `name` | |
| `fee_payments` | `id`, `student_name`, `amount`, `payment_date`, `method` | Order by `payment_date` desc |
| `invoices` | `id`, `student_name`, `student_class`, `amount`, `due_date`, `status` | Filter `status = pending` |
| `expenses` | `amount`, `status` | Filter `approved = true` |
| `students` | `id`, `name`, `fee_balance` | Filter `fee_balance > 0` |

---

---

# 3. STUDENT DASHBOARD

**File:** `pwezacore-student-dashboard-react.html`
**Route:** `/dashboard/student`
**Layout:** `StudentLayout`

## DOM Selector Reference

| What to update | Selector | Method |
|---|---|---|
| Greeting | `#pst-greeting` | `.textContent` |
| Date line | `#pst-date-line` | `.textContent` |
| Overall average | `[data-kpi="overall-avg"]` | `.textContent` |
| Attendance | `[data-kpi="attendance"]` | `.textContent` |
| Pending assignments | `[data-kpi="pending-assignments"]` | `.textContent` |
| Fee balance | `[data-kpi="fee-balance"]` | `.textContent` |
| Radial — avg | `#pst-radial-avg` | `.textContent` |
| Radial — best | `#pst-radial-best` | `.textContent` |
| Radial — lowest | `#pst-radial-low` | `.textContent` |
| Weak subject name | `#pst-weak-subject` | `.textContent` |
| Subjects list | `#pst-subjects-list` | `.innerHTML` |
| Schedule list | `#pst-schedule-list` | `.innerHTML` |
| Exams list | `#pst-exams-list` | `.innerHTML` |
| Assignments list | `#pst-assignments-list` | `.innerHTML` |
| Fees list | `#pst-fees-list` | `.innerHTML` |
| Teachers list | `#pst-teachers-list` | `.innerHTML` |

## Copy-paste TSX Component

```tsx
// src/pages/student/DesignStudentDashboard.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let cachedHtml: string | null = null;

const GRADIENTS = [
  'linear-gradient(135deg,#6c7ef8,#38bdf8)',
  'linear-gradient(135deg,#10d9a8,#6c7ef8)',
  'linear-gradient(135deg,#a78bfa,#6c7ef8)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#22c55e,#10d9a8)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

export default function DesignStudentDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // 1. Inject HTML
  useEffect(() => {
    if (cachedHtml) { setHtmlContent(cachedHtml); return; }
    import('new designs/pwezacore-student-dashboard.html?raw').then((mod) => {
      const match = (mod.default as string).match(/<body[^>]*>([\s\S]*)<\/body>/i);
      cachedHtml = match ? match[1].trim() : mod.default;
      setHtmlContent(cachedHtml);
    });
  }, []);

  // 2. Fetch and render data
  useEffect(() => {
    if (!htmlContent) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('school_id, name, student_id').eq('id', user.id).single();
      if (!userData?.school_id) return;
      const sid = userData.school_id;
      const studentId = userData.student_id;
      const today = new Date().toISOString().split('T')[0];

      const [gradesRes, assignmentsRes, attendanceRes, feesRes, examsRes, teachersRes] = await Promise.all([
        supabase.from('student_grades').select('subject, score, max_score').eq('student_id', studentId).eq('school_id', sid),
        supabase.from('assignments').select('id, title, subject, due_date, status').eq('student_id', studentId).eq('status', 'pending'),
        supabase.from('student_attendance').select('status, date').eq('student_id', studentId).eq('school_id', sid),
        supabase.from('students').select('fee_balance, fee_total').eq('id', studentId).single(),
        supabase.from('exams').select('id, subject, date, room').eq('school_id', sid).gte('date', today).order('date').limit(5),
        supabase.from('class_teachers').select('teacher_name, subject').eq('school_id', sid).eq('class_id', userData.class_id),
      ]);

      const grades = gradesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const attendance = attendanceRes.data || [];
      const feeData = feesRes.data;
      const exams = examsRes.data || [];
      const teachers = teachersRes.data || [];

      // Calculate averages
      const scores = grades.map((g: any) => g.max_score > 0 ? Math.round((g.score / g.max_score) * 100) : 0);
      const avg = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
      const best = scores.length ? Math.max(...scores) : 0;
      const low  = scores.length ? Math.min(...scores) : 0;
      const weakSubject = grades.find((g: any) => g.max_score > 0 && Math.round((g.score / g.max_score) * 100) === low);

      const presentDays = attendance.filter((a: any) => a.status === 'present').length;
      const attendPct = attendance.length ? Math.round((presentDays / attendance.length) * 100) : 0;

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => { const n = el.querySelector(sel); if (n) n.textContent = val; };

        // Greeting
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        set('#pst-greeting', `${greet}, ${userData.name?.split(' ')[0] || 'Student'} 👋`);
        set('#pst-date-line', new Date().toLocaleDateString('en-UG', { weekday:'long', day:'numeric', month:'long', year:'numeric' }));

        // KPIs
        set('[data-kpi="overall-avg"]', `${avg}%`);
        set('[data-kpi="attendance"]', `${attendPct}%`);
        set('[data-kpi="pending-assignments"]', String(assignments.length));
        set('[data-kpi="fee-balance"]', feeData?.fee_balance ? `UGX ${feeData.fee_balance.toLocaleString()}` : '—');

        // Radials
        set('#pst-radial-avg', `${avg}%`);
        set('#pst-radial-best', `${best}%`);
        set('#pst-radial-low', `${low}%`);
        set('#pst-weak-subject', weakSubject?.subject || 'All subjects good!');

        // Subjects (grade bars)
        const subjList = el.querySelector('#pst-subjects-list');
        if (subjList) {
          subjList.innerHTML = grades.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No grades recorded yet.</div>`
            : grades.map((g: any) => {
                const pct = g.max_score > 0 ? Math.round((g.score / g.max_score) * 100) : 0;
                const grade = pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
                const color = pct >= 80 ? 'var(--teal)' : pct >= 50 ? 'var(--indigo)' : 'var(--rose)';
                return `
                  <div class="pst-subj-row">
                    <span class="pst-subj-name">${g.subject}</span>
                    <div class="pst-subj-bar"><div class="pst-subj-fill" style="width:${pct}%;background:${color}"></div></div>
                    <span class="pst-subj-score" style="color:${color}">${pct}%</span>
                    <span class="pst-subj-grade" style="color:${color}">${grade}</span>
                  </div>`;
              }).join('');
        }

        // Assignments
        const aList = el.querySelector('#pst-assignments-list');
        if (aList) {
          aList.innerHTML = assignments.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No pending assignments! 🎉</div>`
            : assignments.slice(0, 5).map((a: any) => {
                const due = a.due_date ? new Date(a.due_date).toLocaleDateString('en-UG', { day:'numeric', month:'short' }) : '—';
                const isToday = a.due_date === today;
                return `
                  <div class="pst-assign-row" data-nav="/dashboard/student/assignments/${a.id}">
                    <div style="flex:1">
                      <div class="pst-assign-title">${a.title}</div>
                      <div class="pst-assign-sub">${a.subject} · Due ${due}</div>
                    </div>
                    <span class="pst-chip ${isToday ? 'rose' : 'amber'}">${isToday ? '⏰ Today' : due}</span>
                  </div>`;
              }).join('');
        }

        // Exams
        const examList = el.querySelector('#pst-exams-list');
        if (examList) {
          examList.innerHTML = exams.length === 0
            ? `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">No upcoming exams.</div>`
            : exams.map((ex: any) => {
                const date = new Date(ex.date).toLocaleDateString('en-UG', { day:'numeric', month:'short' });
                return `
                  <div class="pst-sched-row" data-nav="/dashboard/student/exams">
                    <div class="pst-sched-time"><div class="pst-sched-h">${date.split(' ')[0]}</div><div class="pst-sched-ap">${date.split(' ')[1] || ''}</div></div>
                    <div class="pst-sched-sep"></div>
                    <div style="flex:1"><div class="pst-sched-subj">${ex.subject}</div><div class="pst-sched-meta">Room ${ex.room || 'TBA'}</div></div>
                    <span class="pst-chip violet">Exam</span>
                  </div>`;
              }).join('');
        }

        // Teachers
        const tchList = el.querySelector('#pst-teachers-list');
        if (tchList) {
          tchList.innerHTML = teachers.length === 0
            ? `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">No teachers found.</div>`
            : teachers.map((t: any, i: number) => {
                const initials = (t.teacher_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                return `
                  <div class="pst-teacher-row">
                    <div class="pst-teacher-av" style="background:${grad(i)}">${initials}</div>
                    <div style="flex:1">
                      <div class="pst-teacher-name">${t.teacher_name}</div>
                      <div class="pst-teacher-sub">${t.subject}</div>
                    </div>
                    <button class="pst-msg-btn" data-nav="/dashboard/student/messages">Message</button>
                  </div>`;
              }).join('');
        }
      });
    }
    load();
  }, [htmlContent]);

  // 3. Wire navigation
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    containerRef.current.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-nav') || '/'));
    });
  }, [htmlContent, navigate]);

  // 4. Theme sync
  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () => document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class','data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width:'100%', minHeight:'100vh', display:'block' }} />
  );
}
```

## Supabase tables used

| Table | Columns | Filter |
|---|---|---|
| `users` | `school_id`, `name`, `student_id`, `class_id` | `id = user.id` |
| `student_grades` | `subject`, `score`, `max_score` | `student_id`, `school_id` |
| `assignments` | `id`, `title`, `subject`, `due_date`, `status` | `student_id`, `status = pending` |
| `student_attendance` | `status`, `date` | `student_id`, `school_id` |
| `students` | `fee_balance`, `fee_total` | `id = student_id` |
| `exams` | `id`, `subject`, `date`, `room` | `school_id`, `date >= today` |
| `class_teachers` | `teacher_name`, `subject` | `school_id`, `class_id` |

---

---

# 4. PARENT DASHBOARD

**File:** `pwezacore-parent-dashboard-react.html`
**Route:** `/dashboard/parent`
**Layout:** `ParentLayout`

## DOM Selector Reference

| What to update | Selector | Method |
|---|---|---|
| Greeting | `#pp-greeting` | `.textContent` |
| Date line | `#pp-date-line` | `.textContent` |
| Children tabs | `#pp-children-list` | `.innerHTML` |
| Viewing child label | `#pp-viewing-child` | `.textContent` |
| Child avg score | `[data-kpi="child-avg"]` | `.textContent` |
| Child attendance | `[data-kpi="child-attend"]` | `.textContent` |
| Child fee balance | `[data-kpi="child-fee-bal"]` | `.textContent` |
| Child class rank | `[data-kpi="child-rank"]` | `.textContent` |
| Outstanding fee amt | `#pp-outstanding-amt` | `.textContent` |
| Due date | `#pp-due-date` | `.textContent` |
| Fee paid % | `#pp-fee-pct` | `.textContent` |
| Fee progress bar | `#pp-fee-progress-fill` | `.style.width` |
| Fee paid label | `#pp-fee-paid` | `.textContent` |
| Fee total label | `#pp-fee-total` | `.textContent` |
| Fee items | `#pp-fee-items` | `.innerHTML` |
| Subjects list | `#pp-subjects-list` | `.innerHTML` |
| Schedule list | `#pp-schedule-list` | `.innerHTML` |
| Exams list | `#pp-exams-list` | `.innerHTML` |
| Payment history | `#pp-payment-history` | `.innerHTML` |
| Teachers list | `#pp-teachers-list` | `.innerHTML` |

## Copy-paste TSX Component

```tsx
// src/pages/parent/DesignParentDashboard.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let cachedHtml: string | null = null;

const GRADIENTS = [
  'linear-gradient(135deg,#ff6b6b,#ffd93d)',
  'linear-gradient(135deg,#06d6a0,#4895ef)',
  'linear-gradient(135deg,#c77dff,#4895ef)',
  'linear-gradient(135deg,#f4a261,#e63946)',
  'linear-gradient(135deg,#06d6a0,#ff6b6b)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];
const fmt = (n: number) => `UGX ${n.toLocaleString()}`;

export default function DesignParentDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [children, setChildren] = useState<any[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  // 1. Inject HTML
  useEffect(() => {
    if (cachedHtml) { setHtmlContent(cachedHtml); return; }
    import('new designs/pwezacore-parent-dashboard.html?raw').then((mod) => {
      const match = (mod.default as string).match(/<body[^>]*>([\s\S]*)<\/body>/i);
      cachedHtml = match ? match[1].trim() : mod.default;
      setHtmlContent(cachedHtml);
    });
  }, []);

  // 2. Load parent's children list
  useEffect(() => {
    if (!htmlContent) return;
    async function loadChildren() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('school_id, name, parent_id').eq('id', user.id).single();
      if (!userData?.school_id) return;

      const { data: parentData } = await supabase
        .from('parents').select('id').eq('user_id', user.id).single();

      const { data: childrenData } = await supabase
        .from('students').select('id, name, class, fee_balance').eq('parent_id', parentData?.id).eq('school_id', userData.school_id);

      const kids = childrenData || [];
      setChildren(kids);
      if (kids.length > 0) setActiveChildId(kids[0].id);

      // Greeting
      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const n = el.querySelector('#pp-greeting'); if (n) n.textContent = `${greet}, ${userData.name?.split(' ')[0] || 'Parent'} 👋`;
        const d = el.querySelector('#pp-date-line'); if (d) d.textContent = new Date().toLocaleDateString('en-UG', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

        // Render child tab switcher
        const tabs = el.querySelector('#pp-children-list');
        if (tabs && kids.length > 0) {
          tabs.innerHTML = kids.map((child: any, i: number) => `
            <div class="pp-child-tab${i === 0 ? ' active' : ''}" data-child-id="${child.id}">
              <div class="pp-child-dot" style="background:${grad(i).split(',')[1]?.trim().replace(')','') || '#ff6b6b'}"></div>
              ${child.name.split(' ')[0]}
            </div>`).join('');

          // Wire tab clicks
          tabs.querySelectorAll('[data-child-id]').forEach((tab) => {
            tab.addEventListener('click', () => {
              tabs.querySelectorAll('[data-child-id]').forEach((t) => t.classList.remove('active'));
              tab.classList.add('active');
              setActiveChildId(tab.getAttribute('data-child-id'));
            });
          });
        }
      });
    }
    loadChildren();
  }, [htmlContent]);

  // 3. Load selected child's data
  const loadChildData = useCallback(async (childId: string) => {
    if (!containerRef.current || !childId) return;
    const today = new Date().toISOString().split('T')[0];

    const [studentRes, gradesRes, attendanceRes, paymentsRes, examsRes] = await Promise.all([
      supabase.from('students').select('name, class, fee_balance, fee_total, fee_due_date').eq('id', childId).single(),
      supabase.from('student_grades').select('subject, score, max_score').eq('student_id', childId),
      supabase.from('student_attendance').select('status').eq('student_id', childId),
      supabase.from('fee_payments').select('amount, payment_date, method').eq('student_id', childId).order('payment_date', { ascending: false }).limit(6),
      supabase.from('exams').select('subject, date, room').gte('date', today).order('date').limit(4),
    ]);

    const student   = studentRes.data;
    const grades    = gradesRes.data || [];
    const attendance = attendanceRes.data || [];
    const payments  = paymentsRes.data || [];
    const exams     = examsRes.data || [];

    const scores = grades.map((g: any) => g.max_score > 0 ? Math.round((g.score / g.max_score) * 100) : 0);
    const avg    = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
    const presentDays = attendance.filter((a: any) => a.status === 'present').length;
    const attendPct   = attendance.length ? Math.round((presentDays / attendance.length) * 100) : 0;

    const feeBalance = student?.fee_balance || 0;
    const feeTotal   = student?.fee_total || 1;
    const feePaid    = feeTotal - feeBalance;
    const feePct     = Math.round((feePaid / feeTotal) * 100);

    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const set = (sel: string, val: string) => { const n = el.querySelector(sel); if (n) n.textContent = val; };
      const setW = (sel: string, w: string) => { const n = el.querySelector(sel) as HTMLElement; if (n) n.style.width = w; };

      set('#pp-viewing-child', `Viewing — ${student?.name || 'Child'} · ${student?.class || ''}`);
      set('[data-kpi="child-avg"]', `${avg}%`);
      set('[data-kpi="child-attend"]', `${attendPct}%`);
      set('[data-kpi="child-fee-bal"]', fmt(feeBalance));
      set('[data-kpi="child-rank"]', '—');

      // Fee banner
      set('#pp-outstanding-amt', fmt(feeBalance));
      set('#pp-due-date', student?.fee_due_date ? new Date(student.fee_due_date).toLocaleDateString('en-UG', { day:'numeric', month:'long' }) : 'End of term');
      set('#pp-fee-pct', `${feePct}% paid`);
      setW('#pp-fee-progress-fill', `${feePct}%`);
      set('#pp-fee-paid', `Paid: ${fmt(feePaid)}`);
      set('#pp-fee-total', `Total: ${fmt(feeTotal)}`);

      // Subject grades
      const subjList = el.querySelector('#pp-subjects-list');
      if (subjList) {
        subjList.innerHTML = grades.length === 0
          ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No grades recorded yet.</div>`
          : grades.map((g: any) => {
              const pct = g.max_score > 0 ? Math.round((g.score / g.max_score) * 100) : 0;
              const grade = pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
              const color = pct >= 80 ? 'var(--teal)' : pct >= 50 ? 'var(--coral)' : 'var(--rose)';
              return `
                <div class="pp-subj-row">
                  <span class="pp-subj-name">${g.subject}</span>
                  <div class="pp-subj-bar"><div class="pp-subj-fill" style="width:${pct}%;background:${color}"></div></div>
                  <span class="pp-subj-score" style="color:${color}">${pct}%</span>
                  <span class="pp-subj-grade" style="color:${color}">${grade}</span>
                </div>`;
            }).join('');
      }

      // Payment history
      const payList = el.querySelector('#pp-payment-history');
      if (payList) {
        payList.innerHTML = payments.length === 0
          ? `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">No payments recorded.</div>`
          : payments.map((p: any) => {
              const date = p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-UG', { day:'numeric', month:'short' }) : '—';
              return `
                <div class="pp-pay-row">
                  <span class="pp-pay-ic">💳</span>
                  <div style="flex:1">
                    <div class="pp-pay-name">${p.method || 'Payment'}</div>
                    <div class="pp-pay-sub">${date}</div>
                  </div>
                  <span class="pp-pay-amt" style="color:var(--teal)">+${fmt(p.amount)}</span>
                </div>`;
            }).join('');
      }

      // Upcoming exams
      const examList = el.querySelector('#pp-exams-list');
      if (examList) {
        examList.innerHTML = exams.length === 0
          ? `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">No upcoming exams.</div>`
          : exams.map((ex: any) => {
              const date = new Date(ex.date).toLocaleDateString('en-UG', { day:'numeric', month:'short' });
              return `
                <div class="pp-sched-row">
                  <div class="pp-sched-time"><div class="pp-sched-h">${date.split(' ')[0]}</div><div class="pp-sched-ap">${date.split(' ')[1] || ''}</div></div>
                  <div class="pp-sched-sep"></div>
                  <div style="flex:1"><div class="pp-sched-subj">${ex.subject}</div><div class="pp-sched-meta">Room ${ex.room || 'TBA'}</div></div>
                  <span class="pp-chip coral">Exam</span>
                </div>`;
            }).join('');
      }
    });
  }, []);

  useEffect(() => {
    if (activeChildId) loadChildData(activeChildId);
  }, [activeChildId, loadChildData]);

  // 4. Wire navigation
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    containerRef.current.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-nav') || '/'));
    });
  }, [htmlContent, navigate]);

  // 5. Theme sync
  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () => document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class','data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width:'100%', minHeight:'100vh', display:'block' }} />
  );
}
```

## Supabase tables used

| Table | Columns | Notes |
|---|---|---|
| `users` | `school_id`, `name`, `parent_id` | |
| `parents` | `id` | Filter `user_id = user.id` |
| `students` | `id`, `name`, `class`, `fee_balance`, `fee_total`, `fee_due_date` | Filter `parent_id` |
| `student_grades` | `subject`, `score`, `max_score` | Filter `student_id` |
| `student_attendance` | `status` | Filter `student_id` |
| `fee_payments` | `amount`, `payment_date`, `method` | Filter `student_id` |
| `exams` | `subject`, `date`, `room` | Filter `date >= today` |

---

---

# 5. LIBRARIAN DASHBOARD

**File:** `pwezacore-librarian-dashboard-react.html`
**Route:** `/dashboard/librarian`
**Layout:** `LibrarianLayout`

## DOM Selector Reference

| What to update | Selector | Method |
|---|---|---|
| Greeting | `#pl-greeting` | `.textContent` |
| Date line | `#pl-date-line` | `.textContent` |
| Active loans hero | `#pl-active-loans` | `.textContent` |
| Available hero | `#pl-available` | `.textContent` |
| Overdue hero | `#pl-overdue` | `.textContent` |
| Returned today hero | `#pl-returned-today` | `.textContent` |
| Catalog size (tag) | `[data-kpi="catalog-size"]` | `.textContent` |
| Overdue count (tag) | `[data-kpi="overdue-count"]` | `.textContent` |
| Fines total (tag) | `[data-kpi="fines-total"]` | `.textContent` |
| Today's issued | `[data-kpi="issued-today"]` | `.textContent` |
| Today's returned | `[data-kpi="returned-today"]` | `.textContent` |
| Overdue strip | `[data-kpi="overdue-strip"]` | `.textContent` |
| Fines strip | `[data-kpi="fines-strip"]` | `.textContent` |
| Renew count badge | `#pl-renew-count` | `.textContent` |
| Loans list | `#pl-loans-list` | `.innerHTML` |
| Overdue list | `#pl-overdue-list` | `.innerHTML` |
| Reservations list | `#pl-reservations-list` | `.innerHTML` |
| Activity list | `#pl-activity-list` | `.innerHTML` |

## Copy-paste TSX Component

```tsx
// src/pages/librarian/DesignLibrarianDashboard.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let cachedHtml: string | null = null;

const GRADIENTS = [
  'linear-gradient(135deg,#e8a020,#cd7f32)',
  'linear-gradient(135deg,#10d9a8,#3d8ef8)',
  'linear-gradient(135deg,#8b5cf6,#e8a020)',
  'linear-gradient(135deg,#f43f5e,#e8a020)',
  'linear-gradient(135deg,#22c55e,#10d9a8)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

export default function DesignLibrarianDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // 1. Inject HTML
  useEffect(() => {
    if (cachedHtml) { setHtmlContent(cachedHtml); return; }
    import('new designs/pwezacore-librarian-dashboard.html?raw').then((mod) => {
      const match = (mod.default as string).match(/<body[^>]*>([\s\S]*)<\/body>/i);
      cachedHtml = match ? match[1].trim() : mod.default;
      setHtmlContent(cachedHtml);
    });
  }, []);

  // 2. Fetch and render
  useEffect(() => {
    if (!htmlContent) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('school_id, name').eq('id', user.id).single();
      if (!userData?.school_id) return;
      const sid = userData.school_id;
      const today = new Date().toISOString().split('T')[0];

      const [loansRes, overdueRes, booksRes, finesRes, reservationsRes] = await Promise.all([
        supabase.from('book_loans').select('id, borrower_name, book_title, due_date, returned').eq('school_id', sid).eq('returned', false).order('due_date'),
        supabase.from('book_loans').select('id, borrower_name, book_title, due_date, days_overdue, fine_amount').eq('school_id', sid).eq('returned', false).lt('due_date', today),
        supabase.from('books').select('id, available').eq('school_id', sid),
        supabase.from('book_fines').select('amount').eq('school_id', sid).eq('paid', false),
        supabase.from('book_reservations').select('id, borrower_name, book_title, reserved_date').eq('school_id', sid).eq('fulfilled', false).order('reserved_date'),
      ]);

      const loans        = loansRes.data || [];
      const overdue      = overdueRes.data || [];
      const books        = booksRes.data || [];
      const fines        = finesRes.data || [];
      const reservations = reservationsRes.data || [];

      const totalAvailable   = books.filter((b: any) => b.available).length;
      const totalFines       = fines.reduce((s: number, f: any) => s + (f.amount || 0), 0);

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => { const n = el.querySelector(sel); if (n) n.textContent = val; };

        // Greeting
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        set('#pl-greeting', `${greet}, ${userData.name?.split(' ')[0] || 'Librarian'} 👋`);
        set('#pl-date-line', new Date().toLocaleDateString('en-UG', { weekday:'long', day:'numeric', month:'long', year:'numeric' }));

        // Hero stats
        set('#pl-active-loans', String(loans.length));
        set('#pl-available', String(totalAvailable));
        set('#pl-overdue', String(overdue.length));

        // Tags
        set('[data-kpi="catalog-size"]', String(books.length));
        set('[data-kpi="overdue-count"]', String(overdue.length));
        set('[data-kpi="fines-total"]', `UGX ${totalFines.toLocaleString()}`);

        // Circulation strip
        set('[data-kpi="overdue-strip"]', String(overdue.length));
        set('[data-kpi="fines-strip"]', `UGX ${totalFines.toLocaleString()}`);

        // Loans list
        const loanList = el.querySelector('#pl-loans-list');
        if (loanList) {
          loanList.innerHTML = loans.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No active loans.</div>`
            : loans.slice(0, 6).map((loan: any, i: number) => {
                const initials = (loan.borrower_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                const dueDate = loan.due_date ? new Date(loan.due_date) : null;
                const isLate = dueDate && dueDate < new Date();
                const isSoon = dueDate && !isLate && (dueDate.getTime() - Date.now()) < 86400000 * 3;
                const dueLabel = dueDate ? dueDate.toLocaleDateString('en-UG', { day:'numeric', month:'short' }) : '—';
                return `
                  <div class="pl-loan-row">
                    <div class="pl-loan-av" style="background:${grad(i)}">${initials}</div>
                    <div style="flex:1">
                      <div class="pl-loan-name">${loan.borrower_name}</div>
                      <div class="pl-loan-sub">${loan.book_title}</div>
                    </div>
                    <span class="pl-loan-due ${isLate ? 'late' : isSoon ? 'soon' : 'ok'}">${isLate ? '⏰ ' : ''}${dueLabel}</span>
                  </div>`;
              }).join('');
        }

        // Overdue list
        const odList = el.querySelector('#pl-overdue-list');
        if (odList) {
          odList.innerHTML = overdue.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No overdue items! 🎉</div>`
            : overdue.slice(0, 5).map((loan: any) => `
                <div class="pl-od-row">
                  <div style="flex:1">
                    <div class="pl-od-name">${loan.borrower_name}</div>
                    <div class="pl-od-sub">${loan.book_title}</div>
                  </div>
                  <span class="pl-od-days">${loan.days_overdue || '?'}d</span>
                  <span class="pl-od-fine">UGX ${(loan.fine_amount || 0).toLocaleString()}</span>
                </div>`).join('');
        }

        // Reservations list
        const resList = el.querySelector('#pl-reservations-list');
        if (resList) {
          resList.innerHTML = reservations.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No pending reservations.</div>`
            : reservations.slice(0, 5).map((r: any, i: number) => {
                const initials = (r.borrower_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                return `
                  <div class="pl-loan-row">
                    <div class="pl-loan-av" style="background:${grad(i+2)}">${initials}</div>
                    <div style="flex:1">
                      <div class="pl-loan-name">${r.borrower_name}</div>
                      <div class="pl-loan-sub">${r.book_title}</div>
                    </div>
                    <span class="pl-chip amber">Reserved</span>
                  </div>`;
              }).join('');
        }
      });
    }
    load();
  }, [htmlContent]);

  // 3. Wire navigation
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    containerRef.current.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-nav') || '/'));
    });
  }, [htmlContent, navigate]);

  // 4. Theme sync
  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () => document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class','data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width:'100%', minHeight:'100vh', display:'block' }} />
  );
}
```

## Supabase tables used

| Table | Columns | Filter |
|---|---|---|
| `book_loans` | `id`, `borrower_name`, `book_title`, `due_date`, `returned`, `days_overdue`, `fine_amount` | `school_id`, `returned = false` |
| `books` | `id`, `available` | `school_id` |
| `book_fines` | `amount` | `school_id`, `paid = false` |
| `book_reservations` | `id`, `borrower_name`, `book_title`, `reserved_date` | `school_id`, `fulfilled = false` |

---

---

# 6. CLINICIAN DASHBOARD

**File:** `pwezacore-clinician-dashboard-react.html`
**Route:** `/dashboard/clinic`
**Layout:** `ClinicLayout`

## DOM Selector Reference

| What to update | Selector | Method |
|---|---|---|
| Greeting | `#pc-greeting` | `.textContent` |
| Date line | `#pc-date-line` | `.textContent` |
| Emergency banner | `#pc-emergency-wrap` | `.style.display = 'flex'` or `'none'` |
| Emergency text | `#pc-emergency-banner` | `.innerHTML` |
| Emergency count | `#pc-emerg-count` | `.textContent` |
| Patients today hero | `#pc-patients-today` | `.textContent` |
| In queue hero | `#pc-in-queue` | `.textContent` |
| Emergencies hero | `#pc-emergencies` | `.textContent` |
| Referred hero | `#pc-referred` | `.textContent` |
| Patients KPI | `[data-kpi="patients-kpi"]` | `.textContent` |
| Emergency KPI | `[data-kpi="emerg-kpi"]` | `.textContent` |
| Medicine low KPI | `[data-kpi="medicine-low"]` | `.textContent` |
| Vaccinations due | `[data-kpi="vacc-due"]` | `.textContent` |
| Queue badge | `#pc-queue-badge` | `.textContent` |
| Medicine low badge | `#pc-medicine-low-badge` | `.textContent` |
| Queue list | `#pc-queue-list` | `.innerHTML` |
| Appointments list | `#pc-appointments-list` | `.innerHTML` |
| Medicines list | `#pc-medicines-list` | `.innerHTML` |
| Referrals list | `#pc-referrals-list` | `.innerHTML` |
| Vaccinations list | `#pc-vaccinations-list` | `.innerHTML` |
| Activity list | `#pc-activity-list` | `.innerHTML` |

## Copy-paste TSX Component

```tsx
// src/pages/clinic/DesignClinicDashboard.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let cachedHtml: string | null = null;

const GRADIENTS = [
  'linear-gradient(135deg,#06b6d4,#10d9a8)',
  'linear-gradient(135deg,#3d8ef8,#06b6d4)',
  'linear-gradient(135deg,#8b5cf6,#3d8ef8)',
  'linear-gradient(135deg,#f43f5e,#f59e0b)',
  'linear-gradient(135deg,#ef4444,#f43f5e)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

export default function DesignClinicDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  // 1. Inject HTML
  useEffect(() => {
    if (cachedHtml) { setHtmlContent(cachedHtml); return; }
    import('new designs/pwezacore-clinician-dashboard.html?raw').then((mod) => {
      const match = (mod.default as string).match(/<body[^>]*>([\s\S]*)<\/body>/i);
      cachedHtml = match ? match[1].trim() : mod.default;
      setHtmlContent(cachedHtml);
    });
  }, []);

  // 2. Fetch and render
  useEffect(() => {
    if (!htmlContent) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('school_id, name').eq('id', user.id).single();
      if (!userData?.school_id) return;
      const sid = userData.school_id;
      const today = new Date().toISOString().split('T')[0];

      const [queueRes, appointRes, medicineRes, referralRes, vaccRes, seenRes, emergRes] = await Promise.all([
        supabase.from('clinic_queue').select('id, patient_name, complaint, priority, status').eq('school_id', sid).eq('date', today).eq('status', 'waiting').order('priority', { ascending: false }),
        supabase.from('clinic_appointments').select('id, patient_name, time, reason').eq('school_id', sid).eq('date', today).order('time'),
        supabase.from('clinic_medicines').select('id, name, category, quantity, min_quantity, expiry_date').eq('school_id', sid).order('quantity'),
        supabase.from('clinic_referrals').select('id, patient_name, hospital, reason, date, status').eq('school_id', sid).order('date', { ascending: false }).limit(5),
        supabase.from('student_vaccinations').select('id, student_name, vaccine, due_date').eq('school_id', sid).gte('due_date', today).order('due_date').limit(6),
        supabase.from('clinic_visits').select('id', { count: 'exact', head: true }).eq('school_id', sid).eq('date', today),
        supabase.from('clinic_queue').select('id, patient_name, complaint').eq('school_id', sid).eq('date', today).eq('priority', 'emergency'),
      ]);

      const queue        = queueRes.data || [];
      const appointments = appointRes.data || [];
      const medicines    = medicineRes.data || [];
      const referrals    = referralRes.data || [];
      const vaccinations = vaccRes.data || [];
      const seenToday    = seenRes.count || 0;
      const emergencies  = emergRes.data || [];
      const lowMeds      = medicines.filter((m: any) => m.quantity <= (m.min_quantity || 5));

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => { const n = el.querySelector(sel); if (n) n.textContent = val; };

        // Greeting
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        set('#pc-greeting', `${greet}, ${userData.name?.split(' ')[0] || 'Nurse'} 👋`);
        set('#pc-date-line', new Date().toLocaleDateString('en-UG', { weekday:'long', day:'numeric', month:'long', year:'numeric' }));

        // Emergency banner
        const emergWrap = el.querySelector('#pc-emergency-wrap') as HTMLElement;
        if (emergWrap) {
          emergWrap.style.display = emergencies.length > 0 ? 'flex' : 'none';
          if (emergencies.length > 0) {
            set('#pc-emerg-count', `🚨 ${emergencies.length} Active Emergency${emergencies.length !== 1 ? 'ies' : ''}`);
            const eBanner = el.querySelector('#pc-emergency-banner');
            if (eBanner) eBanner.innerHTML = emergencies.map((e: any) => `<strong>${e.patient_name}</strong> — ${e.complaint}`).join(' &nbsp;·&nbsp; ');
          }
        }

        // Hero stats
        set('#pc-patients-today', String(seenToday));
        set('#pc-in-queue', String(queue.length));
        set('#pc-emergencies', String(emergencies.length));
        set('#pc-referred', String(referrals.filter((r: any) => r.status === 'pending').length));

        // KPI strip
        set('[data-kpi="patients-kpi"]', String(seenToday));
        set('[data-kpi="emerg-kpi"]', String(emergencies.length));
        set('[data-kpi="medicine-low"]', String(lowMeds.length));
        set('[data-kpi="vacc-due"]', String(vaccinations.length));

        // Badges
        set('#pc-queue-badge', `${queue.length} waiting`);
        set('#pc-medicine-low-badge', `${lowMeds.length} low`);

        // Queue list
        const qList = el.querySelector('#pc-queue-list');
        if (qList) {
          qList.innerHTML = queue.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">Queue is empty! 🎉</div>`
            : queue.map((p: any, i: number) => {
                const isEmerg = p.priority === 'emergency';
                return `
                  <div class="pc-queue-row ${isEmerg ? 'emergency' : i === 0 ? 'active' : ''}">
                    <div class="pc-queue-num">${i + 1}</div>
                    <div style="flex:1">
                      <div class="pc-queue-name">${p.patient_name}</div>
                      <div class="pc-queue-complaint">${p.complaint || 'General visit'}</div>
                    </div>
                    ${isEmerg ? '<span class="pc-chip red">🚨 Emergency</span>' : ''}
                    <button class="pc-act-btn record" data-nav="/dashboard/clinic/queue/${p.id}">Record</button>
                  </div>`;
              }).join('');
        }

        // Medicines
        const medList = el.querySelector('#pc-medicines-list');
        if (medList) {
          medList.innerHTML = medicines.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No medicines in inventory.</div>`
            : medicines.slice(0, 6).map((m: any) => {
                const min = m.min_quantity || 5;
                const pct = Math.min(100, Math.round((m.quantity / Math.max(min * 3, m.quantity)) * 100));
                const isLow = m.quantity <= min;
                return `
                  <div class="pc-med-row">
                    <div style="flex:1">
                      <div class="pc-med-name">${m.name}</div>
                      <div class="pc-med-class">${m.category || 'General'}</div>
                    </div>
                    <div class="pc-med-bar"><div class="pc-med-fill" style="width:${pct}%;background:${isLow ? 'var(--rose)' : 'var(--mint)'}"></div></div>
                    <span class="pc-med-qty" style="color:${isLow ? 'var(--rose)' : 'var(--mint)'}">${m.quantity}</span>
                    ${isLow ? '<span class="pc-chip red">Low</span>' : ''}
                  </div>`;
              }).join('');
        }

        // Referrals
        const refList = el.querySelector('#pc-referrals-list');
        if (refList) {
          refList.innerHTML = referrals.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No referrals.</div>`
            : referrals.map((r: any) => `
                <div class="pc-ref-row">
                  <div style="flex:1">
                    <div class="pc-ref-name">${r.patient_name}</div>
                    <div class="pc-ref-hospital">${r.hospital} · ${r.reason}</div>
                  </div>
                  <span class="pc-chip ${r.status === 'pending' ? 'amber' : 'mint'}">${r.status}</span>
                </div>`).join('');
        }

        // Vaccinations
        const vaccList = el.querySelector('#pc-vaccinations-list');
        if (vaccList) {
          vaccList.innerHTML = vaccinations.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No vaccinations due this week.</div>`
            : vaccinations.map((v: any, i: number) => {
                const initials = (v.student_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                const due = new Date(v.due_date).toLocaleDateString('en-UG', { day:'numeric', month:'short' });
                return `
                  <div class="pc-queue-row">
                    <div class="pc-queue-num" style="background:var(--mint-s);color:var(--mint)">${initials}</div>
                    <div style="flex:1">
                      <div class="pc-queue-name">${v.student_name}</div>
                      <div class="pc-queue-complaint">${v.vaccine} · Due ${due}</div>
                    </div>
                    <span class="pc-chip mint">Due</span>
                  </div>`;
              }).join('');
        }
      });
    }
    load();
  }, [htmlContent]);

  // 3. Wire navigation
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    containerRef.current.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-nav') || '/'));
    });
  }, [htmlContent, navigate]);

  // 4. Theme sync
  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () => document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class','data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width:'100%', minHeight:'100vh', display:'block' }} />
  );
}
```

## Supabase tables used

| Table | Columns | Filter |
|---|---|---|
| `clinic_queue` | `id`, `patient_name`, `complaint`, `priority`, `status` | `school_id`, `date = today`, `status = waiting` |
| `clinic_appointments` | `id`, `patient_name`, `time`, `reason` | `school_id`, `date = today` |
| `clinic_medicines` | `id`, `name`, `category`, `quantity`, `min_quantity`, `expiry_date` | `school_id` |
| `clinic_referrals` | `id`, `patient_name`, `hospital`, `reason`, `date`, `status` | `school_id` |
| `student_vaccinations` | `id`, `student_name`, `vaccine`, `due_date` | `school_id`, `due_date >= today` |
| `clinic_visits` | `id` (count) | `school_id`, `date = today` |

---

---

# 7. LAB TECHNICIAN DASHBOARD

**File:** `pwezacore-lab-technician-dashboard-react.html`
**Route:** `/dashboard/lab`
**Layout:** `LabLayout`

## DOM Selector Reference

| What to update | Selector | Method |
|---|---|---|
| Greeting | `#plb-greeting` | `.textContent` |
| Date line | `#plb-date-line` | `.textContent` |
| Hazard banner | `#plb-hazard-wrap` | `.style.display` |
| Hazard text | `#plb-hazard-text` | `.innerHTML` |
| Sessions today hero | `#plb-sessions-today` | `.textContent` |
| Students in lab hero | `#plb-students-in-lab` | `.textContent` |
| Low stock hero | `#plb-low-stock` | `.textContent` |
| Damage reports hero | `#plb-damage-reports` | `.textContent` |
| Chemical low badge | `#plb-chem-low-badge` | `.textContent` |
| Bookings badge | `#plb-bookings-badge` | `.textContent` |
| Checklist session | `#plb-checklist-session` | `.textContent` |
| Chem low KPI | `[data-kpi="chem-low"]` | `.textContent` |
| Damage open | `[data-kpi="damage-open"]` | `.textContent` |
| Schedule list | `#plb-schedule-list` | `.innerHTML` |
| Checklist list | `#plb-checklist-list` | `.innerHTML` |
| Chemicals list | `#plb-chemicals-list` | `.innerHTML` |
| Equipment list | `#plb-equipment-list` | `.innerHTML` |
| Bookings list | `#plb-bookings-list` | `.innerHTML` |
| Damage list | `#plb-damage-list` | `.innerHTML` |
| Safety list | `#plb-safety-list` | `.innerHTML` |
| Activity list | `#plb-activity-list` | `.innerHTML` |

## Copy-paste TSX Component

```tsx
// src/pages/lab/DesignLabDashboard.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

let cachedHtml: string | null = null;

const GRADIENTS = [
  'linear-gradient(135deg,#84cc16,#22d3ee)',
  'linear-gradient(135deg,#22d3ee,#3b82f6)',
  'linear-gradient(135deg,#8b5cf6,#22d3ee)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#22c55e,#84cc16)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

export default function DesignLabDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [activeLab, setActiveLab] = useState('all');

  // 1. Inject HTML
  useEffect(() => {
    if (cachedHtml) { setHtmlContent(cachedHtml); return; }
    import('new designs/pwezacore-lab-technician-dashboard.html?raw').then((mod) => {
      const match = (mod.default as string).match(/<body[^>]*>([\s\S]*)<\/body>/i);
      cachedHtml = match ? match[1].trim() : mod.default;
      setHtmlContent(cachedHtml);
    });
  }, []);

  // 2. Fetch and render
  useEffect(() => {
    if (!htmlContent) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users').select('school_id, name').eq('id', user.id).single();
      if (!userData?.school_id) return;
      const sid = userData.school_id;
      const today = new Date().toISOString().split('T')[0];

      const [scheduleRes, chemRes, equipRes, bookingRes, damageRes, safetyRes, hazardRes] = await Promise.all([
        supabase.from('lab_sessions').select('id, lab_name, subject, class_name, time, teacher_name, prep_status').eq('school_id', sid).eq('date', today).order('time'),
        supabase.from('lab_chemicals').select('id, name, formula, quantity, unit, min_quantity, hazard_class').eq('school_id', sid).order('quantity'),
        supabase.from('lab_equipment').select('id, name, lab_name, total_quantity, available_quantity, status').eq('school_id', sid),
        supabase.from('lab_bookings').select('id, teacher_name, lab_name, date, time, purpose, status').eq('school_id', sid).eq('status', 'pending').order('date'),
        supabase.from('lab_damage_reports').select('id, item_name, reported_by, description, cost_estimate, status').eq('school_id', sid).eq('status', 'open').order('created_at', { ascending: false }),
        supabase.from('lab_safety_incidents').select('id, title, description, severity, date, resolved').eq('school_id', sid).order('date', { ascending: false }).limit(5),
        supabase.from('lab_safety_incidents').select('id, title').eq('school_id', sid).eq('resolved', false),
      ]);

      const schedule  = scheduleRes.data || [];
      const chemicals = chemRes.data || [];
      const equipment = equipRes.data || [];
      const bookings  = bookingRes.data || [];
      const damages   = damageRes.data || [];
      const safety    = safetyRes.data || [];
      const hazards   = hazardRes.data || [];
      const lowChems  = chemicals.filter((c: any) => c.quantity <= (c.min_quantity || 5));
      const totalStudents = schedule.reduce((s: number) => s + 0, 0); // sum student_count if available

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => { const n = el.querySelector(sel); if (n) n.textContent = val; };

        // Greeting
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        set('#plb-greeting', `${greet}, ${userData.name?.split(' ')[0] || 'Technician'} 👋`);
        set('#plb-date-line', new Date().toLocaleDateString('en-UG', { weekday:'long', day:'numeric', month:'long', year:'numeric' }));

        // Hazard banner
        const hazardWrap = el.querySelector('#plb-hazard-wrap') as HTMLElement;
        if (hazardWrap) {
          hazardWrap.style.display = hazards.length > 0 ? 'flex' : 'none';
          if (hazards.length > 0) {
            const ht = el.querySelector('#plb-hazard-text');
            if (ht) ht.innerHTML = hazards.map((h: any) => `<strong>${h.title}</strong>`).join(' · ');
          }
        }

        // Hero stats
        set('#plb-sessions-today', String(schedule.length));
        set('#plb-low-stock', String(lowChems.length));
        set('#plb-damage-reports', String(damages.length));

        // Badges
        set('#plb-chem-low-badge', `${lowChems.length} low`);
        set('#plb-bookings-badge', `${bookings.length} pending`);
        set('[data-kpi="chem-low"]', String(lowChems.length));
        set('[data-kpi="damage-open"]', String(damages.length));

        // Schedule
        const schedList = el.querySelector('#plb-schedule-list');
        if (schedList) {
          schedList.innerHTML = schedule.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No lab sessions scheduled today.</div>`
            : schedule.map((s: any) => {
                const prepClass = s.prep_status === 'ready' ? 'ready' : s.prep_status === 'urgent' ? 'urgent' : 'needed';
                const prepLabel = s.prep_status === 'ready' ? '✅ Ready' : s.prep_status === 'urgent' ? '🚨 Urgent' : '⚙️ Prep Needed';
                const timeParts = (s.time || '00:00').split(':');
                const hour = parseInt(timeParts[0]);
                const ap = hour >= 12 ? 'PM' : 'AM';
                const h12 = hour > 12 ? hour - 12 : hour || 12;
                return `
                  <div class="plb-exp-row">
                    <div class="plb-exp-time"><div class="plb-exp-h">${h12}:${timeParts[1] || '00'}</div><div class="plb-exp-ap">${ap}</div></div>
                    <div class="plb-exp-sep"></div>
                    <div style="flex:1">
                      <div class="plb-exp-name">${s.subject} — ${s.class_name}</div>
                      <div class="plb-exp-meta">${s.lab_name} · ${s.teacher_name || ''}</div>
                    </div>
                    <span class="plb-prep ${prepClass}">${prepLabel}</span>
                  </div>`;
              }).join('');
        }

        // Chemicals
        const chemList = el.querySelector('#plb-chemicals-list');
        if (chemList) {
          chemList.innerHTML = chemicals.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No chemicals recorded.</div>`
            : chemicals.slice(0, 8).map((c: any) => {
                const min = c.min_quantity || 5;
                const pct = Math.min(100, Math.round((c.quantity / Math.max(min * 3, c.quantity)) * 100));
                const isLow = c.quantity <= min;
                const hazardIc = c.hazard_class === 'flammable' ? '🔥' : c.hazard_class === 'corrosive' ? '⚗️' : c.hazard_class === 'toxic' ? '☠️' : '🧪';
                return `
                  <div class="plb-chem-row">
                    <span class="plb-chem-ic">${hazardIc}</span>
                    <div style="flex:1">
                      <div class="plb-chem-name">${c.name}</div>
                      <div class="plb-chem-formula">${c.formula || ''}</div>
                    </div>
                    <div class="plb-chem-bar"><div class="plb-chem-fill" style="width:${pct}%;background:${isLow ? 'var(--rose)' : 'var(--lime)'}"></div></div>
                    <span class="plb-chem-qty" style="color:${isLow ? 'var(--rose)' : 'var(--lime)'}">${c.quantity}</span>
                    <span class="plb-chem-unit">${c.unit || 'ml'}</span>
                  </div>`;
              }).join('');
        }

        // Equipment
        const equipList = el.querySelector('#plb-equipment-list');
        if (equipList) {
          equipList.innerHTML = equipment.length === 0
            ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No equipment recorded.</div>`
            : equipment.slice(0, 8).map((e: any) => {
                const isDamaged = e.status === 'damaged' || e.available_quantity < e.total_quantity;
                return `
                  <div class="plb-equip-row${isDamaged ? ' damaged' : ''}">
                    <div>
                      <div class="plb-equip-name">${e.name}</div>
                      <div class="plb-equip-lab">${e.lab_name}</div>
                    </div>
                    <div class="plb-equip-qty" style="color:${isDamaged ? 'var(--rose)' : 'var(--lime)'}">${e.available_quantity}/${e.total_quantity}</div>
                    <span class="plb-chip ${isDamaged ? 'rose' : 'lime'}">${isDamaged ? 'Faulty' : 'OK'}</span>
                  </div>`;
              }).join('');
        }

        // Bookings
        const bookList = el.querySelector('#plb-bookings-list');
        if (bookList) {
          bookList.innerHTML = bookings.length === 0
            ? `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">No pending bookings.</div>`
            : bookings.slice(0, 4).map((b: any) => {
                const date = new Date(b.date).toLocaleDateString('en-UG', { day:'numeric', month:'short' });
                return `
                  <div class="plb-book-row">
                    <div style="flex:1">
                      <div class="plb-book-name">${b.teacher_name} — ${b.lab_name}</div>
                      <div class="plb-book-sub">${date} · ${b.time} · ${b.purpose || ''}</div>
                    </div>
                    <div style="display:flex;gap:4px">
                      <button class="plb-apv-btn apv" data-booking-id="${b.id}" data-action="approve">✓</button>
                      <button class="plb-apv-btn dec" data-booking-id="${b.id}" data-action="decline">✕</button>
                    </div>
                  </div>`;
              }).join('');

          // Wire approve/decline
          bookList.querySelectorAll('[data-booking-id]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              const bookingId = btn.getAttribute('data-booking-id');
              const action    = btn.getAttribute('data-action');
              await supabase.from('lab_bookings').update({ status: action === 'approve' ? 'approved' : 'declined' }).eq('id', bookingId);
              (btn.closest('.plb-book-row') as HTMLElement)?.remove();
            });
          });
        }

        // Damage reports
        const dmgList = el.querySelector('#plb-damage-list');
        if (dmgList) {
          dmgList.innerHTML = damages.length === 0
            ? `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">No open damage reports.</div>`
            : damages.slice(0, 4).map((d: any, i: number) => {
                const initials = (d.reported_by || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                return `
                  <div class="plb-dmg-row">
                    <div class="plb-dmg-av" style="background:${grad(i+1)}">${initials}</div>
                    <div style="flex:1">
                      <div class="plb-dmg-name">${d.item_name}</div>
                      <div class="plb-dmg-who">By ${d.reported_by}</div>
                    </div>
                    ${d.cost_estimate ? `<span class="plb-dmg-cost">~UGX ${d.cost_estimate.toLocaleString()}</span>` : ''}
                    <button class="plb-dmg-act" data-nav="/dashboard/lab/damage/${d.id}">Escalate</button>
                  </div>`;
              }).join('');
        }

        // Safety log
        const safeList = el.querySelector('#plb-safety-list');
        if (safeList) {
          safeList.innerHTML = safety.length === 0
            ? `<div style="padding:16px;text-align:center;color:var(--t3);font-size:13px">No safety incidents on record.</div>`
            : safety.map((s: any) => {
                const ic = s.severity === 'high' ? '🚨' : s.severity === 'medium' ? '⚠️' : 'ℹ️';
                const icBg = s.severity === 'high' ? 'var(--red-s)' : s.severity === 'medium' ? 'var(--amber-s)' : 'var(--blue-s)';
                return `
                  <div class="plb-safe-row">
                    <div class="plb-safe-ic" style="background:${icBg}">${ic}</div>
                    <div style="flex:1">
                      <div class="plb-safe-title">${s.title}</div>
                      <div class="plb-safe-body">${s.description}</div>
                      <div class="plb-safe-time">${new Date(s.date).toLocaleDateString('en-UG', { day:'numeric', month:'short' })} · ${s.resolved ? '✅ Resolved' : '⏳ Open'}</div>
                    </div>
                  </div>`;
              }).join('');
        }
      });
    }
    load();
  }, [htmlContent, activeLab]);

  // 3. Wire lab tabs
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    const el = containerRef.current;

    el.querySelectorAll('[data-lab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        el.querySelectorAll('[data-lab]').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        setActiveLab(tab.getAttribute('data-lab') || 'all');
      });
    });
  }, [htmlContent]);

  // 4. Wire navigation
  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    containerRef.current.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => navigate(el.getAttribute('data-nav') || '/'));
    });
  }, [htmlContent, navigate]);

  // 5. Theme sync
  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () => document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class','data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlContent }}
      style={{ width:'100%', minHeight:'100vh', display:'block' }} />
  );
}
```

## Supabase tables used

| Table | Columns | Filter |
|---|---|---|
| `lab_sessions` | `id`, `lab_name`, `subject`, `class_name`, `time`, `teacher_name`, `prep_status` | `school_id`, `date = today` |
| `lab_chemicals` | `id`, `name`, `formula`, `quantity`, `unit`, `min_quantity`, `hazard_class` | `school_id` |
| `lab_equipment` | `id`, `name`, `lab_name`, `total_quantity`, `available_quantity`, `status` | `school_id` |
| `lab_bookings` | `id`, `teacher_name`, `lab_name`, `date`, `time`, `purpose`, `status` | `school_id`, `status = pending` |
| `lab_damage_reports` | `id`, `item_name`, `reported_by`, `description`, `cost_estimate`, `status` | `school_id`, `status = open` |
| `lab_safety_incidents` | `id`, `title`, `description`, `severity`, `date`, `resolved` | `school_id` |

---

## Checklist for Cursor

For each dashboard:

- [ ] Save the HTML file to `new designs/pwezacore-[role]-dashboard.html`
- [ ] Create the TSX component in `src/pages/[role]/Design[Role]Dashboard.tsx`
- [ ] Swap the import + route in `App.tsx`
- [ ] Verify Supabase table names match your actual schema (rename any that differ)
- [ ] Test dark/light mode toggle — ensure `html` element gets `.dark` or `.light` class
- [ ] Test on mobile — all dashboards have responsive breakpoints at 1100px, 768px, 480px
