import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { loadOutstandingBalanceAggByStudentAllTerms } from '@/lib/adminFinanceTerm';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { SkeletonKPIStrip, SkeletonTable } from '@/components/PwezaSkeleton';
import NativeModal from '@/components/NativeModal';
import { AddParentForm } from './AddParentForm';
import {
  addParentSchoolQueryKey,
  addParentSchoolStaleOptions,
  fetchAddParentSchoolContext,
} from './addParentSchoolQuery';

import parentsTemplateRaw from '@/assets/pwezacore-parents-page.html?raw';

const PAGE_SIZE = 12;

const SIDEBAR_FILTER_LABELS: Record<string, string> = {
  all: 'All parents',
  outstanding: 'Parents with outstanding balances',
  missing_contact: 'Parents with missing contact information',
};

function fmtUGXParents(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `UGX ${Math.round(n).toLocaleString()}`;
}

function parentMissingContact(email: string | null | undefined, phone: string | null | undefined): boolean {
  const e = String(email || '').trim();
  const p = String(phone || '').trim();
  return !e || !p;
}

const PARENTS_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

const PARENTS_MOTION_KILL = `
.pw-parents .par-fu,
.pw-parents .par-d1,
.pw-parents .par-d2,
.pw-parents .par-d3,
.pw-parents .par-d4 {
  animation: none !important;
  animation-delay: 0 !important;
  opacity: 1 !important;
  transform: none !important;
}
.pw-parents .par-kpi:hover,
.pw-parents .par-pcard:hover {
  transform: none !important;
}
.pw-parents .par-kpi,
.pw-parents .par-pcard {
  transition: border-color 0.2s, box-shadow 0.2s;
}
`;

const GRADIENTS = [
  'linear-gradient(135deg,#ffb547,#ff4f6a)',
  'linear-gradient(135deg,#3d7eff,#9d7eff)',
  'linear-gradient(135deg,#27e09f,#3d7eff)',
  'linear-gradient(135deg,#9d7eff,#ff4f6a)',
  'linear-gradient(135deg,#ff4f6a,#ffb547)',
  'linear-gradient(135deg,#00e5c3,#9d7eff)',
  'linear-gradient(135deg,#9d7eff,#00e5c3)',
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

function pickStr(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function displayStudentName(s: Record<string, unknown>): string {
  const fn = String(s.first_name ?? '').trim();
  const mn = String(s.middle_name ?? '').trim();
  const ln = String(s.last_name ?? '').trim();
  const parts = [fn, mn, ln].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(s.name ?? '').trim() || '—';
}

export type ParentDirectoryRow = {
  parent_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  occupation: string | null;
  nin: string | null;
  students: { student_id: string; displayName: string; current_class: string }[];
  portal_active: boolean;
  has_linked_students: boolean;
  has_parent_user: boolean;
  created_at: string | null;
  childCount: number;
  totalOutstanding: number;
  hasOutstanding: boolean;
  missingContact: boolean;
};

export type ParentsStats = {
  totalParents: number;
  linkedParents: number;
  portalParents: number;
  unlinkedParents: number;
};

type SortKey = 'name-asc' | 'name-desc' | 'children' | 'recent';

export async function fetchParentsDirectory(userId: string): Promise<{ rows: ParentDirectoryRow[]; stats: ParentsStats }> {
  const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  const schoolId = userData?.school_id as string | undefined;
  if (!schoolId) return { rows: [], stats: { totalParents: 0, linkedParents: 0, portalParents: 0, unlinkedParents: 0 } };

  const [{ data: parentRows }, { data: parentUsers }] = await Promise.all([
    supabase.from('parents').select('*').eq('school_id', schoolId),
    supabase.from('users').select('user_id, name, email, phone, is_active, created_at').eq('school_id', schoolId).eq('role', 'parent'),
  ]);

  const byUser = new Map((parentUsers || []).map((u) => [u.user_id as string, u as Record<string, unknown>]));
  const linkedParentIds = new Set<string>();
  for (const r of parentRows || []) {
    const pid = (r as { parent_id?: string }).parent_id;
    if (pid) linkedParentIds.add(pid);
  }

  const studentIds = [...new Set((parentRows || []).map((r) => (r as { student_id?: string }).student_id).filter(Boolean))] as string[];
  const studentMap: Record<string, Record<string, unknown>> = {};
  if (studentIds.length) {
    const { data: studs } = await supabase
      .from('students')
      .select('student_id, name, first_name, middle_name, last_name, current_class')
      .eq('school_id', schoolId)
      .in('student_id', studentIds);
    for (const st of studs || []) {
      studentMap[String((st as { student_id: string }).student_id)] = st as Record<string, unknown>;
    }
  }

  const groups = new Map<string, Record<string, unknown>[]>();
  for (const r of parentRows || []) {
    const row = r as Record<string, unknown>;
    const pid = row.parent_id as string | undefined;
    if (!pid) continue;
    if (!groups.has(pid)) groups.set(pid, []);
    groups.get(pid)!.push(row);
  }

  const rows: ParentDirectoryRow[] = [];

  for (const [pid, prow] of groups) {
    const u = byUser.get(pid);
    const first = prow[0];
    const sidSet = new Set<string>();
    for (const x of prow) {
      const sid = x.student_id as string | undefined;
      if (sid) sidSet.add(sid);
    }
    const students = [...sidSet].map((sid) => {
      const st = studentMap[sid];
      return {
        student_id: sid,
        displayName: st ? displayStudentName(st) : '—',
        current_class: st ? String(st.current_class ?? '—') : '—',
      };
    });
    students.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const primary = prow.find((x) => x.is_primary_contact === true) || first;
    const name =
      pickStr(primary?.name) ||
      pickStr(u?.name) ||
      (students.length ? 'Guardian' : 'Parent');
    const email = pickStr(primary?.email) ?? pickStr(u?.email);
    const phone = pickStr(primary?.phone) ?? pickStr(u?.phone);
    const relationship = pickStr(primary?.relationship);
    const occupation = pickStr(primary?.occupation);
    const nin =
      pickStr(primary?.nin) ?? pickStr(primary?.national_id) ?? pickStr(primary?.national_identification_number);

    rows.push({
      parent_id: pid,
      name,
      email,
      phone,
      relationship,
      occupation,
      nin,
      students,
      portal_active: u ? (u.is_active as boolean | undefined) !== false : false,
      has_linked_students: students.length > 0,
      has_parent_user: !!u,
      created_at: (pickStr(primary?.created_at) ?? pickStr(u?.created_at)) || null,
      childCount: students.length,
      totalOutstanding: 0,
      hasOutstanding: false,
      missingContact: parentMissingContact(email, phone),
    });
  }

  for (const u of parentUsers || []) {
    const uid = u.user_id as string;
    if (linkedParentIds.has(uid)) continue;
    const ue = pickStr(u.email);
    const up = pickStr(u.phone);
    rows.push({
      parent_id: uid,
      name: pickStr(u.name) || pickStr(u.email) || 'Parent',
      email: ue,
      phone: up,
      relationship: null,
      occupation: null,
      nin: null,
      students: [],
      portal_active: (u as { is_active?: boolean }).is_active !== false,
      has_linked_students: false,
      has_parent_user: true,
      created_at: pickStr(u.created_at),
      childCount: 0,
      totalOutstanding: 0,
      hasOutstanding: false,
      missingContact: parentMissingContact(ue, up),
    });
  }

  const balanceByStudent = await loadOutstandingBalanceAggByStudentAllTerms(supabase, schoolId);
  const enrichedRows: ParentDirectoryRow[] = rows.map((r) => {
    let totalOutstanding = 0;
    let hasOutstanding = false;
    for (const st of r.students) {
      const bal = Number(balanceByStudent.get(st.student_id)?.balance ?? 0);
      if (bal > 0.005) hasOutstanding = true;
      totalOutstanding += Math.max(0, bal);
    }
    return {
      ...r,
      childCount: r.students.length,
      totalOutstanding,
      hasOutstanding,
      missingContact: parentMissingContact(r.email, r.phone),
    };
  });

  const totalParents = (parentUsers || []).length;
  const linkedParents = linkedParentIds.size;
  const unlinkedParents = (parentUsers || []).filter((u) => !linkedParentIds.has(u.user_id as string)).length;
  const portalParents = (parentUsers || []).filter((u) => (u as { is_active?: boolean }).is_active !== false).length;

  return {
    rows: enrichedRows,
    stats: {
      totalParents,
      linkedParents,
      portalParents,
      unlinkedParents,
    },
  };
}

export default function DesignParentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const theme = useUIStore((s) => s.theme);
  const user = useAuthStore((s) => s.user);

  /** Same query key as AddParentForm — runs as soon as this page mounts so the modal hits a warm cache. */
  useQuery({
    queryKey: addParentSchoolQueryKey(user?.id ?? ''),
    queryFn: () => fetchAddParentSchoolContext(user!.id),
    enabled: !!user?.id,
    ...addParentSchoolStaleOptions,
  });

  const addParentModalOpen = searchParams.get('add') === '1';
  const sidebarFilter = (searchParams.get('filter') || 'all').toLowerCase();

  const closeAddParentModal = () => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('add');
        return p;
      },
      { replace: true }
    );
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const lastInjectedHtmlRef = useRef<string | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    if (sidebarFilter === 'outstanding' || sidebarFilter === 'missing_contact') {
      return sidebarFilter;
    }
    return '';
  });
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      return (localStorage.getItem('pwezacore-parents-view') as 'list' | 'grid') || 'list';
    } catch {
      return 'list';
    }
  });
  useEffect(() => {
    const id = 'pweza-parents-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = PARENTS_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    setHtmlContent(parseInjectedHtml(parentsTemplateRaw));
  }, []);

  const { data, isPending } = useQuery({
    queryKey: adminQueryKeys.parentsDesign(user?.id ?? ''),
    queryFn: () => fetchParentsDirectory(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const allRows = data?.rows ?? [];
  const stats = data?.stats;

  /** If React ever dropped imperative KPI updates, derive from rows so counts stay consistent with the table. */
  const effectiveStats = useMemo((): ParentsStats | null => {
    if (stats) return stats;
    if (!allRows.length) return null;
    return {
      totalParents: allRows.length,
      linkedParents: allRows.filter((r) => r.has_linked_students).length,
      portalParents: allRows.filter((r) => r.portal_active).length,
      unlinkedParents: allRows.filter((r) => !r.has_linked_students).length,
    };
  }, [stats, allRows]);

  const filteredSorted = useMemo(() => {
    let out = [...allRows];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      out = out.filter((p) => {
        const childMatch = p.students.some((s) => s.displayName.toLowerCase().includes(q));
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.phone || '').includes(searchQuery.trim()) ||
          childMatch
        );
      });
    }
    if (statusFilter === 'linked') out = out.filter((p) => p.has_linked_students);
    if (statusFilter === 'unlinked') out = out.filter((p) => !p.has_linked_students);
    if (statusFilter === 'portal') out = out.filter((p) => p.portal_active);
    if (statusFilter === 'no-portal') out = out.filter((p) => p.has_parent_user && !p.portal_active);
    if (statusFilter === 'outstanding') out = out.filter((p) => p.hasOutstanding);
    if (statusFilter === 'missing_contact') out = out.filter((p) => p.missingContact);

    if (sidebarFilter === 'outstanding' && !statusFilter) out = out.filter((p) => p.hasOutstanding);
    if (sidebarFilter === 'missing_contact' && !statusFilter) out = out.filter((p) => p.missingContact);

    out.sort((a, b) => {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      switch (sortKey) {
        case 'name-desc':
          return bn.localeCompare(an);
        case 'children':
          return b.students.length - a.students.length || an.localeCompare(bn);
        case 'recent': {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }
        default:
          return an.localeCompare(bn);
      }
    });
    return out;
  }, [allRows, searchQuery, statusFilter, sortKey, sidebarFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const startIdx = filteredSorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filteredSorted.length);

  const renderTableAndGrid = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const root = el.querySelector('.pw-parents') || el;
    const start = (safePage - 1) * PAGE_SIZE;
    const pageSlice = filteredSorted.slice(start, start + PAGE_SIZE);

    const setKpi = (sel: string, val: string) => {
      const n = root.querySelector(sel);
      if (n) n.textContent = val;
    };
    const initialLoad = !data && allRows.length === 0 && isPending;
    const k = effectiveStats;
    const kpiVals = {
      total: initialLoad ? '—' : String(k?.totalParents ?? allRows.length),
      linked: initialLoad ? '—' : String(k?.linkedParents ?? 0),
      portal: initialLoad ? '—' : String(k?.portalParents ?? 0),
      unlinked: initialLoad ? '—' : String(k?.unlinkedParents ?? 0),
    };
    setKpi('[data-kpi="total-parents"]', kpiVals.total);
    setKpi('[data-kpi="linked-parents"]', kpiVals.linked);
    setKpi('[data-kpi="portal-parents"]', kpiVals.portal);
    setKpi('[data-kpi="unlinked-parents"]', kpiVals.unlinked);

    const filterBannerEl = root.querySelector('#par-filter-banner') as HTMLElement | null;
    if (filterBannerEl) {
      const activeFilter = statusFilter || (sidebarFilter !== 'all' ? sidebarFilter : '');
      if (activeFilter === 'outstanding') {
        filterBannerEl.style.display = 'block';
        filterBannerEl.textContent = 'Showing: Parents with outstanding balances';
      } else if (activeFilter === 'missing_contact') {
        filterBannerEl.style.display = 'block';
        filterBannerEl.textContent = 'Showing: Parents with missing contact information';
      } else if (activeFilter === 'linked') {
        filterBannerEl.style.display = 'block';
        filterBannerEl.textContent = 'Showing: Parents with linked students';
      } else if (activeFilter === 'unlinked') {
        filterBannerEl.style.display = 'block';
        filterBannerEl.textContent = 'Showing: Unlinked parents (no student assigned)';
      } else if (activeFilter === 'portal') {
        filterBannerEl.style.display = 'block';
        filterBannerEl.textContent = 'Showing: Parents with active portal access';
      } else if (activeFilter === 'no-portal') {
        filterBannerEl.style.display = 'block';
        filterBannerEl.textContent = 'Showing: Parents without active portal access';
      } else {
        filterBannerEl.style.display = 'none';
      }
    }

    const info = root.querySelector('#par-page-info');
    if (info) {
      info.innerHTML =
        filteredSorted.length === 0
          ? 'Showing <strong>0</strong> of <strong>0</strong> parents'
          : `Showing <strong>${startIdx}</strong>–<strong>${endIdx}</strong> of <strong>${filteredSorted.length}</strong> parents`;
    }

    // Manage List (Table) vs Grid view display
    const listView = root.querySelector('#par-list-view') as HTMLElement | null;
    const gridView = root.querySelector('#par-grid-view') as HTMLElement | null;
    const listBtn = root.querySelector('#par-list-btn') as HTMLElement | null;
    const gridBtn = root.querySelector('#par-grid-btn') as HTMLElement | null;

    if (listView && gridView) {
      if (viewMode === 'list') {
        listView.style.display = 'block';
        gridView.style.display = 'none';
        listBtn?.classList.add('active');
        gridBtn?.classList.remove('active');
      } else {
        listView.style.display = 'none';
        gridView.style.display = 'block';
        listBtn?.classList.remove('active');
        gridBtn?.classList.add('active');
      }
    }

    // Populate Table View
    const tableBody = root.querySelector('#par-table-body');
    if (tableBody) {
      if (pageSlice.length === 0) {
        tableBody.innerHTML = initialLoad
          ? `<div style="padding:40px;text-align:center;color:var(--t2);font-size:13px">Loading parents…</div>`
          : `<div style="padding:40px;text-align:center;color:var(--t3);font-size:13px">No parents found.</div>`;
      } else {
        tableBody.innerHTML = pageSlice
          .map((p, i) => {
            const ini = initials(p.name);
            const bg = grad(start + i);
            const rel = (p.relationship || 'Guardian').toLowerCase();
            const phone = String(p.phone ?? '').trim();
            const email = String(p.email ?? '').trim();
            return `
            <div class="par-trow" data-nav="/dashboard/admin/parents/${escapeHtml(p.parent_id)}" style="cursor:pointer">
              <div class="par-td">
                <div class="par-cell">
                  <div class="par-av" style="background:${bg}">${escapeHtml(ini)}</div>
                  <div>
                    <div class="par-name">${escapeHtml(p.name)}</div>
                    <div class="par-sub" style="font-size:11.5px;color:var(--t3)">${escapeHtml(p.relationship || 'Guardian')}</div>
                  </div>
                </div>
              </div>
              <div class="par-td">
                ${
                  p.students.length > 0
                    ? p.students
                        .map(
                          (s) =>
                            `<span class="par-stag" data-nav="/dashboard/admin/students/${escapeHtml(
                              s.student_id
                            )}" onclick="event.stopPropagation()">${escapeHtml(s.displayName)} (${escapeHtml(
                              s.current_class
                            )})</span>`
                        )
                        .join('')
                    : '<span class="par-td muted">No child linked</span>'
                }
              </div>
              <div class="par-td">
                <span class="par-chip ${rel === 'mother' ? 'teal' : 'violet'}" style="font-size:11px;padding:2px 8px">${escapeHtml(
                  p.relationship || 'Guardian'
                )}</span>
              </div>
              <div class="par-td">
                <div>${
                  phone
                    ? `<a href="tel:${phone.replace(/\s/g, '')}" onclick="event.stopPropagation()">${escapeHtml(phone)}</a>`
                    : '<span class="par-td muted">—</span>'
                }</div>
                <div style="font-size:11px;color:var(--blue)">${email ? escapeHtml(email) : ''}</div>
              </div>
              <div class="par-td">${p.occupation ? escapeHtml(p.occupation) : '<span class="par-td muted">—</span>'}</div>
              <div class="par-td">
                <span class="par-chip ${p.portal_active ? 'green' : 'rose'}" style="font-size:11px;padding:2px 8px">${
                  p.portal_active ? 'Active' : 'No Portal'
                }</span>
              </div>
              <div class="par-td" style="justify-content:flex-end;display:flex;gap:6px" onclick="event.stopPropagation()">
                <button type="button" class="par-crd-btn par-crd-primary" data-nav="/dashboard/admin/parents/${escapeHtml(
                  p.parent_id
                )}">View Profile</button>
              </div>
            </div>`;
          })
          .join('');
      }
    }

    // Populate Card Grid View
    const cardGrid = root.querySelector('#par-card-grid');
    if (cardGrid) {
      if (pageSlice.length === 0) {
        cardGrid.innerHTML = initialLoad
          ? `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--t2);font-size:13px">Loading parents…</div>`
          : `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--t3);font-size:13px">No parents found.</div>`;
      } else {
        cardGrid.innerHTML = pageSlice
          .map((p, i) => {
            const ini = initials(p.name);
            const bg = grad(start + i);
            const portalDotColor = p.portal_active ? 'var(--green)' : 'var(--t3)';
            const portalChip = p.portal_active
              ? `<span class="par-chip green" style="font-size:11px;padding:2px 8px">Active</span>`
              : `<span class="par-chip rose" style="font-size:11px;padding:2px 8px">No Portal</span>`;
            const rel = (p.relationship || 'Guardian').toLowerCase();
            const cornerChip = p.relationship
              ? `<span class="par-chip ${rel === 'mother' ? 'teal' : 'violet'}" style="font-size:10.5px;padding:2px 8px">${escapeHtml(p.relationship)}</span>`
              : `<span class="par-chip muted" style="font-size:10.5px;padding:2px 8px">—</span>`;
            const kids =
              p.students.length === 0
                ? ''
                : `<div class="par-pcard-kids">${p.students
                    .map(
                      (s) =>
                        `<span class="par-stag" data-nav="/dashboard/admin/students/${escapeHtml(s.student_id)}">${escapeHtml(s.displayName)} · ${escapeHtml(s.current_class)}</span>`
                    )
                    .join('')}</div>`;
            const phone = String(p.phone ?? '').trim();
            const email = String(p.email ?? '').trim();
            return `
              <div class="par-pcard" data-nav="/dashboard/admin/parents/${escapeHtml(p.parent_id)}" style="cursor:pointer">
                <div class="par-pcard-top">
                  <div class="par-pcard-av" style="background:${bg};position:relative">
                    ${escapeHtml(ini)}
                    <div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:${portalDotColor};border:2px solid var(--s2)"></div>
                  </div>
                  <div class="par-pcard-name">${escapeHtml(p.name)}</div>
                  <div class="par-pcard-rel">${escapeHtml(p.relationship || 'Guardian')}</div>
                  <div class="par-pcard-corner">${cornerChip}</div>
                </div>
                <div class="par-pcard-body">
                  <div class="par-pcard-row">
                    <span class="par-pcard-label">Phone</span>
                    <span class="par-pcard-val">${phone ? `<a href="tel:${phone.replace(/\s/g, '')}" onclick="event.stopPropagation()">${escapeHtml(phone)}</a>` : '<span style="color:var(--t3);font-style:italic">—</span>'}</span>
                  </div>
                  <div class="par-pcard-row">
                    <span class="par-pcard-label">Email</span>
                    <span class="par-pcard-val" style="font-size:12px;color:var(--blue)">${email ? escapeHtml(email) : '<span style="color:var(--t3);font-style:italic">—</span>'}</span>
                  </div>
                  <div class="par-pcard-row">
                    <span class="par-pcard-label">Occupation</span>
                    <span class="par-pcard-val">${p.occupation ? escapeHtml(p.occupation) : '<span style="color:var(--t3);font-style:italic">—</span>'}</span>
                  </div>
                  <div class="par-pcard-row">
                    <span class="par-pcard-label">Portal</span>
                    ${portalChip}
                  </div>
                  <div class="par-pcard-row">
                    <span class="par-pcard-label">Children</span>
                    <span class="par-pcard-val">${p.childCount}</span>
                  </div>
                  <div class="par-pcard-row">
                    <span class="par-pcard-label">Total outstanding</span>
                    <span class="par-pcard-val" style="${p.hasOutstanding ? 'color:var(--amber);font-weight:600' : ''}">${escapeHtml(fmtUGXParents(p.totalOutstanding))}</span>
                  </div>
                </div>
                ${kids}
                <div class="par-pcard-foot">
                  <button type="button" class="par-crd-btn par-crd-ghost" onclick="event.stopPropagation()">Message</button>
                  <button type="button" class="par-crd-btn par-crd-primary" data-nav="/dashboard/admin/parents/${escapeHtml(p.parent_id)}">View Profile →</button>
                </div>
              </div>`;
          })
          .join('');
      }
    }

    const pageBtns = root.querySelector('#par-page-btns');
    if (pageBtns) {
      if (totalPages <= 1) {
        pageBtns.innerHTML = '';
      } else {
        const pages: string[] = [];
        pages.push(`<button type="button" class="par-pbtn" ${safePage === 1 ? 'disabled' : ''} data-page="prev">‹</button>`);
        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) {
            pages.push(`<button type="button" class="par-pbtn ${i === safePage ? 'active' : ''}" data-page="${i}">${i}</button>`);
          } else if (Math.abs(i - safePage) === 2) {
            pages.push(`<span class="par-pbtn" style="pointer-events:none;border:none;background:transparent">…</span>`);
          }
        }
        pages.push(`<button type="button" class="par-pbtn" ${safePage === totalPages ? 'disabled' : ''} data-page="next">›</button>`);
        pageBtns.innerHTML = pages.join('');
      }
    }

    const statusSel = root.querySelector('#par-status-filter') as HTMLSelectElement | null;
    if (statusSel) statusSel.value = statusFilter;

    const sortSel = root.querySelector('#par-sort-select') as HTMLSelectElement | null;
    if (sortSel) sortSel.value = sortKey;
  }, [
    data,
    isPending,
    effectiveStats,
    allRows.length,
    filteredSorted,
    safePage,
    startIdx,
    endIdx,
    totalPages,
    statusFilter,
    sortKey,
    sidebarFilter,
    viewMode,
  ]);

  // Inject template once per htmlContent string — React must NOT re-apply dangerouslySetInnerHTML on every
  // state change or KPI/table updates are wiped (same fix as teachers / admin design dashboard).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !htmlContent) return;
    if (lastInjectedHtmlRef.current !== htmlContent) {
      el.innerHTML = htmlContent;
      lastInjectedHtmlRef.current = htmlContent;
    }
    requestAnimationFrame(() => renderTableAndGrid());
  }, [htmlContent, renderTableAndGrid]);

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

    const searchEl = root.querySelector('#par-search') as HTMLInputElement | null;
    const statusEl = root.querySelector('#par-status-filter') as HTMLSelectElement | null;
    const sortEl = root.querySelector('#par-sort-select') as HTMLSelectElement | null;

    const onSearch = () => {
      if (searchEl) setSearchQuery(searchEl.value);
      setPage(1);
    };
    const onStatus = () => {
      if (statusEl) {
        setStatusFilter(statusEl.value);
        if (searchParams.get('filter')) {
          setSearchParams(
            (prev) => {
              const p = new URLSearchParams(prev);
              p.delete('filter');
              return p;
            },
            { replace: true }
          );
        }
      }
      setPage(1);
    };
    const onSort = () => {
      if (sortEl) setSortKey((sortEl.value || 'name-asc') as SortKey);
      setPage(1);
    };

    searchEl?.addEventListener('input', onSearch);
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
    const pageBtnsEl = root.querySelector('#par-page-btns');
    pageBtnsEl?.addEventListener('click', onPageClick);

    const onAdd = () => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('add', '1');
          return p;
        },
        { replace: true }
      );
    };
    const onAddStudent = () => navigate('/dashboard/admin/students?add=1');
    const onAddTeacher = () => navigate('/dashboard/admin/teachers?add=1');
    const onInvite = () => window.alert('Bulk portal invite will be available in a future update.');
    root.querySelector('#par-btn-add')?.addEventListener('click', onAdd);
    root.querySelector('#par-btn-add-student')?.addEventListener('click', onAddStudent);
    root.querySelector('#par-btn-add-teacher')?.addEventListener('click', onAddTeacher);
    root.querySelector('#par-btn-invite')?.addEventListener('click', onInvite);

    const listBtnEl = root.querySelector('#par-list-btn');
    const gridBtnEl = root.querySelector('#par-grid-btn');
    const onListClick = () => {
      setViewMode('list');
      try { localStorage.setItem('pwezacore-parents-view', 'list'); } catch {}
    };
    const onGridClick = () => {
      setViewMode('grid');
      try { localStorage.setItem('pwezacore-parents-view', 'grid'); } catch {}
    };
    listBtnEl?.addEventListener('click', onListClick);
    gridBtnEl?.addEventListener('click', onGridClick);

    return () => {
      root.removeEventListener('click', onNav);
      searchEl?.removeEventListener('input', onSearch);
      statusEl?.removeEventListener('change', onStatus);
      sortEl?.removeEventListener('change', onSort);
      pageBtnsEl?.removeEventListener('click', onPageClick);
      root.querySelector('#par-btn-add')?.removeEventListener('click', onAdd);
      root.querySelector('#par-btn-add-student')?.removeEventListener('click', onAddStudent);
      root.querySelector('#par-btn-add-teacher')?.removeEventListener('click', onAddTeacher);
      root.querySelector('#par-btn-invite')?.removeEventListener('click', onInvite);
      listBtnEl?.removeEventListener('click', onListClick);
      gridBtnEl?.removeEventListener('click', onGridClick);
    };
  }, [htmlContent, navigate, totalPages, setSearchParams]);

  useEffect(() => {
    if (!containerRef.current) return;
    const sync = () =>
      document.documentElement.classList.toggle('light', !document.documentElement.classList.contains('dark'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, [htmlContent]);

  const showSkeleton = Boolean(user?.id && isPending && !data);

  return (
    <>
      <style>{PARENTS_MOTION_KILL}</style>
      {showSkeleton && (
        <div style={{ padding: '26px 28px' }}>
          <SkeletonKPIStrip count={4} />
          <SkeletonTable rows={6} cols={7} />
        </div>
      )}
      <div ref={containerRef} data-theme={theme} style={{ width: '100%', minHeight: showSkeleton ? '0' : '100vh', display: showSkeleton ? 'none' : 'block' }} />
      <NativeModal isOpen={addParentModalOpen} onClose={closeAddParentModal} title="Add parent" size="lg">
        <AddParentForm
          mode="modal"
          onCompleted={() => {
            closeAddParentModal();
            if (user?.id) {
              void queryClient.invalidateQueries({ queryKey: adminQueryKeys.parentsDesign(user.id) });
              void queryClient.invalidateQueries({ queryKey: addParentSchoolQueryKey(user.id) });
            }
          }}
          onCancel={closeAddParentModal}
        />
      </NativeModal>
    </>
  );
}
