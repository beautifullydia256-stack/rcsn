import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { SkeletonKPIStrip, SkeletonTable } from '@/components/PwezaSkeleton';
import NativeModal from '@/components/NativeModal';
import { AddTeacherForm } from './AddTeacherForm';
import {
  addParentSchoolQueryKey,
  addParentSchoolStaleOptions,
  fetchAddParentSchoolContext,
} from '@/pages/admin/parents/addParentSchoolQuery';
import { getOfflineTeachers } from '@/lib/offlineDb';

import teachersTemplateRaw from '@/assets/pwezacore-teachers-page.html?raw';

const PAGE_SIZE = 12;

const TEACHERS_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

const TEACHERS_MOTION_KILL = `
.pw-teachers .tch-fu,
.pw-teachers .tch-d1,
.pw-teachers .tch-d2,
.pw-teachers .tch-d3,
.pw-teachers .tch-d4 {
  animation: none !important;
  animation-delay: 0 !important;
  opacity: 1 !important;
  transform: none !important;
}
.pw-teachers .tch-kpi:hover,
.pw-teachers .tch-card:hover {
  transform: none !important;
}
.pw-teachers .tch-kpi,
.pw-teachers .tch-card {
  transition: border-color 0.2s, box-shadow 0.2s;
}
.pw-teachers .tch-view-toggle { display: none !important; }
.pw-teachers #tch-list-view { display: none !important; }
.pw-teachers #tch-grid-view { display: block !important; }
`;

const GRADIENTS = [
  'linear-gradient(135deg,#ffb547,#ff4f6a)',
  'linear-gradient(135deg,#3d7eff,#9d7eff)',
  'linear-gradient(135deg,#27e09f,#3d7eff)',
  'linear-gradient(135deg,#9d7eff,#ff4f6a)',
  'linear-gradient(135deg,#ff4f6a,#ffb547)',
  'linear-gradient(135deg,#00e5c3,#3d7eff)',
  'linear-gradient(135deg,#ffb547,#9d7eff)',
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

function normEmail(e: string | null | undefined): string {
  return String(e || '')
    .trim()
    .toLowerCase();
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-UG', { month: 'short', year: 'numeric' });
}

export type TeacherDirectoryRow = {
  teacher_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  employee_id: string | null;
  date_of_hire: string | null;
  created_at: string | null;
  classes: string[];
  portal_active: boolean;
};

export type TeachersStats = {
  totalTeachers: number;
  classesCovered: number;
  withPortal: number;
  hiredThisYear: number;
};

const SORT_LABELS = ['Name A → Z', 'Name Z → A', 'Most Recent Hire', 'Oldest Hire'] as const;
type SortLabel = (typeof SORT_LABELS)[number];

export async function fetchTeachersDirectory(userId: string): Promise<{ rows: TeacherDirectoryRow[]; stats: TeachersStats }> {
  // Offline: serve from IndexedDB cache instantly
  if (!navigator.onLine) {
    const storedSchoolId = useAuthStore.getState().schoolId;
    if (storedSchoolId) {
      const cached = await getOfflineTeachers(storedSchoolId);
      const rows: TeacherDirectoryRow[] = cached.map((t) => ({
        teacher_id: t.teacher_id,
        name: t.name,
        phone: t.phone,
        email: t.email,
        employee_id: t.employee_id,
        date_of_hire: null,
        created_at: null,
        classes: [],
        portal_active: false,
      }));
      return {
        rows,
        stats: { totalTeachers: rows.length, classesCovered: 0, withPortal: 0, hiredThisYear: 0 },
      };
    }
  }

  const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  const schoolId = userData?.school_id as string | undefined;
  if (!schoolId) {
    return {
      rows: [],
      stats: { totalTeachers: 0, classesCovered: 0, withPortal: 0, hiredThisYear: 0 },
    };
  }

  const y = new Date().getFullYear().toString();

  const [{ data: teacherRows }, { data: ctRows }, { data: tcsRows }, { data: portalUsers }] = await Promise.all([
    supabase
      .from('teachers')
      .select('teacher_id, name, phone, email, employee_id, date_of_hire, created_at')
      .eq('school_id', schoolId)
      .order('name'),
    supabase.from('class_teachers').select('class_name, teacher_id').eq('school_id', schoolId),
    supabase.from('teacher_class_subjects').select('teacher_id, class_name, subject').eq('school_id', schoolId),
    supabase.from('users').select('email, is_active').eq('school_id', schoolId).eq('role', 'teacher'),
  ]);

  const portalEmails = new Set(
    (portalUsers || [])
      .filter((u) => (u as { is_active?: boolean }).is_active !== false)
      .map((u) => normEmail((u as { email?: string }).email))
  );

  const classesByTeacher: Record<string, Set<string>> = {};
  const addClass = (tid: string, c: string) => {
    const t = c?.trim();
    if (!t) return;
    if (!classesByTeacher[tid]) classesByTeacher[tid] = new Set();
    classesByTeacher[tid].add(t);
  };

  for (const r of ctRows || []) {
    const row = r as { teacher_id?: string; class_name?: string };
    if (row.teacher_id && row.class_name) addClass(row.teacher_id, row.class_name);
  }
  for (const r of tcsRows || []) {
    const row = r as { teacher_id?: string; class_name?: string };
    if (row.teacher_id && row.class_name) addClass(row.teacher_id, row.class_name);
  }

  const coveredClasses = new Set<string>();
  for (const r of ctRows || []) {
    const cn = (r as { class_name?: string }).class_name;
    if (cn?.trim()) coveredClasses.add(cn.trim());
  }
  for (const r of tcsRows || []) {
    const cn = (r as { class_name?: string }).class_name;
    if (cn?.trim()) coveredClasses.add(cn.trim());
  }

  const rows: TeacherDirectoryRow[] = (teacherRows || []).map((raw) => {
    const t = raw as {
      teacher_id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      employee_id?: string | null;
      date_of_hire?: string | null;
      created_at?: string | null;
    };

    const tid = t.teacher_id;

    const cls = classesByTeacher[tid] ? [...classesByTeacher[tid]].sort() : [];

    return {
      teacher_id: tid,
      name: t.name || '—',
      phone: t.phone ?? null,
      email: t.email ?? null,
      employee_id: t.employee_id ?? null,
      date_of_hire: t.date_of_hire ?? null,
      created_at: t.created_at ?? null,
      classes: cls,
      portal_active: !!(t.email && portalEmails.has(normEmail(t.email))),
    };
  });

  const hiredThisYear = rows.filter((r) => r.date_of_hire && String(r.date_of_hire).startsWith(y)).length;
  const withPortal = rows.filter((r) => r.portal_active).length;

  return {
    rows,
    stats: {
      totalTeachers: rows.length,
      classesCovered: coveredClasses.size,
      withPortal,
      hiredThisYear,
    },
  };
}

export default function DesignTeachersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  /** Warm cache for Add Parent when navigating from teachers (same pattern as students/parents pages). */
  useQuery({
    queryKey: addParentSchoolQueryKey(user?.id ?? ''),
    queryFn: () => fetchAddParentSchoolContext(user!.id),
    enabled: !!user?.id,
    ...addParentSchoolStaleOptions,
  });

  const addTeacherModalOpen = searchParams.get('add') === '1';

  const closeAddTeacherModal = () => {
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
  const [sortLabel, setSortLabel] = useState<SortLabel>('Name A → Z');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const id = 'pweza-teachers-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = TEACHERS_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    setHtmlContent(parseInjectedHtml(teachersTemplateRaw));
  }, []);

  const { data, isPending } = useQuery({
    queryKey: adminQueryKeys.teachersDesign(user?.id ?? ''),
    queryFn: () => fetchTeachersDirectory(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const allRows = data?.rows ?? [];
  const stats = data?.stats;

  /** If React ever dropped imperative KPI updates, derive from rows so counts never show 0 with a non-empty table. */
  const effectiveStats = useMemo((): TeachersStats | null => {
    if (stats) return stats;
    if (!allRows.length) return null;
    const y = new Date().getFullYear().toString();
    const covered = new Set<string>();
    allRows.forEach((r) => {
      r.classes.forEach((c) => {
        const t = String(c || '').trim();
        if (t) covered.add(t);
      });
    });
    const withPortal = allRows.filter((r) => r.portal_active).length;
    const hiredThisYear = allRows.filter((r) => r.date_of_hire && String(r.date_of_hire).startsWith(y)).length;
    return {
      totalTeachers: allRows.length,
      classesCovered: covered.size,
      withPortal,
      hiredThisYear,
    };
  }, [stats, allRows]);

  const filteredSorted = useMemo(() => {
    let out = [...allRows];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.email || '').toLowerCase().includes(q) ||
          t.classes.some((c) => c.toLowerCase().includes(q))
      );
    }

    out.sort((a, b) => {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      const ha = a.date_of_hire ? new Date(a.date_of_hire).getTime() : 0;
      const hb = b.date_of_hire ? new Date(b.date_of_hire).getTime() : 0;
      switch (sortLabel) {
        case 'Name Z → A':
          return bn.localeCompare(an);
        case 'Most Recent Hire':
          return hb - ha || an.localeCompare(bn);
        case 'Oldest Hire':
          return ha - hb || an.localeCompare(bn);
        default:
          return an.localeCompare(bn);
      }
    });
    return out;
  }, [allRows, searchQuery, sortLabel]);

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
    const root = el.querySelector('.pw-teachers') || el;
    const start = (safePage - 1) * PAGE_SIZE;
    const pageSlice = filteredSorted.slice(start, start + PAGE_SIZE);

    const setKpi = (sel: string, val: string) => {
      const n = root.querySelector(sel);
      if (n) n.textContent = val;
    };
    const initialLoad = !data && allRows.length === 0 && isPending;
    const k = effectiveStats;
    const kpiVals = {
      total: initialLoad ? '—' : String(k?.totalTeachers ?? allRows.length),
      classes: initialLoad ? '—' : String(k?.classesCovered ?? 0),
      portal: initialLoad ? '—' : String(k?.withPortal ?? 0),
      hired: initialLoad ? '—' : String(k?.hiredThisYear ?? 0),
    };
    setKpi('[data-kpi="total-teachers"]', kpiVals.total);
    setKpi('[data-kpi="classes-covered"]', kpiVals.classes);
    setKpi('[data-kpi="with-portal"]', kpiVals.portal);
    setKpi('[data-kpi="hired-this-year"]', kpiVals.hired);

    const sortSel = root.querySelector('#tch-sort-select') as HTMLSelectElement | null;
    if (sortSel) sortSel.value = sortLabel;

    const info = root.querySelector('#tch-page-info');
    if (info) {
      info.innerHTML =
        filteredSorted.length === 0
          ? 'Showing <strong>0</strong> of <strong>0</strong> teachers'
          : `Showing <strong>${startIdx}</strong>–<strong>${endIdx}</strong> of <strong>${filteredSorted.length}</strong> teachers`;
    }

    const cardGrid = root.querySelector('#tch-card-grid');
    if (cardGrid) {
      if (pageSlice.length === 0) {
        cardGrid.innerHTML = initialLoad
          ? `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--t2);font-size:13px">Loading teachers…</div>`
          : `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--t3);font-size:13px">No teachers found.</div>`;
      } else {
      cardGrid.innerHTML = pageSlice
        .map((t, i) => {
          const ini = initials(t.name);
          const bg = grad(start + i);
          const phone = String(t.phone ?? '').trim();
          const email = String(t.email ?? '').trim();
          return `
          <div class="tch-card" data-nav="/dashboard/admin/teachers/${escapeHtml(t.teacher_id)}" style="cursor:pointer">
            <div class="tch-card-top">
              <div class="tch-card-av" style="background:${bg}">${escapeHtml(ini)}</div>
              <div class="tch-card-name">${escapeHtml(t.name)}</div>
              <div class="tch-card-sub">ID: ${escapeHtml(t.employee_id || '—')} · Hired ${fmtShort(t.date_of_hire)}</div>
            </div>
            <div class="tch-card-body">
              <div class="tch-card-row"><span class="tch-card-lbl">Phone</span><span class="tch-card-val">${
                phone
                  ? `<a href="tel:${phone.replace(/\s/g, '')}" onclick="event.stopPropagation()">${escapeHtml(phone)}</a>`
                  : '<span style="color:var(--t3);font-style:italic">—</span>'
              }</span></div>
              <div class="tch-card-row"><span class="tch-card-lbl">Email</span><span class="tch-card-val" style="font-size:12px;color:var(--blue)">${
                email ? escapeHtml(email) : '<span style="color:var(--t3);font-style:italic">—</span>'
              }</span></div>
              <div class="tch-card-row"><span class="tch-card-lbl">Portal</span><span class="tch-chip ${t.portal_active ? 'green' : 'rose'}" style="font-size:11px;padding:2px 8px">${
                t.portal_active ? '✓ Active' : '✗ None'
              }</span></div>
            </div>
            ${
              t.classes.length > 0
                ? `<div class="tch-card-classes">${t.classes.map((c) => `<span class="tch-stag">${escapeHtml(c)}</span>`).join('')}</div>`
                : ''
            }
            <div class="tch-card-foot">
              <button type="button" class="tch-crd-btn tch-crd-ghost" onclick="event.stopPropagation()">📅 Schedule</button>
              <button type="button" class="tch-crd-btn tch-crd-amber" data-nav="/dashboard/admin/teachers/${escapeHtml(
                t.teacher_id
              )}">View Profile →</button>
            </div>
          </div>`;
        })
        .join('');
      }
    }

    const pageBtns = root.querySelector('#tch-page-btns');
    if (pageBtns) {
      if (totalPages <= 1) {
        pageBtns.innerHTML = '';
      } else {
        const pages: string[] = [];
        pages.push(`<button type="button" class="tch-pbtn" ${safePage === 1 ? 'disabled' : ''} data-page="prev">‹</button>`);
        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) {
            pages.push(`<button type="button" class="tch-pbtn ${i === safePage ? 'active' : ''}" data-page="${i}">${i}</button>`);
          } else if (Math.abs(i - safePage) === 2) {
            pages.push(`<span class="tch-pbtn" style="pointer-events:none;border:none;background:transparent">…</span>`);
          }
        }
        pages.push(`<button type="button" class="tch-pbtn" ${safePage === totalPages ? 'disabled' : ''} data-page="next">›</button>`);
        pageBtns.innerHTML = pages.join('');
      }
    }

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
    sortLabel,
  ]);

  // Inject template once per htmlContent string — React must NOT re-apply dangerouslySetInnerHTML on every
  // state change or KPI/table updates are wiped (same fix as admin design dashboard).
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

    const searchEl = root.querySelector('#tch-search') as HTMLInputElement | null;
    const sortEl = root.querySelector('#tch-sort-select') as HTMLSelectElement | null;

    const onSearch = () => {
      if (searchEl) setSearchQuery(searchEl.value);
      setPage(1);
    };
    const onSort = () => {
      if (sortEl && SORT_LABELS.includes(sortEl.value as SortLabel)) setSortLabel(sortEl.value as SortLabel);
      setPage(1);
    };

    searchEl?.addEventListener('input', onSearch);
    sortEl?.addEventListener('change', onSort);

    const onPageClick = (e: Event) => {
      const btn = (e.target as HTMLElement | null)?.closest('[data-page]') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      const p = btn.dataset.page;
      if (p === 'prev') setPage((x) => Math.max(1, x - 1));
      else if (p === 'next') setPage((x) => Math.min(totalPages, x + 1));
      else if (p) setPage(Number(p));
    };
    const pageBtnsEl = root.querySelector('#tch-page-btns');
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
    const onAddParent = () => navigate('/dashboard/admin/parents?add=1');
    root.querySelector('#tch-btn-add')?.addEventListener('click', onAdd);
    root.querySelector('#tch-btn-add-student')?.addEventListener('click', onAddStudent);
    root.querySelector('#tch-btn-add-parent')?.addEventListener('click', onAddParent);

    return () => {
      root.removeEventListener('click', onNav);
      searchEl?.removeEventListener('input', onSearch);
      sortEl?.removeEventListener('change', onSort);
      pageBtnsEl?.removeEventListener('click', onPageClick);
      root.querySelector('#tch-btn-add')?.removeEventListener('click', onAdd);
      root.querySelector('#tch-btn-add-student')?.removeEventListener('click', onAddStudent);
      root.querySelector('#tch-btn-add-parent')?.removeEventListener('click', onAddParent);
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

  if (user?.id && isPending && !data) {
    return (
      <div style={{ padding: '26px 28px' }}>
        <SkeletonKPIStrip count={4} />
        <SkeletonTable rows={6} cols={7} />
      </div>
    );
  }

  return (
    <>
      <style>{TEACHERS_MOTION_KILL}</style>
      <div ref={containerRef} style={{ width: '100%', minHeight: '100vh', display: 'block' }} />
      <NativeModal
        isOpen={addTeacherModalOpen}
        onClose={closeAddTeacherModal}
        title="Add teacher"
        size="lg"
      >
        <AddTeacherForm
          mode="modal"
          onCompleted={() => {
            closeAddTeacherModal();
            if (user?.id) {
              void queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachersDesign(user.id) });
            }
          }}
          onCancel={closeAddTeacherModal}
        />
      </NativeModal>
    </>
  );
}
