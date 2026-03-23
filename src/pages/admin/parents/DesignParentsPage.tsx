import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePwezaStore } from '@/store/pwezaStore';
import { SkeletonKPIStrip, SkeletonTable } from '@/components/PwezaSkeleton';

import parentsTemplateRaw from '@/assets/pwezacore-parents-page.html?raw';

const PAGE_SIZE = 12;
const STALE_MS = 5 * 60 * 1000;
/** Avoid losing directory data after idle; prevents KPI/table flashing to placeholders */
const PARENTS_GC_MS = 1000 * 60 * 60 * 24;

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
    });
  }

  for (const u of parentUsers || []) {
    const uid = u.user_id as string;
    if (linkedParentIds.has(uid)) continue;
    rows.push({
      parent_id: uid,
      name: pickStr(u.name) || pickStr(u.email) || 'Parent',
      email: pickStr(u.email),
      phone: pickStr(u.phone),
      relationship: null,
      occupation: null,
      nin: null,
      students: [],
      portal_active: (u as { is_active?: boolean }).is_active !== false,
      has_linked_students: false,
      has_parent_user: true,
      created_at: pickStr(u.created_at),
    });
  }

  const totalParents = (parentUsers || []).length;
  const linkedParents = linkedParentIds.size;
  const unlinkedParents = (parentUsers || []).filter((u) => !linkedParentIds.has(u.user_id as string)).length;
  const portalParents = (parentUsers || []).filter((u) => (u as { is_active?: boolean }).is_active !== false).length;

  return {
    rows,
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
  const user = useAuthStore((s) => s.user);
  const prefetchDone = usePwezaStore((s) => s.prefetchDone); // pweza speed system
  const parentsDirectory = usePwezaStore((s) => s.parentsDirectory); // pweza speed system
  const hasStoreData = prefetchDone && !!parentsDirectory; // pweza speed system
  const containerRef = useRef<HTMLDivElement>(null);
  const lastInjectedHtmlRef = useRef<string | null>(null);
  const [htmlContent, setHtmlContent] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

  const { data: queryData, isPending } = useQuery({
    queryKey: ['admin', 'parents-design', user?.id ?? ''],
    queryFn: () => fetchParentsDirectory(user!.id),
    enabled: !!user?.id && !hasStoreData,
    staleTime: STALE_MS,
    gcTime: PARENTS_GC_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const data = hasStoreData ? parentsDirectory! : queryData;

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
  }, [allRows, searchQuery, statusFilter, sortKey]);

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
    const initialLoad =
      !data && allRows.length === 0 && (isPending || (!prefetchDone && !hasStoreData));
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

    const info = root.querySelector('#par-page-info');
    if (info) {
      info.innerHTML =
        filteredSorted.length === 0
          ? 'Showing <strong>0</strong> of <strong>0</strong> parents'
          : `Showing <strong>${startIdx}</strong>–<strong>${endIdx}</strong> of <strong>${filteredSorted.length}</strong> parents`;
    }

    const tbody = root.querySelector('#par-table-body');
    if (tbody) {
      if (pageSlice.length === 0) {
        tbody.innerHTML = initialLoad
          ? `<div style="padding:40px;text-align:center;color:var(--t2);font-size:13px">Loading parents…</div>`
          : `<div style="padding:40px;text-align:center;color:var(--t3);font-size:13px">No parents found.</div>`;
      } else {
        tbody.innerHTML = pageSlice
          .map((p, i) => {
            const ini = initials(p.name);
            const bg = grad(start + i);
            const portalChip = p.portal_active
              ? `<span class="par-chip green">✓ Active</span>`
              : `<span class="par-chip rose">✗ None</span>`;
            const rel = (p.relationship || '').toLowerCase();
            const relChip = p.relationship
              ? `<span class="par-chip ${rel === 'mother' ? 'teal' : 'violet'}">${escapeHtml(p.relationship)}</span>`
              : `<span class="par-chip muted">—</span>`;
            const studentTags =
              p.students.length === 0
                ? `<span style="color:var(--t3);font-style:italic;font-size:12px">Not linked</span>`
                : p.students
                    .map(
                      (s) =>
                        `<span class="par-stag" data-nav="/dashboard/admin/students/${escapeHtml(s.student_id)}">${escapeHtml(s.displayName)}</span>`
                    )
                    .join('');
            const phone = String(p.phone ?? '').trim();
            const email = String(p.email ?? '').trim();
            const ninLine = p.nin ? `NIN: ${escapeHtml(p.nin)}` : 'NIN not recorded';
            return `
              <div class="par-trow" data-nav="/dashboard/admin/parents/${escapeHtml(p.parent_id)}" style="cursor:pointer">
                <div class="par-td">
                  <div class="par-cell">
                    <div class="par-av" style="background:${bg}">${escapeHtml(ini)}</div>
                    <div>
                      <div class="par-name">${escapeHtml(p.name)}</div>
                      <div class="par-rel">${ninLine}</div>
                    </div>
                  </div>
                </div>
                <div class="par-td"><div class="par-student-tags">${studentTags}</div></div>
                <div class="par-td">${relChip}</div>
                <div class="par-td">
                  <div class="par-contact-row">
                    ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}" class="par-contact-link phone" onclick="event.stopPropagation()">📞 ${escapeHtml(phone)}</a>` : '<span style="color:var(--t3);font-size:12px;font-style:italic">No phone</span>'}
                    ${email ? `<a href="mailto:${escapeHtml(email)}" class="par-contact-link email" onclick="event.stopPropagation()">✉ ${escapeHtml(email)}</a>` : '<span style="color:var(--t3);font-size:12px;font-style:italic">No email</span>'}
                  </div>
                </div>
                <div class="par-td" style="color:var(--t2)">${p.occupation ? escapeHtml(p.occupation) : '<span style="color:var(--t3);font-style:italic">—</span>'}</div>
                <div class="par-td">${portalChip}</div>
                <div class="par-td">
                  <div class="par-row-actions">
                    <div class="par-rbtn" data-msg="1" title="Message" onclick="event.stopPropagation()">💬</div>
                    <div class="par-rbtn" data-nav="/dashboard/admin/parents/${escapeHtml(p.parent_id)}" title="View profile" onclick="event.stopPropagation()">👁</div>
                    <div class="par-rbtn arrow" data-nav="/dashboard/admin/parents/${escapeHtml(p.parent_id)}" title="Open profile" onclick="event.stopPropagation()">›</div>
                  </div>
                </div>
              </div>`;
          })
          .join('');
      }
    }

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
            ? `<span class="par-chip green" style="font-size:11px;padding:2px 8px">✓ Active</span>`
            : `<span class="par-chip rose" style="font-size:11px;padding:2px 8px">✗ None</span>`;
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
                      `<span class="par-stag" data-nav="/dashboard/admin/students/${escapeHtml(s.student_id)}">👧 ${escapeHtml(s.displayName)} · ${escapeHtml(s.current_class)}</span>`
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
              </div>
              ${kids}
              <div class="par-pcard-foot">
                <button type="button" class="par-crd-btn par-crd-ghost" onclick="event.stopPropagation()">💬 Message</button>
                <button type="button" class="par-crd-btn par-crd-primary" data-nav="/dashboard/admin/parents/${escapeHtml(p.parent_id)}" onclick="event.stopPropagation()">View Profile →</button>
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

    const listView = root.querySelector('#par-list-view') as HTMLElement | null;
    const gridView = root.querySelector('#par-grid-view') as HTMLElement | null;
    if (listView && gridView) {
      listView.style.display = viewMode === 'list' ? '' : 'none';
      gridView.style.display = viewMode === 'grid' ? '' : 'none';
    }
    const listBtn = root.querySelector('#par-list-btn');
    const gridBtn = root.querySelector('#par-grid-btn');
    listBtn?.classList.toggle('active', viewMode === 'list');
    gridBtn?.classList.toggle('active', viewMode === 'grid');

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
    viewMode,
    sortKey,
    prefetchDone,
    hasStoreData,
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
      if (statusEl) setStatusFilter(statusEl.value);
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

    const onList = () => {
      setViewMode('list');
    };
    const onGrid = () => {
      setViewMode('grid');
    };
    root.querySelector('#par-list-btn')?.addEventListener('click', onList);
    root.querySelector('#par-grid-btn')?.addEventListener('click', onGrid);

    const onAdd = () => navigate('/dashboard/admin/parents/add');
    const onInvite = () => window.alert('Bulk portal invite will be available in a future update.');
    root.querySelector('#par-btn-add')?.addEventListener('click', onAdd);
    root.querySelector('#par-btn-invite')?.addEventListener('click', onInvite);

    return () => {
      root.removeEventListener('click', onNav);
      searchEl?.removeEventListener('input', onSearch);
      statusEl?.removeEventListener('change', onStatus);
      sortEl?.removeEventListener('change', onSort);
      pageBtnsEl?.removeEventListener('click', onPageClick);
      root.querySelector('#par-list-btn')?.removeEventListener('click', onList);
      root.querySelector('#par-grid-btn')?.removeEventListener('click', onGrid);
      root.querySelector('#par-btn-add')?.removeEventListener('click', onAdd);
      root.querySelector('#par-btn-invite')?.removeEventListener('click', onInvite);
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

  if (user?.id && !prefetchDone && !data) {
    return (
      <div style={{ padding: '26px 28px' }}>
        <SkeletonKPIStrip count={4} />
        <SkeletonTable rows={6} cols={7} />
      </div>
    );
  }

  return (
    <>
      <style>{PARENTS_MOTION_KILL}</style>
      <div ref={containerRef} style={{ width: '100%', minHeight: '100vh', display: 'block' }} />
    </>
  );
}
