import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { loadOutstandingBalanceAggByStudent } from '@/lib/adminFinanceTerm';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { SkeletonKPIStrip, SkeletonTable } from '@/components/PwezaSkeleton';

import outstandingTemplateRaw from '@/assets/pwezacore-outstanding.html?raw';

const PAGE_SIZE = 15;
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

const GRADIENTS = [
  'linear-gradient(135deg,#ff4f6a,#9d7eff)',
  'linear-gradient(135deg,#3d7eff,#9d7eff)',
  'linear-gradient(135deg,#ffb547,#ff4f6a)',
  'linear-gradient(135deg,#9d7eff,#3d7eff)',
  'linear-gradient(135deg,#27e09f,#3d7eff)',
  'linear-gradient(135deg,#ff4f6a,#ffb547)',
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
  if (pctPaid === 0) return 'var(--rose)';
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

export async function fetchOutstandingData(userId: string): Promise<FetchOutstandingResult> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return { rows: [], clearedCount: 0 };
  const schoolId = data.school_id as string;

  const balanceByStudent = await loadOutstandingBalanceAggByStudent(supabase, schoolId);

  const [studsRes, parentsRes] = await Promise.all([
    supabase
      .from('students')
      .select('student_id,name,current_class,status')
      .eq('school_id', schoolId)
      .eq('status', 'active'),
    supabase.from('parents').select('student_id,name,email,phone,parent_id').eq('school_id', schoolId),
  ]);

  const studs = studsRes.data || [];
  const parents = parentsRes.data || [];
  const parentByStudent = new Map<string, { name?: string; email?: string; phone?: string; parent_id?: string }>();
  for (const p of parents) {
    const row = p as { student_id?: string; name?: string; email?: string; phone?: string; parent_id?: string };
    if (row.student_id) parentByStudent.set(row.student_id, row);
  }

  const rows: OutstandingRow[] = (studs || []).map((s: Record<string, unknown>) => {
    const sid = s.student_id as string;
    const parent = parentByStudent.get(sid);
    const agg = balanceByStudent.get(sid);
    const expected = Number(agg?.total_fees ?? 0);
    const paid = Number(agg?.total_paid ?? 0);
    const balance = Number(agg?.balance ?? 0);
    const pct = expected > 0 ? Math.round((paid / expected) * 100) : 0;
    return {
      student_id: sid,
      name: String(s.name ?? '—'),
      current_class: String(s.current_class ?? '—'),
      amount_paid: paid,
      fee_balance: balance,
      fee_total: expected,
      pct_paid: pct,
      parent_name: parent?.name ?? null,
      parent_email: parent?.email ?? null,
      parent_phone: parent?.phone ?? null,
      parent_id: parent?.parent_id ?? null,
    };
  });

  let clearedCount = 0;
  for (const s of studs || []) {
    const sid = (s as { student_id: string }).student_id;
    const bal = balanceByStudent.get(sid)?.balance ?? 0;
    if (bal <= 0) clearedCount += 1;
  }

  return {
    rows: rows.filter((r) => r.fee_balance > 0),
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
  const containerRef = useRef<HTMLDivElement>(null);
  const lastInjectedHtmlRef = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortLabel, setSortLabel] = useState<SortLabel>('Highest Balance First');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    queryKey: adminQueryKeys.financeOutstanding(user?.id ?? ''),
    queryFn: () => fetchOutstandingData(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
  const allRows = outstandingData?.rows ?? [];
  const clearedCountTotal = outstandingData?.clearedCount ?? 0;

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
    result.sort((a, b) => {
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

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, classFilter, statusFilter, sortLabel]);

  const startIdx = filteredSorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filteredSorted.length);

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

  const renderTable = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const root = el.querySelector('.pw-outstanding') || el;
    const loading = !outstandingData && isPending;
    const start = (safePage - 1) * PAGE_SIZE;
    const pageData = filteredSorted.slice(start, start + PAGE_SIZE);
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
            const stCls = statusClass(pct);
            const statusLbl = pct === 0 ? '0% paid' : `${pct}% paid`;
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
                  )}" style="width:16px;height:16px;accent-color:var(--rose)"></div>
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
                  <div class="ob-td"><span class="ob-status ${stCls}">${statusLbl}</span></div>
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
    sortLabel,
    selectedIds,
    clearedCountTotal,
    outstandingData,
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

  useEffect(() => {
    if (!htmlContent || !containerRef.current) return;
    const root = containerRef.current;

    const onNav = (e: Event) => {
      const t = (e.target as HTMLElement | null)?.closest('[data-nav]');
      if (!t) return;
      e.preventDefault();
      const href = t.getAttribute('data-nav');
      if (href) navigate(href);
    };
    root.addEventListener('click', onNav);

    const searchEl = root.querySelector('#ob-search') as HTMLInputElement | null;
    const classEl = root.querySelector('#ob-class-filter') as HTMLSelectElement | null;
    const statusEl = root.querySelector('#ob-status-filter') as HTMLSelectElement | null;
    const sortEl = root.querySelector('#ob-sort-select') as HTMLSelectElement | null;

    const onSearch = () => searchEl && setSearchQuery(searchEl.value);
    const onClass = () => classEl && setClassFilter(classEl.value);
    const onStatus = () => statusEl && setStatusFilter(statusEl.value);
    const onSort = () => {
      if (sortEl && sortEl.value) setSortLabel(sortEl.value as SortLabel);
    };

    searchEl?.addEventListener('input', onSearch);
    classEl?.addEventListener('change', onClass);
    statusEl?.addEventListener('change', onStatus);
    sortEl?.addEventListener('change', onSort);

    const onPageClick = (e: Event) => {
      const btn = (e.target as HTMLElement | null)?.closest('[data-page]') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      const p = btn.dataset.page;
      if (p === 'prev') setPage((x) => Math.max(1, x - 1));
      else if (p === 'next') setPage((x) => Math.min(totalPages, x + 1));
      else if (p) setPage(Number(p));
    };
    root.querySelector('#ob-page-btns')?.addEventListener('click', onPageClick);

    root.querySelector('#ob-btn-record')?.addEventListener('click', () => navigate('/dashboard/accountant/payments'));

    const onCheckChange = (e: Event) => {
      const tgt = e.target as HTMLInputElement;
      if (!tgt.classList.contains('ob-row-check')) return;
      const id = tgt.dataset.studentId || '';
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (tgt.checked) next.add(id);
        else next.delete(id);
        return next;
      });
    };
    root.addEventListener('change', onCheckChange);

    const checkAll = root.querySelector('#ob-check-all') as HTMLInputElement | null;
    const onCheckAll = () => {
      const checked = !!checkAll?.checked;
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
    };
    checkAll?.addEventListener('change', onCheckAll);

    root.querySelector('#ob-bulk-clear')?.addEventListener('click', () => {
      setSelectedIds(new Set());
      root.querySelectorAll('.ob-row-check').forEach((cb) => ((cb as HTMLInputElement).checked = false));
      if (checkAll) checkAll.checked = false;
    });

    return () => {
      root.removeEventListener('click', onNav);
      searchEl?.removeEventListener('input', onSearch);
      classEl?.removeEventListener('change', onClass);
      statusEl?.removeEventListener('change', onStatus);
      sortEl?.removeEventListener('change', onSort);
      root.querySelector('#ob-page-btns')?.removeEventListener('click', onPageClick);
      root.removeEventListener('change', onCheckChange);
      checkAll?.removeEventListener('change', onCheckAll);
    };
  }, [htmlContent, navigate, totalPages]);

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
