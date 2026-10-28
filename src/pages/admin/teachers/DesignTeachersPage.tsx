import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import NativeModal from '@/components/NativeModal';
import { AddTeacherForm } from './AddTeacherForm';
import {
  addParentSchoolQueryKey,
  addParentSchoolStaleOptions,
  fetchAddParentSchoolContext,
} from '@/pages/admin/parents/addParentSchoolQuery';
import { getOfflineTeachers } from '@/lib/offlineDb';
import { downloadTeacherListPdf } from '@/lib/adminPdfDownload';
import { useSchoolType } from '@/hooks/useSchoolType';
import {
  User,
  Search,
  Plus,
  RefreshCw,
  Download,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
} from 'lucide-react';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

const PAGE_SIZE = 12;

function initials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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

export async function fetchTeachersDirectory(userId: string): Promise<{ rows: TeacherDirectoryRow[]; stats: TeachersStats; schoolName: string | null }> {
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
        schoolName: null,
      };
    }
  }

  const storedSchoolId = useAuthStore.getState().schoolId || (useAuthStore.getState().user as any)?.school_id;
  let schoolId = storedSchoolId;
  if (!schoolId) {
    try {
      const { data: userData } = await supabase.from('users').select('school_id').eq('user_id', userId).maybeSingle();
      schoolId = userData?.school_id as string | undefined;
    } catch {
      // fallback
    }
  }
  if (!schoolId) {
    return {
      rows: [],
      stats: { totalTeachers: 0, classesCovered: 0, withPortal: 0, hiredThisYear: 0 },
      schoolName: null,
    };
  }

  const y = new Date().getFullYear().toString();

  const [schoolRes, teachersRes, ctRes, tcsRes, portalRes] = await Promise.allSettled([
    supabase.from('schools').select('name').eq('school_id', schoolId).maybeSingle(),
    supabase
      .from('teachers')
      .select('teacher_id, name, phone, email, employee_id, date_of_hire, created_at')
      .eq('school_id', schoolId)
      .order('name'),
    supabase.from('class_teachers').select('class_name, teacher_id').eq('school_id', schoolId),
    supabase.from('teacher_class_subjects').select('teacher_id, class_name, subject').eq('school_id', schoolId),
    supabase.from('users').select('email, is_active').eq('school_id', schoolId).eq('role', 'teacher'),
  ]);

  const schoolRow = schoolRes.status === 'fulfilled' ? schoolRes.value.data : null;
  const teacherRows = teachersRes.status === 'fulfilled' ? teachersRes.value.data : null;
  const ctRows = ctRes.status === 'fulfilled' ? ctRes.value.data : null;
  const tcsRows = tcsRes.status === 'fulfilled' ? tcsRes.value.data : null;
  const portalUsers = portalRes.status === 'fulfilled' ? portalRes.value.data : null;

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

  (ctRows || []).forEach((r) => {
    if (r.teacher_id && r.class_name) addClass(r.teacher_id, r.class_name);
  });
  (tcsRows || []).forEach((r) => {
    if (r.teacher_id && r.class_name) addClass(r.teacher_id, r.class_name);
  });

  const allCoveredClasses = new Set<string>();
  Object.values(classesByTeacher).forEach((set) => {
    set.forEach((c) => allCoveredClasses.add(c));
  });

  let withPortal = 0;
  let hiredThisYear = 0;

  const rows: TeacherDirectoryRow[] = (teacherRows || []).map((t) => {
    const em = normEmail(t.email);
    const hasPortal = em ? portalEmails.has(em) : false;
    if (hasPortal) withPortal += 1;
    const doh = t.date_of_hire || t.created_at;
    if (doh && String(doh).startsWith(y)) hiredThisYear += 1;

    const classList = Array.from(classesByTeacher[t.teacher_id] || []).sort();

    return {
      teacher_id: t.teacher_id,
      name: t.name || 'Unnamed Faculty',
      phone: t.phone || null,
      email: t.email || null,
      employee_id: t.employee_id || null,
      date_of_hire: t.date_of_hire || null,
      created_at: t.created_at || null,
      classes: classList,
      portal_active: hasPortal,
    };
  });

  return {
    rows,
    stats: {
      totalTeachers: rows.length,
      classesCovered: allCoveredClasses.size,
      withPortal,
      hiredThisYear,
    },
    schoolName: schoolRow?.name ?? null,
  };
}

export default function DesignTeachersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isTertiary } = useSchoolType();

  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortLabel>('Name A → Z');
  const [filterClass, setFilterClass] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: adminQueryKeys.teachersDesign(user?.id ?? ''),
    queryFn: () => (user?.id ? fetchTeachersDirectory(user.id) : null),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
  });

  const { data: schoolCtx } = useQuery({
    queryKey: addParentSchoolQueryKey(user?.id ?? ''),
    queryFn: () => fetchAddParentSchoolContext(user?.id ?? ''),
    enabled: !!user?.id,
    ...addParentSchoolStaleOptions,
  });

  const rows = data?.rows ?? [];
  const stats = data?.stats ?? { totalTeachers: 0, classesCovered: 0, withPortal: 0, hiredThisYear: 0 };
  const schoolName = data?.schoolName ?? 'Rakai Community School of Nursing';

  // Distinct classes for filter
  const allClasses = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.classes.forEach((c) => s.add(c)));
    return Array.from(s).sort();
  }, [rows]);

  // Filter & Sort
  const filteredRows = useMemo(() => {
    let list = rows;
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          (r.employee_id && r.employee_id.toLowerCase().includes(needle)) ||
          (r.phone && r.phone.includes(needle)) ||
          (r.email && r.email.toLowerCase().includes(needle))
      );
    }
    if (filterClass !== 'ALL') {
      list = list.filter((r) => r.classes.includes(filterClass));
    }

    const sorted = [...list];
    if (sort === 'Name A → Z') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'Name Z → A') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === 'Most Recent Hire') {
      sorted.sort((a, b) => (b.date_of_hire || '').localeCompare(a.date_of_hire || ''));
    } else if (sort === 'Oldest Hire') {
      sorted.sort((a, b) => (a.date_of_hire || '9999').localeCompare(b.date_of_hire || '9999'));
    }
    return sorted;
  }, [rows, q, filterClass, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageSlice = filteredRows.slice(startIdx, startIdx + PAGE_SIZE);

  const handleExportPdf = () => {
    downloadTeacherListPdf(
      filteredRows,
      schoolName ?? undefined,
      {
        title: isTertiary ? 'Tutors & Clinical Instructors Directory' : 'Teachers Directory',
        singular: isTertiary ? 'tutor' : 'teacher',
        plural: isTertiary ? 'tutors' : 'teachers',
        classesHeader: isTertiary ? 'Assigned Cohorts' : 'Classes',
      }
    );
  };

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            {isTertiary ? 'TUTORS & CLINICAL INSTRUCTORS REGISTRY' : 'TEACHERS & FACULTY REGISTRY'}
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            ACCREDITED FACULTY, CLINICAL PRECEPTORS &amp; COURSE ALLOCATIONS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={rows.length === 0}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT ROSTER PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isTertiary ? 'APPOINT TUTOR' : 'ADD TEACHER'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL FACULTY
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.totalTeachers.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ACTIVE {isTertiary ? 'INSTRUCTORS' : 'STAFF'}
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            COHORTS COVERED
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {stats.classesCovered.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            STREAMS ALLOCATED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            PORTAL ACCESS
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.withPortal.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ACTIVE SYSTEM LOGINS
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            HIRED THIS YEAR
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {stats.hiredThisYear.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            NEW APPOINTMENTS
          </div>
        </div>
      </div>

      {/* ── 3. CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#888888]" />
            <input
              type="text"
              placeholder={`Search ${isTertiary ? 'tutor' : 'teacher'} by name, ID, phone…`}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="gov-input pl-8 text-xs font-mono w-full"
            />
          </div>

          {/* Cohort / Class Filter */}
          <div>
            <select
              value={filterClass}
              onChange={(e) => {
                setFilterClass(e.target.value);
                setPage(1);
              }}
              className="gov-select text-xs font-mono"
            >
              <option value="ALL">ALL ASSIGNED COHORTS</option>
              {allClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortLabel)}
              className="gov-select text-xs font-mono"
            >
              {SORT_LABELS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono text-[#555555]">
            RECORDS: <span className="font-bold text-[#111111]">{filteredRows.length}</span>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex border border-[#CCCCCC]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors ${
                viewMode === 'table' ? 'bg-[#111111] text-white' : 'bg-white text-[#555555] hover:bg-[#F3F4F6]'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${
                viewMode === 'grid' ? 'bg-[#111111] text-white' : 'bg-white text-[#555555] hover:bg-[#F3F4F6]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. DATA PRESENTATION ── */}
      {viewMode === 'table' ? (
        <div className="gov-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="gov-table w-full text-left">
              <thead>
                <tr>
                  <th>FACULTY / INSTRUCTOR NAME</th>
                  <th>EMPLOYEE ID</th>
                  <th>PHONE CONTACT</th>
                  <th>OFFICIAL EMAIL</th>
                  <th>ASSIGNED COHORTS / UNITS</th>
                  <th>DATE OF HIRE</th>
                  <th>PORTAL STATUS</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <GovTableLoader colSpan={8} message="AUDITING FACULTY & CLINICAL INSTRUCTOR ROSTER..." />
                ) : pageSlice.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-xs font-mono text-[#777777]">
                      NO FACULTY RECORDS MATCHED THE SPECIFIED SEARCH CRITERIA
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((t) => (
                    <tr
                      key={t.teacher_id}
                      onClick={() => navigate(`/dashboard/admin/teachers/${t.teacher_id}`)}
                      className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    >
                      <td className="font-bold text-xs text-[#111111]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-none bg-[#111111] text-white flex items-center justify-center text-[10px] font-mono font-bold">
                            {initials(t.name)}
                          </div>
                          <span>{t.name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {t.employee_id || '—'}
                      </td>
                      <td className="font-mono text-xs text-[#333333]">
                        {t.phone ? (
                          <a
                            href={`tel:${t.phone.replace(/\s/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-[#777777]" />
                            {t.phone}
                          </a>
                        ) : (
                          <span className="text-[#888888]">—</span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-[#333333]">
                        {t.email ? (
                          <a
                            href={`mailto:${t.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline flex items-center gap-1 text-blue-700"
                          >
                            <Mail className="w-3 h-3 text-[#777777]" />
                            {t.email}
                          </a>
                        ) : (
                          <span className="text-[#888888]">—</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {t.classes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.classes.map((c) => (
                              <span
                                key={c}
                                className="font-mono text-[10px] px-1.5 py-0.5 border border-[#CCCCCC] bg-[#F8F9FA] text-[#111111]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#888888] font-mono text-[11px] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {fmtDate(t.date_of_hire)}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border ${
                            t.portal_active
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                              : 'border-zinc-300 bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${t.portal_active ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                          {t.portal_active ? 'ACTIVE' : 'NO PORTAL'}
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/admin/teachers/${t.teacher_id}`)}
                          className="gov-btn gov-btn-sm"
                        >
                          PROFILE
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pageSlice.map((t) => (
            <div
              key={t.teacher_id}
              onClick={() => navigate(`/dashboard/admin/teachers/${t.teacher_id}`)}
              className="gov-card p-4 hover:border-[#111111] transition-all cursor-pointer bg-white border border-[#CCCCCC] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-none bg-[#111111] text-white flex items-center justify-center text-xs font-mono font-bold">
                      {initials(t.name)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#111111]">{t.name}</h4>
                      <div className="text-[10px] font-mono text-[#777777]">ID: {t.employee_id || '—'}</div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase border ${
                      t.portal_active
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                        : 'border-zinc-300 bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {t.portal_active ? 'PORTAL ACTIVE' : 'NO PORTAL'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-[#555555]">
                    <span>PHONE:</span>
                    <span className="text-[#111111] font-semibold">{t.phone || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#555555]">
                    <span>EMAIL:</span>
                    <span className="text-blue-700 font-semibold truncate max-w-[170px]">{t.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#555555]">
                    <span>APPOINTED:</span>
                    <span className="text-[#111111]">{fmtDate(t.date_of_hire)}</span>
                  </div>
                </div>

                {t.classes.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#E5E7EB]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#777777] mb-1">
                      Allocated Cohorts:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.classes.map((c) => (
                        <span key={c} className="font-mono text-[9px] px-1 py-0.5 border border-[#CCCCCC] bg-[#F8F9FA] text-[#111111]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex justify-end" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/admin/teachers/${t.teacher_id}`)}
                  className="gov-btn gov-btn-sm w-full"
                >
                  VIEW PROFILE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 5. PAGINATION ── */}
      {totalPages > 1 && (
        <div className="gov-card p-3 flex items-center justify-between text-xs font-mono bg-white border border-[#CCCCCC]">
          <div className="text-[#555555]">
            PAGE {safePage} OF {totalPages} · SHOWING {startIdx + 1} TO {Math.min(startIdx + PAGE_SIZE, filteredRows.length)} OF {filteredRows.length} RECORDS
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="gov-btn gov-btn-sm"
            >
              PREVIOUS
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="gov-btn gov-btn-sm"
            >
              NEXT
            </button>
          </div>
        </div>
      )}

      {/* ── 6. ADD TEACHER MODAL ── */}
      {isAddModalOpen && (
        <NativeModal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          title={isTertiary ? 'APPOINT TUTOR / CLINICAL INSTRUCTOR' : 'ADD TEACHER / FACULTY MEMBER'}
          subtitle="Register credentials, contact details, and department allocations."
          icon={User}
          size="lg"
        >
          <AddTeacherForm
            mode="modal"
            isTertiary={isTertiary}
            onCompleted={() => {
              setIsAddModalOpen(false);
              void queryClient.invalidateQueries({ queryKey: adminQueryKeys.teachersDesign(user?.id ?? '') });
            }}
            onCancel={() => setIsAddModalOpen(false)}
          />
        </NativeModal>
      )}
    </div>
  );
}
