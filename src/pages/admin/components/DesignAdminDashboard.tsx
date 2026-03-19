import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUIStore } from '@/store/uiStore';

// Use the provided HTML as the pixel-perfect layout body (sidebar + topbar + sections).
// Vite will inline the CSS/HTML at build time.
// eslint-disable-next-line import/no-unresolved
import designRaw from '../../../../new designs/pwezacore-admin-dashboard.html?raw';

function stripScripts(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function extractStyleAndBody(raw: string) {
  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const style = styleMatch?.[1] ?? '';
  const body = bodyMatch?.[1] ?? '';

  // The design file contains a typo: `::root` (should be `:root`).
  const fixedStyle = style.replace('::root', ':root');
  return { style: fixedStyle, body: stripScripts(body) };
}

function formatUShFull(amount: number) {
  if (!Number.isFinite(amount)) return 'USh —';
  return `USh ${Math.round(amount).toLocaleString('en-US')}`;
}

function formatUShCompact(amount: number) {
  if (!Number.isFinite(amount)) return 'USh —';
  const n = Math.round(amount);
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    const s = v >= 10 ? v.toFixed(1) : v.toFixed(2);
    return `USh ${s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    const s = v >= 10 ? v.toFixed(1) : v.toFixed(2);
    return `USh ${s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}K`;
  }
  return formatUShFull(n);
}

type Kpis = {
  students: number;
  teachers: number;
  outstanding: number;
  feesCollected: number;
  attendance: number;
  pendingExpenses: number;
  activeClasses: number;
};

export default function DesignAdminDashboard({ schoolId }: { schoolId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);

  // Search (was previously handled by `AdminLayout` chrome; now we must wire it ourselves).
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    students: Array<{ student_id: string; name: string; current_class?: string; admission_number?: string }>;
    teachers: Array<{ teacher_id: string; name: string; email?: string }>;
    reports: Array<{ report_id: string; template_name?: string; created_at: string; student_name?: string }>;
  }>({ students: [], teachers: [], reports: [] });
  const [searchAnchor, setSearchAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const searchInputElRef = useRef<HTMLInputElement | null>(null);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);

  const { style, body } = useMemo(() => extractStyleAndBody(designRaw), []);

  useEffect(() => {
    // Ensure the design fonts are available (the HTML provides them in <head>).
    const id = 'pwezacore-admin-design-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Navigation: map UI labels in the design to existing React Router routes.
    const NAV: Array<{ match: string; to: string | null }> = [
      { match: 'Dashboard', to: '/dashboard/admin' },
      { match: 'Students', to: '/dashboard/admin/students' },
      { match: 'Teachers', to: '/dashboard/admin/teachers' },
      { match: 'Parents', to: '/dashboard/admin/parents' },
      { match: 'User Management', to: '/dashboard/admin/accounts' },
      { match: 'Staff', to: '/dashboard/admin/accounts' },
      { match: 'Classes', to: '/dashboard/admin/settings/classes' },
      { match: 'Job Vacancies', to: '/dashboard/admin/jobs' },
      { match: 'Finance', to: '/dashboard/admin/outstanding' },
      { match: 'Reports', to: '/dashboard/admin/reports/generate' },
      { match: 'Receipts', to: '/dashboard/admin/reports' },
      { match: 'Attendance', to: '/dashboard/admin/attendance-records' },
      { match: 'Exam Sets', to: '/dashboard/admin/exam-sets' },
      { match: 'Identity', to: '/dashboard/admin/identity' },
      { match: 'Notifications', to: '/dashboard/admin/notifications' },
      { match: 'System Settings', to: '/dashboard/admin/settings' },
      { match: 'Headed Paper', to: '/dashboard/admin/settings' },
    ];

    const findRouteFromText = (text: string) => {
      const t = text.trim();
      return NAV.find((n) => t.includes(n.match))?.to ?? null;
    };

    const onDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const navLink = target.closest?.('.nav-link') as HTMLElement | null;
      if (navLink) {
        const to = findRouteFromText(navLink.textContent || '');
        if (to) navigate(to);
        return;
      }

      const qaBtn = target.closest?.('.qa-btn') as HTMLElement | null;
      if (qaBtn) {
        const label = (qaBtn.querySelector('.qa-label')?.textContent || '').trim();
        const quick: Record<string, string | null> = {
          'Add Student': '/dashboard/admin/students/add',
          'Add Teacher': '/dashboard/admin/teachers/add',
          'Add Parent': '/dashboard/admin/parents/add',
          'Add Accounts Manager': '/dashboard/admin/accounts/add',
          'Generate Reports': '/dashboard/admin/reports/generate',
          'Generate Receipts': null,
          'Post Job Vacancy': '/dashboard/admin/jobs/post',
          'Add Librarian': '/dashboard/admin/librarian/add',
          'Appoint Head Teacher': '/dashboard/admin/head-teacher/appoint',
          'Headed Paper': '/dashboard/head-teacher',
          'Location Settings': '/dashboard/admin/settings/location',
          'System Settings': '/dashboard/admin/settings',
        };
        const to = quick[label] ?? null;
        if (to) navigate(to);
        return;
      }

      // Job vacancy card actions (design uses `<a class="card-action">` without href).
      const cardAction = target.closest?.('a.card-action') as HTMLElement | null;
      if (cardAction) {
        const txt = (cardAction.textContent || '').trim();
        if (txt.includes('Post new')) {
          navigate('/dashboard/admin/jobs');
          return;
        }
        if (txt.includes('Add reminder')) {
          navigate('/dashboard/admin/notifications');
          return;
        }
      }

      const jobManageBtn = target.closest?.('button') as HTMLButtonElement | null;
      if (jobManageBtn && (jobManageBtn.textContent || '').includes('Manage All Vacancies')) {
        navigate('/dashboard/admin/jobs');
        return;
      }

      const expenseBtn = target.closest?.('button.ea-btn') as HTMLButtonElement | null;
      if (expenseBtn) {
        const expenseId = expenseBtn.dataset.expenseId;
        const action = expenseBtn.classList.contains('approve') ? 'approve' : 'reject';
        if (!expenseId) return;
        void (async () => {
          try {
            expenseBtn.disabled = true;
            const resp = await fetch('/api/accountant/approve-expense', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                expense_id: expenseId,
                action,
                notes: `Processed by admin dashboard`,
              }),
            });
            if (!resp.ok) throw new Error('Request failed');
            const row = expenseBtn.closest?.('.expense-row') as HTMLElement | null;
            if (row) {
              row.style.opacity = '0.4';
              row.style.pointerEvents = 'none';
            }
          } catch {
            alert('Failed to process expense');
            expenseBtn.disabled = false;
          }
        })();
        return;
      }

      // Header CTA buttons
      const headerBtn = target.closest?.('button.btn, button') as HTMLButtonElement | null;
      if (headerBtn && headerBtn.textContent) {
        const txt = headerBtn.textContent.trim();
        if (txt.includes('＋ Add Student')) navigate('/dashboard/admin/students/add');
        if (txt.includes('Generate Report')) navigate('/dashboard/admin/reports/generate');
      }

      // Theme toggle (moon icon button)
      const darkModeBtn = target.closest?.('.ib[title="Dark mode"]') as HTMLElement | null;
      if (darkModeBtn) {
        toggleTheme();
      }

      // Notifications button
      const notifBtn = target.closest?.('.ib[title="Notifications"]') as HTMLElement | null;
      if (notifBtn) navigate('/dashboard/admin/notifications');
    };

    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [navigate, toggleTheme]);

  // Attach input listeners for `.search-input` inside the injected HTML.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const inputEl = root.querySelector('input.search-input') as HTMLInputElement | null;
    if (!inputEl) return;
    searchInputElRef.current = inputEl;

    const updateAnchor = () => {
      const ir = inputEl.getBoundingClientRect();
      setSearchAnchor({
        left: ir.left,
        top: ir.bottom + 6,
        width: ir.width,
      });
    };

    const handleInput = () => {
      setSearchQuery(inputEl.value);
      if (inputEl.value.trim().length >= 2) setSearchOpen(true);
    };
    const handleFocus = () => {
      if (inputEl.value.trim().length >= 2) setSearchOpen(true);
      updateAnchor();
    };

    inputEl.addEventListener('input', handleInput);
    inputEl.addEventListener('focus', handleFocus);
    window.addEventListener('resize', updateAnchor);

    return () => {
      inputEl.removeEventListener('input', handleInput);
      inputEl.removeEventListener('focus', handleFocus);
      window.removeEventListener('resize', updateAnchor);
    };
  }, []);

  // Close search dropdown on outside click / Escape.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!searchOpen) return;
      const inputEl = searchInputElRef.current;
      const dropdownEl = searchDropdownRef.current;
      const target = e.target as Node | null;
      if (inputEl && target && inputEl.contains(target)) return;
      if (dropdownEl && target && dropdownEl.contains(target)) return;
      setSearchOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [searchOpen]);

  // Fetch search results (same query strategy as `AdminLayout`).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchOpen(false);
      setSearchResults({ students: [], teachers: [], reports: [] });
      return;
    }
    if (!schoolId) return;

    const t = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [studentsRes, teachersRes, reportsRes] = await Promise.all([
          supabase
            .from('students')
            .select('student_id, name, current_class, admission_number')
            .eq('school_id', schoolId)
            .or(`name.ilike.%${q}%,admission_number.ilike.%${q}%,current_class.ilike.%${q}%`)
            .limit(8),
          supabase
            .from('teachers')
            .select('teacher_id, name, email')
            .eq('school_id', schoolId)
            .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
            .limit(5),
          supabase
            .from('reports')
            .select('report_id, template_name, created_at, students(name)')
            .eq('school_id', schoolId)
            .ilike('template_name', `%${q}%`)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const students = (studentsRes.data || []) as Array<{
          student_id: string;
          name: string;
          current_class?: string;
          admission_number?: string;
        }>;
        const teachers = (teachersRes.data || []) as Array<{ teacher_id: string; name: string; email?: string }>;
        const reportsRaw = (reportsRes.data || []) as Array<{
          report_id: string;
          template_name?: string;
          created_at: string;
          students?: { name?: string } | { name?: string }[];
        }>;

        const reports = reportsRaw.map((r) => ({
          report_id: r.report_id,
          template_name: r.template_name,
          created_at: r.created_at,
          student_name: Array.isArray(r.students)
            ? (r.students[0] as { name?: string })?.name
            : (r.students as { name?: string })?.name,
        }));

        setSearchResults({ students, teachers, reports });
        setSearchOpen(true);
      } catch {
        setSearchResults({ students: [], teachers: [], reports: [] });
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(t);
  }, [searchQuery, schoolId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const path = location.pathname;
    const activeMatch =
      path === '/dashboard/admin'
        ? 'Dashboard'
        : path.startsWith('/dashboard/admin/students')
          ? 'Students'
          : path.startsWith('/dashboard/admin/teachers')
            ? 'Teachers'
            : path.startsWith('/dashboard/admin/parents')
              ? 'Parents'
              : path.startsWith('/dashboard/admin/accounts')
                ? 'Staff'
                : path.startsWith('/dashboard/admin/jobs')
                  ? 'Job Vacancies'
                  : path.startsWith('/dashboard/admin/outstanding')
                    ? 'Finance'
                    : path.startsWith('/dashboard/admin/reports')
                      ? 'Reports'
                      : path.startsWith('/dashboard/admin/attendance')
                        ? 'Attendance'
                        : path.startsWith('/dashboard/admin/exam-sets')
                          ? 'Exam Sets'
                          : path.startsWith('/dashboard/admin/identity')
                            ? 'Identity'
                            : path.startsWith('/dashboard/admin/notifications')
                              ? 'Notifications'
                              : path.startsWith('/dashboard/admin/settings')
                                ? 'System Settings'
                                : null;

    root.querySelectorAll('.nav-link').forEach((el) => el.classList.remove('active'));
    if (!activeMatch) return;

    const matchEl = Array.from(root.querySelectorAll('.nav-link')).find((el) => {
      const txt = (el.textContent || '').trim();
      return txt.includes(activeMatch);
    }) as HTMLElement | undefined;
    if (matchEl) matchEl.classList.add('active');
  }, [location.pathname]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        // Header eyebrow date (design file is hard-coded; this keeps it data-driven).
        const eyebrowEl = root.querySelector('.pg-eyebrow') as HTMLElement | null;
        if (eyebrowEl) {
          const d = new Date();
          const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
          const day = d.getDate();
          const month = d.toLocaleDateString('en-US', { month: 'long' });
          const year = d.getFullYear();
          const dateStr = `${weekday}, ${day} ${month} ${year}`;
          const restTokens = (eyebrowEl.textContent || '')
            .split('·')
            .map((x) => x.trim())
            .filter(Boolean);
          const rest = restTokens.slice(1).join(' · ');
          eyebrowEl.innerHTML = `<span class="live-dot"></span> ${dateStr}${rest ? ` · ${rest}` : ''}`;
        }

        // -----------------------
        // KPIs
        // -----------------------
        const kpis: Kpis = await (async (): Promise<Kpis> => {
          const today = new Date().toISOString().slice(0, 10);

          const [
            termsResult,
            studentsResult,
            teachersResult,
            attendanceResult,
            balancesResult,
            pendingExpensesResult,
            activeClassesResult,
          ] = await Promise.all([
            supabase
              .from('school_terms')
              .select('id, start_date, end_date, year, term')
              .eq('school_id', schoolId)
              .order('year', { ascending: false })
              .order('term', { ascending: false }),
            supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', schoolId)
              .eq('status', 'active'),
            supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
            supabase
              .from('student_attendance')
              .select('student_id')
              .eq('school_id', schoolId)
              .eq('date', today)
              .eq('present', true),
            supabase
              .from('students')
              .select('student_id, expected_fee_amount')
              .eq('school_id', schoolId)
              .eq('status', 'active'),
            supabase
              .from('school_expenses')
              .select('expense_id', { count: 'exact', head: true })
              .eq('school_id', schoolId)
              .eq('status', 'pending'),
            supabase
              .from('students')
              .select('current_class')
              .eq('school_id', schoolId)
              .eq('status', 'active'),
          ]);

          const allTerms = termsResult.data || [];
          const currentTermData =
            allTerms.find((t: any) =>
              t.start_date ? t.start_date <= today && t.end_date >= today : t.end_date >= today
            ) || (allTerms[0] as any) || null;

          const balances = balancesResult.data || [];
          const studentIds = balances.map((s: any) => s.student_id);

          const [feesCollectedResult, paymentsResult] = await Promise.all([
            currentTermData
              ? supabase
                  .from('student_payments')
                  .select('amount_paid')
                  .eq('school_id', schoolId)
                  .gte('payment_date', currentTermData.start_date || '1900-01-01')
                  .lte('payment_date', currentTermData.end_date || '2100-12-31')
              : supabase.from('student_payments').select('amount_paid').eq('school_id', schoolId),
            studentIds.length > 0
              ? supabase
                  .from('student_payments')
                  .select('student_id, amount_paid')
                  .in('student_id', studentIds)
                  .eq('school_id', schoolId)
              : Promise.resolve({ data: [] as any[] }),
          ]);

          const payments = paymentsResult.data || [];
          const paidByStudent: Record<string, number> = {};
          payments.forEach((p: any) => {
            paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount_paid || 0);
          });

          const outstanding = balances
            .map((s: any) => Math.max(0, Number(s.expected_fee_amount || 0) - (paidByStudent[s.student_id] || 0)))
            .reduce((sum: number, b: number) => sum + b, 0);

          const feesCollected = (feesCollectedResult.data || []).reduce(
            (sum: number, p: any) => sum + Number(p.amount_paid || 0),
            0
          );

          const pendingExpenses = pendingExpensesResult.count ?? 0;
          const activeClasses = new Set(
            (activeClassesResult.data || [])
              .map((s: any) => s.current_class)
              .filter(Boolean)
          ).size;

          return {
            students: studentsResult.count ?? 0,
            teachers: teachersResult.count ?? 0,
            outstanding,
            feesCollected,
            attendance: new Set((attendanceResult.data || []).map((x: any) => x.student_id)).size,
            pendingExpenses,
            activeClasses,
          };
        })();

        if (cancelled) return;

        // Update KPI values by order in the design (8 cards).
        const kpiValues = Array.from(root.querySelectorAll('.kpi-value')) as HTMLElement[];
        if (kpiValues.length >= 8) {
          kpiValues[0].textContent = String(kpis.students || 0); // Total Students
          kpiValues[1].textContent = String(kpis.teachers || 0); // Total Teachers
          kpiValues[2].textContent = formatUShCompact(kpis.feesCollected || 0); // Fees Collected
          kpiValues[3].textContent = formatUShCompact(kpis.outstanding || 0); // Outstanding Fees
          const attendancePct = kpis.students > 0 ? (kpis.attendance / kpis.students) * 100 : 0;
          kpiValues[4].textContent = formatPercent(attendancePct); // Attendance Today
          kpiValues[5].textContent = String(kpis.pendingExpenses || 0); // Pending Expenses
          kpiValues[6].textContent = String(kpis.activeClasses || 0); // Active Classes
          // kpiValues[7] = Job Applications (not wired yet)
          if (kpiValues[7]) kpiValues[7].textContent = '—';
        }

        // -----------------------
        // Staff Overview (teachers)
        // -----------------------
        const teachersRes = await supabase
          .from('teachers')
          .select('teacher_id, name, email')
          .eq('school_id', schoolId)
          .limit(5);
        const teachers = teachersRes.data || [];

        if (cancelled) return;
        const staffRows = Array.from(root.querySelectorAll('.staff-row')) as HTMLElement[];
        const gradients = [
          'linear-gradient(135deg,#10d9a8,#3d8ef8)',
          'linear-gradient(135deg,#9d7bf8,#ec4899)',
          'linear-gradient(135deg,#f5a623,#ef4444)',
          'linear-gradient(135deg,#22d3ee,#3d8ef8)',
          'linear-gradient(135deg,#f75c5c,#9d7bf8)',
        ];

        staffRows.forEach((row, i) => {
          const t = teachers[i];
          if (!t) return;
          const nameEl = row.querySelector('.staff-name') as HTMLElement | null;
          const subEl = row.querySelector('.staff-sub') as HTMLElement | null;
          const classEl = row.querySelector('.staff-class') as HTMLElement | null;
          const chipEl = row.querySelector('.chip') as HTMLElement | null;
          const avEl = row.querySelector('.staff-av') as HTMLElement | null;
          if (avEl) {
            avEl.textContent = String(t.name || '?')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((x: string) => x[0]?.toUpperCase())
              .join('');
            avEl.style.background = gradients[i % gradients.length];
          }
          if (nameEl) nameEl.textContent = t.name || 'Teacher';
          if (subEl) subEl.textContent = 'Teaching · Assigned class (placeholder)';
          if (classEl) classEl.textContent = 'Faculty (placeholder)';
          if (chipEl) chipEl.textContent = '● Teaching';
          row.style.cursor = 'pointer';
          row.onclick = () => navigate(`/dashboard/admin/teachers/${t.teacher_id}`);
        });

        // -----------------------
        // Pending Expense Approvals
        // -----------------------
        const expenseRes = await supabase
          .from('school_expenses')
          .select('expense_id, category_name, description, amount, expense_date, reference_number, recorded_by, payment_method, created_at')
          .eq('school_id', schoolId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(4);
        const expenses = expenseRes.data || [];

        const recordedByIds = expenses.map((e: any) => e.recorded_by).filter(Boolean);
        const userMapRes = recordedByIds.length
          ? await supabase.from('users').select('user_id, name').in('user_id', recordedByIds)
          : { data: [] as any[] };
        const userMap = new Map((userMapRes.data || []).map((u: any) => [u.user_id, u.name]));

        if (cancelled) return;
        const expenseRows = Array.from(root.querySelectorAll('.expense-row')) as HTMLElement[];
        expenseRows.forEach((row, i) => {
          const exp = expenses[i];
          const titleEl = row.querySelector('.expense-title') as HTMLElement | null;
          const subEl = row.querySelector('.expense-sub') as HTMLElement | null;
          const amountEl = row.querySelector('.expense-amount') as HTMLElement | null;
          const approveBtn = row.querySelector('button.ea-btn.approve') as HTMLButtonElement | null;
          const declineBtn = row.querySelector('button.ea-btn.decline') as HTMLButtonElement | null;

          if (!exp) return;
          if (titleEl) titleEl.textContent = exp.category_name || 'Expense';
          const recordedByName = userMap.get(exp.recorded_by) || 'Unknown';
          if (subEl) subEl.textContent = `${recordedByName} · ${exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '—'}`;
          if (amountEl) amountEl.textContent = formatUShFull(exp.amount || 0);

          if (approveBtn) {
            approveBtn.dataset.expenseId = exp.expense_id;
            approveBtn.disabled = false;
          }
          if (declineBtn) {
            declineBtn.dataset.expenseId = exp.expense_id;
            declineBtn.disabled = false;
          }
        });

        // -----------------------
        // Recent Payments
        // -----------------------
        const today = new Date().toISOString().slice(0, 10);
        const termRes = await supabase
          .from('school_terms')
          .select('start_date, end_date')
          .eq('school_id', schoolId)
          .order('year', { ascending: false })
          .order('term', { ascending: false });
        const currentTerm = (termRes.data || []).find((t: any) =>
          t.start_date ? t.start_date <= today && t.end_date >= today : t.end_date >= today
        ) || (termRes.data || [])[0] || null;
        const termStart = currentTerm?.start_date || '1900-01-01';
        const termEnd = currentTerm?.end_date || '2100-12-31';

        const paymentsRes = await supabase
          .from('student_payments')
          .select('payment_id, amount_paid, payment_date, payment_method, student_id, students!inner(name)')
          .eq('school_id', schoolId)
          .gte('payment_date', termStart)
          .lte('payment_date', termEnd)
          .order('payment_date', { ascending: false })
          .limit(5);
        const payments = paymentsRes.data || [];

        if (cancelled) return;
        const payRows = Array.from(root.querySelectorAll('.pay-row')) as HTMLElement[];
        payRows.forEach((row, i) => {
          const p = payments[i];
          if (!p) return;
          const payName = row.querySelector('.pay-name') as HTMLElement | null;
          const payMeta = row.querySelector('.pay-meta') as HTMLElement | null;
          const payAmount = row.querySelector('.pay-amount') as HTMLElement | null;
          const payMethod = row.querySelector('.pay-method') as HTMLElement | null;
          const payAv = row.querySelector('.pay-av') as HTMLElement | null;

          const studentName =
            (p as any).students?.name ||
            (Array.isArray((p as any).students) ? (p as any).students[0]?.name : (p as any).students?.name) ||
            'Student';

          if (payName) payName.textContent = studentName;
          if (payMeta) payMeta.textContent = p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '—';
          if (payAmount) payAmount.textContent = formatUShFull(p.amount_paid || 0);
          if (payMethod) payMethod.textContent = p.payment_method || '—';
          if (payAv) {
            payAv.textContent = studentName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((x: string) => x[0]?.toUpperCase())
              .join('');
          }
        });

        // -----------------------
        // Upcoming Events (exam sets)
        // -----------------------
        const currentYear = new Date().getFullYear();
        const examSetsRes = await supabase
          .from('exam_sets')
          .select('id, name, term, year')
          .eq('school_id', schoolId)
          .eq('year', currentYear)
          .order('term', { ascending: true })
          .limit(5);
        const examSets = examSetsRes.data || [];

        if (cancelled) return;
        const upcomingItems = Array.from(root.querySelectorAll('.upcoming-item')) as HTMLElement[];
        const monthByTerm: Record<number, { mon: string; day: number; chip: string }> = {
          1: { mon: 'Mar', day: 20, chip: 'Urgent' },
          2: { mon: 'Mar', day: 28, chip: 'Soon' },
          3: { mon: 'Apr', day: 4, chip: 'Planned' },
          4: { mon: 'May', day: 15, chip: 'Term End' },
          5: { mon: 'Jun', day: 2, chip: 'Upcoming' },
        };

        upcomingItems.forEach((item, i) => {
          const es = examSets[i];
          if (!es) return;
          const titleEl = item.querySelector('.upcoming-title') as HTMLElement | null;
          const subEl = item.querySelector('.upcoming-sub') as HTMLElement | null;
          const chipEl = item.querySelector('.chip') as HTMLElement | null;
          const dayEl = item.querySelector('.ud-day') as HTMLElement | null;
          const monEl = item.querySelector('.ud-mon') as HTMLElement | null;

          if (titleEl) titleEl.textContent = es.name || `Exam Set T${es.term} ${es.year}`;
          if (subEl) subEl.textContent = `Term ${es.term}, ${es.year}`;
          const m = monthByTerm[Number(es.term)] || { mon: 'Mar', day: 1, chip: 'Planned' };
          if (dayEl) dayEl.textContent = String(m.day);
          if (monEl) monEl.textContent = m.mon;
          if (chipEl) chipEl.textContent = m.chip;
        });

        // -----------------------
        // Reminders (latest notification)
        // -----------------------
        const reminderRes = await supabase
          .from('notifications')
          .select('id, title, message, created_at')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(1);
        const reminder = (reminderRes.data || [])[0] || null;

        if (!cancelled && reminder) {
          const reminderCard = Array.from(root.querySelectorAll('.card')).find((c) => {
            const t = (c.querySelector('.card-title')?.textContent || '').trim();
            return t.includes('Reminders');
          });
          if (reminderCard) {
            const titleSpans = (reminderCard as HTMLElement).querySelectorAll('div[style*="font-size:12.5px"]');
            const msgSpans = (reminderCard as HTMLElement).querySelectorAll('div[style*="font-size:11px"]');
            if (titleSpans[0]) titleSpans[0].textContent = reminder.title || 'Reminder';
            if (msgSpans[0]) msgSpans[0].textContent = reminder.message || '';
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  return (
    <>
      <style>{style}</style>
      {/* The injected markup must be direct children of this flex container
          (so the design CSS `body` flex assumptions behave consistently). */}
      <div
        ref={rootRef}
        className={loading ? 'opacity-0' : ''}
        style={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {searchOpen && searchAnchor && (
        <div
          ref={searchDropdownRef}
          className="ac-glass-card rounded-xl shadow-lg border overflow-hidden z-50"
          style={{
            position: 'fixed',
            top: searchAnchor.top,
            left: searchAnchor.left,
            width: searchAnchor.width,
          }}
        >
          {searchLoading ? (
            <div className="p-4 text-center text-sm ac-text-secondary">Searching...</div>
          ) : (
            <>
              {searchResults.students.length > 0 && (
                <div className="border-b border-white/10">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Students
                  </div>
                  {searchResults.students.map((s) => (
                    <button
                      key={s.student_id}
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-white/5 text-sm ac-text-primary"
                      onClick={() => {
                        navigate(`/dashboard/admin/students?highlight=${encodeURIComponent(s.student_id)}`);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <span className="font-medium truncate">{s.name}</span>
                      <span className="ac-text-muted shrink-0">{s.current_class || '—'}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.teachers.length > 0 && (
                <div className="border-b border-white/10">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Teachers
                  </div>
                  {searchResults.teachers.map((t) => (
                    <button
                      key={t.teacher_id}
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-white/5 text-sm ac-text-primary"
                      onClick={() => {
                        navigate('/dashboard/admin/teachers');
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <span className="font-medium truncate">{t.name}</span>
                      {t.email && <span className="ac-text-muted text-xs truncate max-w-[180px]">{t.email}</span>}
                    </button>
                  ))}
                </div>
              )}

              {searchResults.reports.length > 0 && (
                <div className="border-b border-white/10">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Reports
                  </div>
                  {searchResults.reports.map((r) => (
                    <button
                      key={r.report_id}
                      type="button"
                      className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-white/5 text-sm ac-text-primary"
                      onClick={() => {
                        navigate('/dashboard/admin/report-records');
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <span className="font-medium truncate">{r.template_name || 'Report'}</span>
                      {r.student_name && (
                        <span className="ac-text-muted shrink-0 truncate max-w-[120px]">{r.student_name}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!searchLoading &&
                searchQuery.trim().length >= 2 &&
                searchResults.students.length === 0 &&
                searchResults.teachers.length === 0 &&
                searchResults.reports.length === 0 && (
                  <div className="p-4 text-center ac-text-muted text-sm">No results found.</div>
                )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function formatPercent(p: number) {
  if (!Number.isFinite(p)) return '0%';
  return `${Math.round(p)}%`;
}

