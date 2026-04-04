import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { SkeletonKPIStrip } from '@/components/PwezaSkeleton';

import financeTemplateRaw from '@/assets/pwezacore-finance-dashboard.html?raw';

const FINANCE_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

const GRADIENTS = [
  'linear-gradient(135deg,#10d9a8,#3d7eff)',
  'linear-gradient(135deg,#ffb547,#ff4f6a)',
  'linear-gradient(135deg,#3d7eff,#9d7eff)',
  'linear-gradient(135deg,#27e09f,#3d7eff)',
  'linear-gradient(135deg,#ff4f6a,#9d7eff)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

function parseInjectedHtml(raw: string): string {
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let inner = bodyMatch ? bodyMatch[1].trim() : raw;
  inner = inner.replace(/<script[\s\S]*?<\/script>/gi, '');
  const styleBlock = styleMatch ? `<style>${styleMatch[1]}</style>` : '';
  return `${styleBlock}${inner}`;
}

function initials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

export type FinanceDashboardData = {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  totalExpenses: number;
  netPosition: number;
  collectionRate: number;
  studentsCleared: number;
  studentsOwing: number;
  monthlyPayments: Record<number, number>;
  monthlyExpenses: Record<number, number>;
  recentPayments: {
    amount_paid: number;
    payment_date: string | null;
    payment_method: string | null;
    student_id: string;
    student_name: string;
  }[];
  recentExpenses: {
    amount: number;
    expense_date: string | null;
    category_name: string | null;
    description: string | null;
    status: string | null;
  }[];
  topOutstanding: { student_id: string; name: string; current_class: string; balance: number }[];
};

export async function fetchFinanceDashboard(userId: string): Promise<FinanceDashboardData> {
  const { data: me } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  const schoolId = me?.school_id as string | undefined;
  if (!schoolId) {
    return {
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalExpenses: 0,
      netPosition: 0,
      collectionRate: 0,
      studentsCleared: 0,
      studentsOwing: 0,
      monthlyPayments: {},
      monthlyExpenses: {},
      recentPayments: [],
      recentExpenses: [],
      topOutstanding: [],
    };
  }

  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [
    balancesRes,
    paysRes,
    expensesRes,
    studsRes,
    paysRecentRes,
    expRecentRes,
    priorRes,
  ] = await Promise.all([
    supabase.from('student_balances').select('student_id, total_fees, total_paid, balance').eq('school_id', schoolId),
    supabase
      .from('student_payments')
      .select('amount_paid, payment_date')
      .eq('school_id', schoolId)
      .gte('payment_date', yearStart)
      .lte('payment_date', yearEnd),
    supabase
      .from('school_expenses')
      .select('amount, expense_date, status')
      .eq('school_id', schoolId)
      .gte('expense_date', yearStart)
      .lte('expense_date', yearEnd),
    supabase.from('students').select('student_id, name, current_class, status, expected_fee_amount').eq('school_id', schoolId).eq('status', 'active'),
    supabase
      .from('student_payments')
      .select('amount_paid, payment_date, payment_method, student_id')
      .eq('school_id', schoolId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('school_expenses')
      .select('amount, expense_date, status, category_name, description')
      .eq('school_id', schoolId)
      .order('expense_date', { ascending: false })
      .limit(8),
    supabase.from('prior_system_balance_entries').select('student_id, amount_outstanding').eq('school_id', schoolId),
  ]);

  const balances = balancesRes.data || [];
  const paysYear = paysRes.data || [];
  const expensesYear = expensesRes.data || [];
  const students = studsRes.data || [];

  let totalExpected = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  if (balances.length > 0) {
    for (const b of balances) {
      totalExpected += Number((b as { total_fees?: number }).total_fees ?? 0);
      totalCollected += Number((b as { total_paid?: number }).total_paid ?? 0);
      totalOutstanding += Math.max(0, Number((b as { balance?: number }).balance ?? 0));
    }
  } else {
    const allPays = await supabase.from('student_payments').select('student_id, amount_paid').eq('school_id', schoolId);
    const paidByStudent: Record<string, number> = {};
    for (const p of allPays.data || []) {
      const sid = (p as { student_id: string }).student_id;
      paidByStudent[sid] = (paidByStudent[sid] || 0) + Number((p as { amount_paid?: number }).amount_paid ?? 0);
    }
    for (const s of students) {
      const sid = (s as { student_id: string }).student_id;
      const exp = Number((s as { expected_fee_amount?: number }).expected_fee_amount ?? 0);
      const paid = paidByStudent[sid] || 0;
      totalExpected += exp;
      totalCollected += paid;
      totalOutstanding += Math.max(0, exp - paid);
    }
  }

  const priorRows = priorRes.data || [];
  const priorTotalOutstanding = priorRows.reduce(
    (s, r) => s + Math.max(0, Number((r as { amount_outstanding?: number }).amount_outstanding ?? 0)),
    0
  );
  totalOutstanding += priorTotalOutstanding;

  const expenseApproved = expensesYear.filter((e) => ['approved', 'paid'].includes(String((e as { status?: string }).status || '')));
  const totalExpenses = expenseApproved.reduce((s, e) => s + Number((e as { amount?: number }).amount ?? 0), 0);

  const owingByStudent = new Map<string, number>();
  if (balances.length > 0) {
    for (const b of balances) {
      const sid = (b as { student_id: string }).student_id;
      const bal = Math.max(0, Number((b as { balance?: number }).balance ?? 0));
      owingByStudent.set(sid, (owingByStudent.get(sid) || 0) + bal);
    }
  } else {
    const allPays = await supabase.from('student_payments').select('student_id, amount_paid').eq('school_id', schoolId);
    const paidByStudent: Record<string, number> = {};
    for (const p of allPays.data || []) {
      const sid = (p as { student_id: string }).student_id;
      paidByStudent[sid] = (paidByStudent[sid] || 0) + Number((p as { amount_paid?: number }).amount_paid ?? 0);
    }
    for (const s of students) {
      const sid = (s as { student_id: string }).student_id;
      const exp = Number((s as { expected_fee_amount?: number }).expected_fee_amount ?? 0);
      const paid = paidByStudent[sid] || 0;
      owingByStudent.set(sid, Math.max(0, exp - paid));
    }
  }

  for (const r of priorRows) {
    const sid = (r as { student_id?: string }).student_id;
    const amt = Math.max(0, Number((r as { amount_outstanding?: number }).amount_outstanding ?? 0));
    if (!sid || !amt) continue;
    owingByStudent.set(sid, (owingByStudent.get(sid) || 0) + amt);
  }

  let studentsOwing = 0;
  for (const v of owingByStudent.values()) {
    if (v > 0) studentsOwing += 1;
  }
  const studentsCleared = Math.max(0, students.length - studentsOwing);

  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const netPosition = totalCollected - totalExpenses;

  const monthlyPayments: Record<number, number> = {};
  const monthlyExpenses: Record<number, number> = {};
  for (let m = 0; m < 12; m++) {
    monthlyPayments[m] = 0;
    monthlyExpenses[m] = 0;
  }
  paysYear.forEach((p: { payment_date?: string; amount_paid?: number }) => {
    const d = p.payment_date;
    if (!d) return;
    const monthIndex = parseInt(d.slice(5, 7), 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) monthlyPayments[monthIndex] += Number(p.amount_paid || 0);
  });
  expenseApproved.forEach((e: { expense_date?: string; amount?: number }) => {
    const d = e.expense_date;
    if (!d) return;
    const monthIndex = parseInt(d.slice(5, 7), 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) monthlyExpenses[monthIndex] += Number(e.amount || 0);
  });

  const paysRecent = paysRecentRes.data || [];
  const studentIds = [...new Set(paysRecent.map((p: { student_id: string }) => p.student_id))];
  const nameMap: Record<string, string> = {};
  if (studentIds.length) {
    const { data: sn } = await supabase.from('students').select('student_id, name').eq('school_id', schoolId).in('student_id', studentIds);
    for (const r of sn || []) {
      nameMap[(r as { student_id: string }).student_id] = String((r as { name?: string }).name ?? '—');
    }
  }

  const recentPayments = paysRecent.slice(0, 8).map((p: { amount_paid?: number; payment_date?: string | null; payment_method?: string | null; student_id: string }) => ({
    amount_paid: Number(p.amount_paid ?? 0),
    payment_date: p.payment_date ?? null,
    payment_method: p.payment_method ?? null,
    student_id: p.student_id,
    student_name: nameMap[p.student_id] || '—',
  }));

  const recentExpenses = (expRecentRes.data || []).slice(0, 6).map(
    (e: { amount?: number; expense_date?: string | null; category_name?: string | null; description?: string | null; status?: string | null }) => ({
      amount: Number(e.amount ?? 0),
      expense_date: e.expense_date ?? null,
      category_name: e.category_name ?? null,
      description: e.description ?? null,
      status: e.status ?? null,
    })
  );

  const topOutstanding: { student_id: string; name: string; current_class: string; balance: number }[] = [];
  if (balances.length > 0) {
    const agg = new Map<string, number>();
    for (const b of balances) {
      const sid = (b as { student_id: string }).student_id;
      const bal = Math.max(0, Number((b as { balance?: number }).balance ?? 0));
      agg.set(sid, (agg.get(sid) || 0) + bal);
    }
    for (const s of students) {
      const sid = (s as { student_id: string }).student_id;
      const bal = agg.get(sid) || 0;
      if (bal > 0) {
        topOutstanding.push({
          student_id: sid,
          name: String((s as { name?: string }).name ?? '—'),
          current_class: String((s as { current_class?: string }).current_class ?? '—'),
          balance: bal,
        });
      }
    }
  } else {
    const allPays = await supabase.from('student_payments').select('student_id, amount_paid').eq('school_id', schoolId);
    const paidByStudent: Record<string, number> = {};
    for (const p of allPays.data || []) {
      const sid = (p as { student_id: string }).student_id;
      paidByStudent[sid] = (paidByStudent[sid] || 0) + Number((p as { amount_paid?: number }).amount_paid ?? 0);
    }
    for (const s of students) {
      const sid = (s as { student_id: string }).student_id;
      const exp = Number((s as { expected_fee_amount?: number }).expected_fee_amount ?? 0);
      const paid = paidByStudent[sid] || 0;
      const bal = Math.max(0, exp - paid);
      if (bal > 0) {
        topOutstanding.push({
          student_id: sid,
          name: String((s as { name?: string }).name ?? '—'),
          current_class: String((s as { current_class?: string }).current_class ?? '—'),
          balance: bal,
        });
      }
    }
  }
  topOutstanding.sort((a, b) => b.balance - a.balance);
  const top5 = topOutstanding.slice(0, 5);

  return {
    totalExpected,
    totalCollected,
    totalOutstanding,
    totalExpenses,
    netPosition,
    collectionRate,
    studentsCleared,
    studentsOwing,
    monthlyPayments,
    monthlyExpenses,
    recentPayments,
    recentExpenses,
    topOutstanding: top5,
  };
}

export default function DesignFinanceDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastInjectedHtmlRef = useRef<string | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    const id = 'pweza-finance-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = FINANCE_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    setHtmlContent(parseInjectedHtml(financeTemplateRaw));
  }, []);

  const { data, isPending } = useQuery({
    queryKey: adminQueryKeys.financeDashboard(user?.id ?? ''),
    queryFn: () => fetchFinanceDashboard(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const render = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const root = el.querySelector('.pw-finance') || el;
    const d = data;
    const loading = !d && isPending;

    const set = (sel: string, val: string) => {
      const n = root.querySelector(sel);
      if (n) n.textContent = val;
    };
    const setHTML = (id: string, html: string) => {
      const n = root.querySelector(id);
      if (n) (n as HTMLElement).innerHTML = html;
    };

    const now = new Date();
    set(
      '#fn-date-line',
      `As of ${now.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    );

    set('[data-kpi="total-expected"]', loading ? '…' : fmt(d?.totalExpected ?? 0));
    set('[data-kpi="total-collected"]', loading ? '…' : fmt(d?.totalCollected ?? 0));
    set('[data-kpi="total-outstanding"]', loading ? '…' : fmt(d?.totalOutstanding ?? 0));
    set('[data-kpi="total-expenses"]', loading ? '…' : fmt(d?.totalExpenses ?? 0));
    set('[data-kpi="net-position"]', loading ? '…' : fmt(d?.netPosition ?? 0));
    set('[data-kpi="collection-rate"]', loading ? '…' : `${d?.collectionRate ?? 0}%`);
    set('[data-kpi="students-cleared"]', loading ? '…' : String(d?.studentsCleared ?? 0));
    set('[data-kpi="students-owing"]', loading ? '…' : String(d?.studentsOwing ?? 0));

    set('#fn-collection-pct', loading ? '—' : `${d?.collectionRate ?? 0}%`);
    const bar = root.querySelector('#fn-collection-bar') as HTMLElement | null;
    if (bar) bar.style.width = `${loading ? 0 : d?.collectionRate ?? 0}%`;
    set('#fn-prog-collected', loading ? 'Collected: —' : `Collected: ${fmt(d?.totalCollected ?? 0)}`);
    set('#fn-prog-expected', loading ? 'Target: —' : `Target: ${fmt(d?.totalExpected ?? 0)}`);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = now.getMonth();
    const mp = d?.monthlyPayments || {};
    const me = d?.monthlyExpenses || {};
    const maxM = Math.max(1, ...months.map((_, i) => (mp[i] || 0) + (me[i] || 0)));

    let bestIdx = 0;
    let bestVal = 0;
    months.forEach((_, i) => {
      const v = mp[i] || 0;
      if (v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });
    set('[data-kpi="monthly-collected"]', loading ? '—' : fmt(Object.values(mp).reduce((a, b) => a + b, 0)));
    set('[data-kpi="monthly-expenses"]', loading ? '—' : fmt(Object.values(me).reduce((a, b) => a + b, 0)));
    set('[data-kpi="best-month"]', loading ? '—' : months[bestIdx]);

    setHTML(
      '#fn-monthly-bars',
      months
        .map((m, i) => {
          const amt = mp[i] || 0;
          const pct = Math.round((amt / maxM) * 100);
          const h = Math.max(4, (pct * 80) / 100);
          const isFuture = i > currentMonth;
          const bg = isFuture ? 'var(--s4)' : amt > 0 ? 'var(--em)' : 'var(--s4)';
          const opacity = isFuture ? '.3' : amt > 0 ? '1' : '.4';
          return `<div class="fn-bar-col"><div class="fn-bar" style="height:${h}px;background:${bg};opacity:${opacity}" title="${m}: ${fmt(amt)}"></div><div class="fn-bar-lbl">${m}</div></div>`;
        })
        .join('')
    );

    const pays = d?.recentPayments ?? [];
    setHTML(
      '#fn-recent-payments',
      pays.length === 0
        ? `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">No payments recorded yet.</div>`
        : pays
            .map((p, i) => {
              const ini = initials(p.student_name);
              const date = p.payment_date
                ? new Date(p.payment_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
                : '—';
              return `
                <div class="fn-trow" data-nav="/dashboard/admin/finance/payments">
                  <div class="fn-trow-av" style="background:${grad(i)}">${escapeHtml(ini)}</div>
                  <div style="flex:1">
                    <div class="fn-trow-name">${escapeHtml(p.student_name)}</div>
                    <div class="fn-trow-sub">${escapeHtml(p.payment_method || 'Cash')} · ${escapeHtml(date)}</div>
                  </div>
                  <span class="fn-trow-tag green">Paid</span>
                  <div class="fn-trow-amt green">+ ${fmt(p.amount_paid)}</div>
                </div>`;
            })
            .join('')
    );

    const outs = d?.topOutstanding ?? [];
    setHTML(
      '#fn-outstanding-list',
      outs.length === 0
        ? `<div style="padding:24px;text-align:center;color:var(--em);font-size:13px">🎉 All students have cleared their fees!</div>`
        : outs
            .map((s, i) => {
              const ini = initials(s.name);
              return `
                <div class="fn-trow" data-nav="/dashboard/admin/students/${escapeHtml(s.student_id)}">
                  <div class="fn-trow-av" style="background:${grad(i + 2)}">${escapeHtml(ini)}</div>
                  <div style="flex:1">
                    <div class="fn-trow-name">${escapeHtml(s.name)}</div>
                    <div class="fn-trow-sub">${escapeHtml(s.current_class)}</div>
                  </div>
                  <div class="fn-trow-amt rose">${fmt(s.balance)}</div>
                </div>`;
            })
            .join('')
    );

    const exps = d?.recentExpenses ?? [];
    setHTML(
      '#fn-recent-expenses',
      exps.length === 0
        ? `<div style="padding:24px;text-align:center;color:var(--t3);font-size:13px">No expenses recorded yet.</div>`
        : exps.map((e) => {
            const date = e.expense_date
              ? new Date(e.expense_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
              : '—';
            const ok = ['approved', 'paid'].includes(String(e.status || ''));
            const desc = e.description || '—';
            const cat = e.category_name || 'General';
            return `
                <div class="fn-trow" data-nav="/dashboard/admin/finance/expenses">
                  <div class="fn-trow-av" style="background:linear-gradient(135deg,#ffb547,#ff4f6a)">🧾</div>
                  <div style="flex:1">
                    <div class="fn-trow-name">${escapeHtml(desc)}</div>
                    <div class="fn-trow-sub">${escapeHtml(cat)} · ${escapeHtml(date)}</div>
                  </div>
                  <span class="fn-trow-tag ${ok ? 'green' : 'amber'}">${ok ? 'Approved' : 'Pending'}</span>
                  <div class="fn-trow-amt amber">− ${fmt(e.amount)}</div>
                </div>`;
          }).join('')
    );

  }, [data, isPending]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !htmlContent) return;
    if (lastInjectedHtmlRef.current !== htmlContent) {
      el.innerHTML = htmlContent;
      lastInjectedHtmlRef.current = htmlContent;
    }
    requestAnimationFrame(() => render());
  }, [htmlContent, render]);

  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    const root = containerRef.current.querySelector('.pw-finance') || containerRef.current;
    const onNav = (e: Event) => {
      const t = (e.target as HTMLElement | null)?.closest('[data-nav]');
      if (!t) return;
      e.preventDefault();
      const href = t.getAttribute('data-nav');
      if (href) navigate(href);
    };
    root.addEventListener('click', onNav);
    const printBtn = root.querySelector('#fn-btn-print') as HTMLElement | null;
    if (printBtn) printBtn.onclick = () => window.print();
    const exportBtn = root.querySelector('#fn-btn-export') as HTMLElement | null;
    if (exportBtn) exportBtn.onclick = () => navigate('/dashboard/admin/finance/reports');
    const recBtn = root.querySelector('#fn-btn-record-payment') as HTMLElement | null;
    if (recBtn) recBtn.onclick = () => navigate('/dashboard/admin/finance/payments/new');
    return () => root.removeEventListener('click', onNav);
  }, [htmlContent, navigate]);

  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () =>
      document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  if (user?.id && isPending && !data) {
    return (
      <div style={{ padding: '26px 28px' }}>
        <SkeletonKPIStrip count={4} />
        <SkeletonKPIStrip count={4} />
        <div style={{ height: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '24px' }} />
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', minHeight: '100vh', display: 'block' }} />;
}
