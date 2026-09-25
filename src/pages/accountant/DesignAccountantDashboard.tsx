import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { extractStyleAndBody, useDesignDashboardNav, useDesignDashboardThemeSync } from '@/lib/designDashboardHtml';
import { getGreetingLastName } from '@/lib/roleTerminology';

// TODO: Restore when design file is available
// import designRaw from '../../../new designs/pwezacore-accountant-dashboard-react.html?raw';
const designRaw = '<html><body><div id="pa-greeting"></div><div id="pa-date-line"></div><div id="pa-total-revenue"></div><div id="pa-pending-fees"></div><div id="pa-expenses"></div></body></html>';

const { style: SCOPED_STYLE, body: BODY_HTML } = extractStyleAndBody(designRaw);

const fmt = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

const GRADIENTS = [
  'linear-gradient(135deg,#00d084,#10d9a8)',
  'linear-gradient(135deg,#3d8ef8,#10d9a8)',
  'linear-gradient(135deg,#8b5cf6,#3d8ef8)',
  'linear-gradient(135deg,#f43f5e,#f59e0b)',
  'linear-gradient(135deg,#f59e0b,#00d084)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

export default function DesignAccountantDashboard() {
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
      if (!schoolId) return;

      const today = new Date().toISOString().slice(0, 10);
      const yearStart = `${new Date().getFullYear()}-01-01`;

      const [paymentsRes, expensesRes, invoicesRes, balancesRes] = await Promise.all([
        supabase
          .from('student_payments')
          .select('amount_paid, payment_date, payment_method, student_name')
          .eq('school_id', schoolId)
          .gte('payment_date', yearStart)
          .order('payment_date', { ascending: false })
          .limit(40),
        supabase
          .from('school_expenses')
          .select('amount, status, expense_date')
          .eq('school_id', schoolId)
          .gte('expense_date', yearStart),
        supabase
          .from('student_invoices')
          .select('invoice_id, invoice_number, total_amount, balance, due_date, status, student_id')
          .eq('school_id', schoolId)
          .in('status', ['draft', 'issued', 'partial'])
          .order('due_date', { ascending: true })
          .limit(30),
        supabase.from('student_balances').select('balance, student_id').eq('school_id', schoolId).gt('balance', 0).limit(30),
      ]);

      const payments = (paymentsRes.data || []).filter(
        (p: Record<string, unknown>) => !p.reversed_at
      );
      const expenses = expensesRes.data || [];
      const invoices = invoicesRes.data || [];
      const balanceRows = balancesRes.data || [];
      const studentIds = [...new Set(balanceRows.map((b: { student_id: string }) => b.student_id))];
      const invStudentIds = [...new Set(invoices.map((i: { student_id: string }) => i.student_id))];
      const allIds = [...new Set([...studentIds, ...invStudentIds])];
      const { data: studentRows } =
        allIds.length > 0
          ? await supabase.from('students').select('student_id, name, current_class').in('student_id', allIds)
          : { data: [] as { student_id: string; name: string; current_class: string }[] };
      const studentMap = new Map((studentRows || []).map((s) => [s.student_id, s]));

      const totalCollected = payments.reduce((s: number, p: { amount_paid?: number }) => s + Number(p.amount_paid || 0), 0);
      const approvedExpenses = expenses.filter((e: { status?: string }) =>
        ['approved', 'paid'].includes(String(e.status || ''))
      );
      const totalExpenses = approvedExpenses.reduce((s: number, e: { amount?: number }) => s + Number(e.amount || 0), 0);
      const todayCollected = payments
        .filter((p: { payment_date?: string }) => (p.payment_date || '').startsWith(today))
        .reduce((s: number, p: { amount_paid?: number }) => s + Number(p.amount_paid || 0), 0);
      const outstandingFromBalances = balanceRows.reduce(
        (s: number, r: { balance?: number }) => s + Number(r.balance || 0),
        0
      );
      const outstanding = outstandingFromBalances;

      const expectedGuess = totalCollected + outstanding;
      const collectionPct = expectedGuess > 0 ? Math.round((totalCollected / expectedGuess) * 100) : 0;
      const netCash = totalCollected - totalExpenses;

      const rawName = (userData as { name?: string })?.name || user.email?.split('@')[0] || '';
      const lastName = getGreetingLastName(rawName, 'Accountant');
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        const set = (sel: string, val: string) => {
          const n = el.querySelector(sel);
          if (n) n.textContent = val;
        };

        set('#pa-greeting', `${greet}, ${lastName}`);
        set(
          '#pa-date-line',
          new Date().toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        );

        set('[data-kpi="fees-collected"]', fmt(totalCollected));
        set('[data-kpi="fees-expected"]', fmt(expectedGuess));
        set('[data-kpi="outstanding-balance"]', fmt(outstanding));
        set('[data-kpi="collected-today"]', fmt(todayCollected));
        set('[data-kpi="total-expenses"]', fmt(totalExpenses));
        set('[data-kpi="net-cash"]', fmt(netCash));
        set('[data-kpi="pending-invoices"]', String(invoices.filter((i: { status?: string }) => i.status !== 'paid').length));
        set('[data-kpi="bank-balance"]', '—');
        set('#pa-collection-pct', `${collectionPct}%`);
        set('[data-kpi="expense-rate"]', totalCollected > 0 ? `${Math.round((totalExpenses / totalCollected) * 100)}%` : '—%');

        const bar = el.querySelector('#pa-progress-bar') as HTMLElement | null;
        if (bar) bar.style.width = `${Math.min(100, collectionPct)}%`;

        set('[data-kpi="bank-stanbic"]', '—');
        set('[data-kpi="bank-dfcu"]', '—');

        const txList = el.querySelector('#pa-transactions-list');
        if (txList) {
          txList.innerHTML =
            payments.length === 0
              ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No payments recorded yet.</div>`
              : payments.slice(0, 8).map((p: Record<string, unknown>, i: number) => {
                  const name = String(p.student_name || '—');
                  const initials = name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const date = p.payment_date
                    ? new Date(String(p.payment_date)).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
                    : '—';
                  const amt = Number(p.amount_paid || 0);
                  return `
                  <div class="pa-tx-row" data-nav="/dashboard/accountant/payments">
                    <div class="pa-tx-av" style="background:${grad(i)}">${initials}</div>
                    <div style="flex:1">
                      <div class="pa-tx-name">${name}</div>
                      <div class="pa-tx-sub">${String(p.payment_method || 'Payment')} · ${date}</div>
                    </div>
                    <span class="pa-tx-amt credit">+${fmt(amt)}</span>
                  </div>`;
                }).join('');
        }

        const outList = el.querySelector('#pa-outstanding-list');
        if (outList) {
          const top = balanceRows.slice(0, 6) as { balance?: number; student_id: string }[];
          outList.innerHTML =
            top.length === 0
              ? `<div style="padding:20px;text-align:center;color:var(--t3);font-size:13px">No outstanding balances.</div>`
              : top.map((row, i: number) => {
                  const st = studentMap.get(row.student_id);
                  const name = String(st?.name || '—');
                  const initials = name
                    .split(' ')
                    .map((w: string) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const bal = Number(row.balance || 0);
                  return `
                  <div class="pa-out-row" data-nav="/dashboard/accountant/outstanding">
                    <div class="pa-out-av" style="background:${grad(i + 1)}">${initials}</div>
                    <div style="flex:1">
                      <div class="pa-out-name">${name}</div>
                      <div class="pa-out-days">${String(st?.current_class || '')}</div>
                    </div>
                    <span class="pa-out-amt">${fmt(bal)}</span>
                  </div>`;
                }).join('');
        }

        const invList = el.querySelector('#pa-invoices-list');
        if (invList) {
          invList.innerHTML =
            invoices.length === 0
              ? `<div style="padding:16px 18px;color:var(--t3);font-size:13px">No open invoices.</div>`
              : invoices.slice(0, 8).map((inv: Record<string, unknown>) => {
                  const st = studentMap.get(inv.student_id as string);
                  const due = inv.due_date
                    ? new Date(String(inv.due_date)).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })
                    : '—';
                  const isOver = inv.due_date && new Date(String(inv.due_date)) < new Date();
                  const amt = Number(inv.balance ?? inv.total_amount ?? 0);
                  const id = String(inv.invoice_number || (inv.invoice_id as string) || '').slice(-10);
                  return `
                  <div style="display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 80px;padding:11px 18px;border-bottom:1px solid var(--border);align-items:center;cursor:pointer" data-nav="/dashboard/accountant/billing">
                    <div>
                      <div style="font-size:12.5px;font-weight:600;color:var(--t1)">${String(st?.name || '—')}</div>
                      <div style="font-size:11px;color:var(--t3)">${String(st?.current_class || '')}</div>
                    </div>
                    <div style="font-size:12px;color:var(--t2);font-family:'JetBrains Mono',monospace">${id ? `#${id}` : '—'}</div>
                    <div style="font-size:12.5px;font-weight:700;color:var(--t1)">${fmt(amt)}</div>
                    <div style="font-size:12px;color:${isOver ? 'var(--rose)' : 'var(--t2)'}">${due}</div>
                    <span class="pa-chip ${isOver ? 'rose' : 'amber'}">${isOver ? 'Overdue' : String(inv.status || '')}</span>
                  </div>`;
                }).join('');
        }

        set(
          '#pa-reminder-text',
          outstanding > 0
            ? `Outstanding balances total ${fmt(outstanding)}. Review outstanding fees and send reminders from the Outstanding page.`
            : 'Finances look healthy — no outstanding balances on pending invoices.'
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
