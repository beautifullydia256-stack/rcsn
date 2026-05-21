import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { loadOutstandingBalanceAggByStudentAllTerms, type BalanceAgg } from '@/lib/adminFinanceTerm';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { SkeletonKPIStrip, SkeletonTable } from '@/components/PwezaSkeleton';
import { exportToPdf } from '@/lib/exportUtils';

import outstandingTemplateRaw from '@/assets/pwezacore-outstanding.html?raw';

const DEFAULT_PAGE_SIZE = 20;
const OUTSTANDING_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

function parseOutstandingBody(raw: string): { html: string; script: string } {
  const styleMatch = raw.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let inner = bodyMatch ? bodyMatch[1].trim() : raw;
  const scriptMatch = inner.match(/<script>([\s\S]*?)<\/script>/i);
  const script = scriptMatch ? scriptMatch[1] : '';
  inner = inner.replace(/<script[\s\S]*?<\/script>/gi, '');
  const styleBlock = styleMatch ? `<style>${styleMatch[1]}</style>` : '';
  return { html: `${styleBlock}${inner}`, script };
}

const OUTSTANDING_PARSED = parseOutstandingBody(outstandingTemplateRaw);

/** Match Students list — refined terminal palette */
const GRADIENTS = [
  'linear-gradient(135deg, #3d7eff, #9d7eff)',
  'linear-gradient(135deg, #9d7eff, #00e5c3)',
  'linear-gradient(135deg, #00e5c3, #3d7eff)',
  'linear-gradient(135deg, #ffb547, #00e5c3)',
  'linear-gradient(135deg, #27e09f, #3d7eff)',
  'linear-gradient(135deg, #9d7eff, #00e5c3)',
];
const grad = (i: number) => GRADIENTS[i % GRADIENTS.length];

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
  return `UGX ${Math.round(n).toLocaleString()}`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function balanceClass(balance: number) {
  if (balance > 200000) return 'high';
  if (balance > 50000) return 'mid';
  return 'low';
}

function fillColor(pctPaid: number) {
  if (pctPaid === 0) return 'var(--danger)';
  if (pctPaid < 80) return 'var(--amber)';
  return 'var(--em)';
}

function statusClass(pctPaid: number) {
  if (pctPaid === 0) return 'zero';
  return 'partial';
}

export type OutstandingRow = {
  student_id: string;
  name: string;
  current_class: string;
  amount_paid: number;
  fee_balance: number;
  fee_total: number;
  pct_paid: number;
  parent_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  parent_id: string | null;
};

export type FetchOutstandingResult = { rows: OutstandingRow[]; clearedCount: number };

export async function fetchOutstandingData(userId: string, termId?: string): Promise<FetchOutstandingResult> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return { rows: [], clearedCount: 0 };
  const schoolId = data.school_id as string;

  let balanceByStudent: Map<string, BalanceAgg>;
  if (termId) {
    const { data: rows } = await supabase
      .from('student_balances')
      .select('student_id, total_fees, total_paid, balance')
      .eq('school_id', schoolId)
      .eq('term_id', termId);
    balanceByStudent = new Map();
    for (const r of rows || []) {
      const sid = (r as { student_id?: string }).student_id;
      if (!sid) continue;
      const cur = balanceByStudent.get(sid) || { total_fees: 0, total_paid: 0, balance: 0 };
      cur.total_fees += Number((r as { total_fees?: number }).total_fees ?? 0);
      cur.total_paid += Number((r as { total_paid?: number }).total_paid ?? 0);
      cur.balance += Math.max(0, Number((r as { balance?: number }).balance ?? 0));
      balanceByStudent.set(sid, cur);
    }
  } else {
    balanceByStudent = await loadOutstandingBalanceAggByStudentAllTerms(supabase, schoolId);
  }

  const owingIds = [...balanceByStudent.entries()]
    .filter(([, a]) => a.balance > 0)
    .map(([id]) => id);

  const [studsRes, parentsRes, rosterRes] = await Promise.all([
    owingIds.length
      ? supabase
          .from('students')
          .select('student_id,name,current_class,status')
          .eq('school_id', schoolId)
          .in('student_id', owingIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    supabase.from('parents').select('student_id,name,email,phone,parent_id').eq('school_id', schoolId),
    supabase.from('students').select('student_id').eq('school_id', schoolId),
  ]);

  const parents = parentsRes.data || [];
  const parentByStudent = new Map<string, { name?: string; email?: string; phone?: string; parent_id?: string }>();
  for (const p of parents) {
    const row = p as { student_id?: string; name?: string; email?: string; phone?: string; parent_id?: string };
    if (row.student_id) parentByStudent.set(row.student_id, row);
  }

  const studById = new Map(
    (studsRes.data || []).map((s) => [String((s as { student_id: string }).student_id), s as Record<string, unknown>])
  );

  const rows: OutstandingRow[] = owingIds.map((sid) => {
    const s = studById.get(sid);
    const parent = parentByStudent.get(sid);
    const agg = balanceByStudent.get(sid);
    const expected = Number(agg?.total_fees ?? 0);
    const paid = Number(agg?.total_paid ?? 0);
    const balance = Number(agg?.balance ?? 0);
    const totalForPct = expected;
    const pct = totalForPct > 0 ? Math.round((paid / totalForPct) * 100) : 0;
    const status = s ? String((s.status as string) || '') : '';
    const inactive = status && status !== 'active';
    const displayName = s ? String(s.name ?? '—') : 'Student (not on current roster)';
    const displayClass = s
      ? [String(s.current_class ?? '—'), inactive ? `· ${status}` : ''].filter(Boolean).join(' ')
      : '—';
    return {
      student_id: sid,
      name: displayName,
      current_class: displayClass,
      amount_paid: paid,
      fee_balance: balance,
      fee_total: totalForPct,
      pct_paid: pct,
      parent_name: parent?.name ?? null,
      parent_email: parent?.email ?? null,
      parent_phone: parent?.phone ?? null,
      parent_id: parent?.parent_id ?? null,
    };
  });

  let clearedCount = 0;
  for (const r of rosterRes.data || []) {
    const sid = (r as { student_id: string }).student_id;
    const bal = balanceByStudent.get(sid)?.balance ?? 0;
    if (bal <= 0) clearedCount += 1;
  }

  return {
    rows,
    clearedCount,
  };
}

type SortLabel =
  | 'Highest Balance First'
  | 'Lowest Balance First'
  | 'Name A → Z'
  | '% Paid Ascending';

export default function DesignOutstandingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastInjectedHtmlRef = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [sortLabel, setSortLabel] = useState<SortLabel>('Highest Balance First');
  const [pageSize, setPageSize] = useState<number | 'all'>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const paginationRef = useRef({ totalPages: 1 });

  useEffect(() => {
    const id = 'pweza-outstanding-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = OUTSTANDING_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    setHtmlContent(OUTSTANDING_PARSED.html);
  }, []);

  const { data: outstandingData, isPending } = useQuery({
    queryKey: adminQueryKeys.financeOutstanding(user?.id ?? '', termFilter),
    queryFn: () => fetchOutstandingData(user!.id, termFilter === 'all' ? undefined : termFilter),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
  const allRows = outstandingData?.rows ?? [];
  const clearedCountTotal = outstandingData?.clearedCount ?? 0;

  const { data: schoolTerms = [] } = useQuery({
    queryKey: ['outstanding', 'terms', schoolId ?? ''],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('school_terms')
        .select('id, term, year')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: false });
      return (data ?? []) as { id: string; term: number; year: number }[];
    },
    enabled: !!schoolId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: schoolName = '' } = useQuery({
    queryKey: ['outstanding', 'school-name', schoolId ?? ''],
    queryFn: async () => {
      if (!schoolId) return '';
      const { data } = await supabase.from('schools').select('name').eq('school_id', schoolId).single();
      return (data as { name?: string } | null)?.name ?? '';
    },
    enabled: !!schoolId,
    staleTime: 30 * 60 * 1000,
  });

  const classOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) {
      if (r.current_class) s.add(r.current_class);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const filteredSorted = useMemo(() => {
    let result = [...allRows];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.current_class.toLowerCase().includes(q) ||
          (r.parent_name || '').toLowerCase().includes(q) ||
          (r.parent_email || '').toLowerCase().includes(q)
      );
    }
    if (classFilter) result = result.filter((r) => r.current_class === classFilter);
    if (statusFilter === 'zero') result = result.filter((r) => r.pct_paid === 0);
    if (statusFilter === 'partial') result = result.filter((r) => r.pct_paid > 0 && r.pct_paid < 100);
    if (statusFilter === 'high') result = result.filter((r) => r.fee_balance > 200000);

    const an = (a: OutstandingRow) => a.name.toLowerCase();

    /** When searching, surface closer name / guardian matches first. */
    const relevance = (r: OutstandingRow): number => {
      if (!q) return 0;
      const n = r.name.toLowerCase();
      const pn = (r.parent_name || '').toLowerCase();
      const em = (r.parent_email || '').toLowerCase();
      const cl = r.current_class.toLowerCase();
      if (n.startsWith(q)) return 0;
      if (n.includes(q)) return 2;
      if (pn.startsWith(q) || em.startsWith(q)) return 3;
      if (pn.includes(q) || em.includes(q)) return 4;
      if (cl.includes(q)) return 5;
      return 6;
    };

    result.sort((a, b) => {
      if (q) {
        const ra = relevance(a);
        const rb = relevance(b);
        if (ra !== rb) return ra - rb;
      }
      switch (sortLabel) {
        case 'Lowest Balance First':
          return a.fee_balance - b.fee_balance || an(a).localeCompare(an(b));
        case 'Name A → Z':
          return an(a).localeCompare(an(b));
        case '% Paid Ascending':
          return a.pct_paid - b.pct_paid || b.fee_balance - a.fee_balance;
        default:
          return b.fee_balance - a.fee_balance || an(a).localeCompare(an(b));
      }
    });
    return result;
  }, [allRows, searchQuery, classFilter, statusFilter, sortLabel]);

  const effectivePageSize =
    pageSize === 'all' ? Math.max(filteredSorted.length, 1) : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / effectivePageSize));
  const safePage = Math.min(page, totalPages);
  paginationRef.current.totalPages = totalPages;

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, classFilter, statusFilter, sortLabel, pageSize, termFilter]);

  const startIdx = filteredSorted.length === 0 ? 0 : (safePage - 1) * effectivePageSize + 1;
  const endIdx = Math.min(safePage * effectivePageSize, filteredSorted.length);

  useEffect(() => {
    let cancelled = false;
    async function wireInApp() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser || cancelled) return;
      const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', authUser.id).single();
      const schoolId = userData?.school_id as string | undefined;

      (window as unknown as { _sendInAppMessage?: (p: unknown) => Promise<void> })._sendInAppMessage = async (payload: unknown) => {
        const p = payload as {
          body: string;
          target: { parentId?: string; name?: string; studentName?: string };
        };
        const recipientId = p.target?.parentId;
        if (!recipientId || !schoolId) {
          throw new Error('No linked parent portal account for this guardian.');
        }
        const { error } = await supabase.from('messages').insert({
          sender_id: authUser.id,
          sender_type: 'admin',
          recipient_id: recipientId,
          recipient_type: 'parent',
          subject: `Fee Reminder — ${p.target?.studentName || 'Student'}`,
          body: p.body,
          read: false,
        });
        if (error) throw error;
      };
    }
    void wireInApp();
    return () => {
      cancelled = true;
      delete (window as unknown as { _sendInAppMessage?: unknown })._sendInAppMessage;
    };
  }, []);

  useEffect(() => {
    if (!htmlContent || !wrapRef.current) return;
    const wrap = wrapRef.current;
    const s = document.createElement('script');
    s.textContent = OUTSTANDING_PARSED.script;
    wrap.appendChild(s);
    return () => {
      s.remove();
    };
  }, [htmlContent]);

  const termLabel = useMemo(() => {
    if (termFilter === 'all') return 'All Terms';
    const t = schoolTerms.find((t) => t.id === termFilter);
    return t ? `Term ${t.term}, ${t.year}` : 'Selected Term';
  }, [termFilter, schoolTerms]);

  function handleDownloadPdf() {
    exportToPdf({
      title: 'Outstanding Balances',
      subtitle: termLabel,
      schoolName,
      filename: `outstanding-balances-${termLabel.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      columns: [
        { header: 'Student', key: 'name', width: 2.5 },
        { header: 'Class', key: 'current_class', width: 1 },
        { header: 'Amount Paid', key: 'amount_paid', width: 1.3, align: 'right', format: (v) => `UGX ${Math.round(Number(v)).toLocaleString()}` },
        { header: 'Balance', key: 'fee_balance', width: 1.3, align: 'right', format: (v) => `UGX ${Math.round(Number(v)).toLocaleString()}` },
        { header: 'Parent', key: 'parent_name', width: 1.5, format: (v) => String(v ?? '—') },
        { header: 'Parent Phone', key: 'parent_phone', width: 1.2, format: (v) => String(v ?? '—') },
      ],
      rows: filteredSorted as unknown as Record<string, unknown>[],
      totalsRow: [
        `${filteredSorted.length} students`,
        '',
        `UGX ${Math.round(filteredSorted.reduce((s, r) => s + r.amount_paid, 0)).toLocaleString()}`,
        `UGX ${Math.round(filteredSorted.reduce((s, r) => s + r.fee_balance, 0)).toLocaleString()}`,
        '',
        '',
      ],
    });
  }

  const renderTable = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const root = el.querySelector('.pw-outstanding') || el;
    const loading = !outstandingData && isPending;
    const start = (safePage - 1) * effectivePageSize;
    const pageData = filteredSorted.slice(start, start + effectivePageSize);
    const total = filteredSorted.length;

    const totalOut = allRows.reduce((s, st) => s + st.fee_balance, 0);
    const zeroPaid = allRows.filter((s) => s.pct_paid === 0).length;

    const set = (sel: string, val: string) => {
      const n = root.querySelector(sel);
      if (n) n.textContent = val;
    };

    set('[data-kpi="total-outstanding"]', loading ? '…' : fmt(totalOut));
    set('[data-kpi="students-owing"]', loading ? '…' : String(allRows.length));
    set('[data-kpi="zero-paid"]', loading ? '…' : String(zeroPaid));
    set('[data-kpi="total-cleared"]', loading ? '…' : String(clearedCountTotal));

    const info = root.querySelector('#ob-page-info');
    if (info) {
      info.innerHTML =
        total === 0
          ? 'Showing <strong>0</strong> of <strong>0</strong> students with balances'
          : `Showing <strong>${startIdx}</strong>–<strong>${endIdx}</strong> of <strong>${total}</strong> students with balances`;
    }

    const termSel = root.querySelector('#ob-term-filter') as HTMLSelectElement | null;
    if (termSel) {
      termSel.innerHTML =
        `<option value="all">All Terms</option>` +
        schoolTerms.map((t) => `<option value="${escapeHtml(t.id)}">Term ${t.term}, ${t.year}</option>`).join('');
      termSel.value = termFilter;
    }

    const classSel = root.querySelector('#ob-class-filter') as HTMLSelectElement | null;
    if (classSel) {
      const cur = classFilter;
      classSel.innerHTML =
        `<option value="">All Classes</option>` +
        classOptions.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      classSel.value = cur && classOptions.includes(cur) ? cur : '';
    }

    const sortSel = root.querySelector('#ob-sort-select') as HTMLSelectElement | null;
    if (sortSel) sortSel.value = sortLabel;

    const pageSizeSel = root.querySelector('#ob-page-size') as HTMLSelectElement | null;
    if (pageSizeSel) pageSizeSel.value = pageSize === 'all' ? 'all' : String(pageSize);

    const searchInput = root.querySelector('#ob-search') as HTMLInputElement | null;
    if (
      searchInput &&
      document.activeElement !== searchInput &&
      searchInput.value !== searchQuery
    ) {
      searchInput.value = searchQuery;
    }

    const clearBtn = root.querySelector('#ob-search-clear') as HTMLButtonElement | null;
    if (clearBtn) clearBtn.style.visibility = searchQuery.trim() ? 'visible' : 'hidden';

    const hintEl = root.querySelector('#ob-filter-hint');
    if (hintEl) {
      const q = searchQuery.trim();
      hintEl.textContent = q
        ? `${total} match${total === 1 ? '' : 'es'} · name / guardian matches ranked first`
        : `${total} student${total === 1 ? '' : 's'} with outstanding balance`;
    }

    const tbody = root.querySelector('#ob-table-body');
    if (tbody) {
      if (pageData.length === 0) {
        tbody.innerHTML = `<div style="padding:40px;text-align:center;color:var(--t3);font-size:13px">🎉 No outstanding balances found!</div>`;
      } else {
        tbody.innerHTML = pageData
          .map((s, i) => {
            const ini = initials(s.name);
            const bg = grad(start + i);
            const pct = s.pct_paid;
            const balCls = balanceClass(s.fee_balance);
            const fill = fillColor(pct);
            const cl = s.current_class || '';
            const classColor = cl.includes('7') ? 'violet' : cl.includes('1') ? 'rose' : 'blue';
            const parentDisp = s.parent_name
              ? escapeHtml(s.parent_name)
              : '<span style="color:var(--t3);font-style:italic">—</span>';
            const phone = String(s.parent_phone || '').trim();
            const pid = s.parent_id ? escapeHtml(s.parent_id) : '';
            return `
                <div class="ob-trow">
                  <div class="ob-td"><input type="checkbox" class="ob-check ob-row-check" data-student-id="${escapeHtml(
                    s.student_id
                  )}" style="width:16px;height:16px;accent-color:var(--accent)"></div>
                  <div class="ob-td">
                    <div class="ob-student-cell">
                      <div class="ob-av" style="background:${bg}">${escapeHtml(ini)}</div>
                      <div>
                        <div class="ob-student-name" data-nav="/dashboard/admin/students/${escapeHtml(s.student_id)}">${escapeHtml(
              s.name
            )}</div>
                        <div class="ob-student-class">${escapeHtml(s.current_class)}</div>
                      </div>
                    </div>
                  </div>
                  <div class="ob-td"><span style="background:var(--${classColor}-s,var(--blue-s));color:var(--${classColor},var(--blue));padding:3px 9px;border-radius:20px;font-size:11.5px;font-weight:600">${escapeHtml(
              cl
            )}</span></div>
                  <div class="ob-td"><span class="ob-amount${s.amount_paid === 0 ? ' zero' : ''}">${fmt(s.amount_paid)}</span></div>
                  <div class="ob-td">
                    <div class="ob-balance ${balCls}">${fmt(s.fee_balance)}</div>
                    <div class="ob-row-prog"><div class="ob-row-fill" style="width:${pct}%;background:${fill}"></div></div>
                  </div>
                  <div class="ob-td" style="color:var(--t2);font-size:12.5px">${parentDisp}</div>
                  <div class="ob-td">
                    <div class="ob-row-actions">
                      <button type="button" class="ob-rbtn ob-rbtn-pay" data-nav="/dashboard/accountant/payments">💳 Pay</button>
                      <div class="ob-notify-wrap">
                        <button type="button" class="ob-rbtn ob-rbtn-notify ob-notify-trigger"
                          data-phone="${escapeHtml(phone)}"
                          data-parent-id="${pid}"
                          data-student="${escapeHtml(s.name)}">💬 Notify</button>
                        <div class="ob-notify-popup">
                          <div class="ob-notify-popup-title">Send reminder via</div>
                          <button type="button" class="ob-notify-opt ob-opt-wa"><div class="ob-notify-opt-ic wa">📲</div><div><div class="ob-notify-opt-label">WhatsApp</div><div class="ob-notify-opt-sub">Opens WhatsApp chat</div></div></button>
                          <button type="button" class="ob-notify-opt ob-opt-sms"><div class="ob-notify-opt-ic sms">💬</div><div><div class="ob-notify-opt-label">SMS</div><div class="ob-notify-opt-sub">Send text message</div></div></button>
                          <button type="button" class="ob-notify-opt ob-opt-inapp"><div class="ob-notify-opt-ic inapp">🔔</div><div><div class="ob-notify-opt-label">In-App Message</div><div class="ob-notify-opt-sub">Portal notification</div></div></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>`;
          })
          .join('');
      }
    }

    const pageBtns = root.querySelector('#ob-page-btns');
    if (pageBtns) {
      if (totalPages <= 1) {
        pageBtns.innerHTML = '';
      } else {
        const pages: string[] = [];
        pages.push(`<button type="button" class="ob-pbtn" ${safePage === 1 ? 'disabled' : ''} data-page="prev">‹</button>`);
        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) {
            pages.push(`<button type="button" class="ob-pbtn ${i === safePage ? 'active' : ''}" data-page="${i}">${i}</button>`);
          } else if (Math.abs(i - safePage) === 2) {
            pages.push(`<span class="ob-pbtn" style="pointer-events:none;border:none;background:transparent">…</span>`);
          }
        }
        pages.push(`<button type="button" class="ob-pbtn" ${safePage === totalPages ? 'disabled' : ''} data-page="next">›</button>`);
        pageBtns.innerHTML = pages.join('');
      }
    }

    const bulkBar = root.querySelector('#ob-bulk-bar') as HTMLElement | null;
    const countEl = root.querySelector('#ob-selected-count') as HTMLElement | null;
    if (bulkBar) bulkBar.classList.toggle('visible', selectedIds.size > 0);
    if (countEl) countEl.textContent = `${selectedIds.size} selected`;
  }, [
    allRows,
    filteredSorted,
    safePage,
    startIdx,
    endIdx,
    totalPages,
    isPending,
    classFilter,
    classOptions,
    termFilter,
    schoolTerms,
    sortLabel,
    selectedIds,
    clearedCountTotal,
    outstandingData,
    effectivePageSize,
    pageSize,
    searchQuery,
  ]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !htmlContent) return;
    if (lastInjectedHtmlRef.current !== htmlContent) {
      el.innerHTML = htmlContent;
      lastInjectedHtmlRef.current = htmlContent;
    }
    requestAnimationFrame(() => renderTable());
  }, [htmlContent, renderTable]);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  /**
   * Document capture listeners: some environments swallow bubbling on nested inputs.
   * Scoped to this page container so we do not affect other routes.
   */
  useEffect(() => {
    const scopeOk = (e: Event) => {
      const root = containerRef.current;
      const t = e.target;
      return Boolean(root && t instanceof Node && root.contains(t));
    };

    const onInputCap = (e: Event) => {
      if (!scopeOk(e)) return;
      const t = e.target as HTMLElement;
      if (t.id === 'ob-search') setSearchQuery((t as HTMLInputElement).value);
    };

    const onChangeCap = (e: Event) => {
      if (!scopeOk(e)) return;
      const root = containerRef.current;
      if (!root) return;
      const tgt = e.target as HTMLInputElement;
      if (tgt.id === 'ob-term-filter') setTermFilter(tgt.value);
      else if (tgt.id === 'ob-class-filter') setClassFilter(tgt.value);
      else if (tgt.id === 'ob-status-filter') setStatusFilter(tgt.value);
      else if (tgt.id === 'ob-sort-select' && tgt.value) setSortLabel(tgt.value as SortLabel);
      else if (tgt.id === 'ob-page-size') {
        const v = tgt.value;
        setPageSize(v === 'all' ? 'all' : Number(v));
      } else if (tgt.id === 'ob-check-all') {
        const checked = !!tgt.checked;
        const ids = new Set<string>();
        if (checked) {
          root.querySelectorAll('.ob-row-check').forEach((c) => {
            const sid = (c as HTMLInputElement).dataset.studentId;
            if (sid) ids.add(sid);
          });
        }
        setSelectedIds(ids);
        root.querySelectorAll('.ob-row-check').forEach((cb) => {
          (cb as HTMLInputElement).checked = checked;
        });
      } else if (tgt.classList.contains('ob-row-check')) {
        const id = tgt.dataset.studentId || '';
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (tgt.checked) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    };

    const onClickCap = (e: MouseEvent) => {
      if (!scopeOk(e)) return;
      const root = containerRef.current;
      if (!root) return;
      const tgt = e.target as HTMLElement;
      if (tgt.closest('#ob-search-clear')) {
        e.preventDefault();
        const inp = root.querySelector('#ob-search') as HTMLInputElement | null;
        if (inp) inp.value = '';
        setSearchQuery('');
        return;
      }
      if (tgt.closest('#ob-btn-pdf')) {
        e.preventDefault();
        handleDownloadPdf();
        return;
      }
      if (tgt.closest('#ob-btn-record')) {
        e.preventDefault();
        navigateRef.current('/dashboard/accountant/payments');
        return;
      }
      if (tgt.closest('#ob-bulk-clear')) {
        e.preventDefault();
        setSelectedIds(new Set());
        root.querySelectorAll('.ob-row-check').forEach((cb) => ((cb as HTMLInputElement).checked = false));
        const checkAll = root.querySelector('#ob-check-all') as HTMLInputElement | null;
        if (checkAll) checkAll.checked = false;
        return;
      }
      const pageBtn = tgt.closest('[data-page]') as HTMLButtonElement | null;
      if (pageBtn && !pageBtn.disabled) {
        e.preventDefault();
        const p = pageBtn.dataset.page;
        const tp = paginationRef.current.totalPages;
        if (p === 'prev') setPage((x) => Math.max(1, x - 1));
        else if (p === 'next') setPage((x) => Math.min(tp, x + 1));
        else if (p) setPage(Number(p));
        return;
      }
      const nav = tgt.closest('[data-nav]');
      if (nav) {
        e.preventDefault();
        const href = nav.getAttribute('data-nav');
        if (href) navigateRef.current(href);
      }
    };

    document.addEventListener('input', onInputCap, true);
    document.addEventListener('change', onChangeCap, true);
    document.addEventListener('click', onClickCap, true);
    return () => {
      document.removeEventListener('input', onInputCap, true);
      document.removeEventListener('change', onChangeCap, true);
      document.removeEventListener('click', onClickCap, true);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () =>
      document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  if (user?.id && isPending && !outstandingData) {
    return (
      <div style={{ padding: '26px 28px' }}>
        <SkeletonKPIStrip count={4} />
        <SkeletonTable rows={8} cols={8} />
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ width: '100%', minHeight: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', minHeight: '100vh', display: 'block' }} />
    </div>
  );
}
