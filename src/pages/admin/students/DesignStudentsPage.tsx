import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { displayParentsForStudent, type ParentLite } from '@/lib/studentDisplayParents';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import {
  Search,
  ChevronRight,
  Eye,
  LayoutGrid,
  List,
  Printer,
  Users,
  UserPlus,
  GraduationCap,
  Phone,
  Mail,
  X,
  UserCircle2,
  CheckCircle2,
} from 'lucide-react';

const STALE_MS = 5 * 60 * 1000;
const PAGE_SIZE = 15;

const AVATAR_GRADIENTS = [
  'from-teal-500 to-cyan-600',
  'from-violet-500 to-fuchsia-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
];

function initials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function avatarGradient(i: number) {
  return AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
}

/** Matches Add Student / DB — used for list + quick view */
type StudentListRow = {
  student_id: string;
  name: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  current_class: string | null;
  status?: string | null;
  admission_number?: string | null;
  admission_date?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  religion?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  student_phone?: string | null;
  student_email?: string | null;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  guardian_occupation?: string | null;
  guardian_address?: string | null;
  medical_condition?: string | null;
  stream?: string | null;
  previous_school?: string | null;
  boarding_type?: string | null;
  enrollment_fee?: number | null;
  payment_status?: string | null;
  expected_fee_amount?: number | null;
  fee_discount_percent?: number | null;
  created_at?: string | null;
};

type FetchResult = {
  rows: StudentListRow[];
  parentsByStudent: Record<string, ParentLite[]>;
  classTeacherNameByClass: Record<string, string>;
  attendedTodayCount: number;
  photoByStudentId: Record<string, string>;
};

const STUDENT_LIST_SELECT =
  'student_id, name, first_name, middle_name, last_name, current_class, status, admission_number, admission_date, gender, date_of_birth, nationality, religion, address, city, country, student_phone, student_email, guardian_name, guardian_relationship, guardian_phone, guardian_email, guardian_occupation, guardian_address, medical_condition, stream, previous_school, boarding_type, enrollment_fee, payment_status, expected_fee_amount, fee_discount_percent, created_at';

function dash(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const s = String(v).trim();
  return s || '—';
}

function formatDateMaybe(v: string | null | undefined): string {
  if (!v || !String(v).trim()) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
}

function displayFullName(row: StudentListRow): string {
  const parts = [row.first_name, row.middle_name, row.last_name]
    .filter((x) => x != null && String(x).trim())
    .map((x) => String(x).trim());
  if (parts.length) return parts.join(' ');
  return (row.name || '').trim() || '—';
}

async function fetchStudentsContext(userId: string): Promise<FetchResult> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) {
    return {
      rows: [],
      parentsByStudent: {},
      classTeacherNameByClass: {},
      attendedTodayCount: 0,
      photoByStudentId: {},
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  const [studentsRes, parentsRes, classTeachersRes, attendanceRes, photosRes] = await Promise.all([
    supabase.from('students').select(STUDENT_LIST_SELECT).eq('school_id', u.school_id).order('name'),
    supabase.from('parents').select('student_id, name, email, phone').eq('school_id', u.school_id),
    supabase.from('class_teachers').select('class_name, teacher_id').eq('school_id', u.school_id),
    supabase
      .from('student_attendance')
      .select('student_id')
      .eq('school_id', u.school_id)
      .eq('date', today)
      .eq('present', true),
    supabase
      .from('student_photos')
      .select('student_id, photo_url')
      .eq('school_id', u.school_id)
      .eq('is_primary', true),
  ]);

  const rows = (studentsRes.data || []) as StudentListRow[];
  const photoByStudentId: Record<string, string> = {};
  (photosRes.data || []).forEach((ph: { student_id?: string; photo_url?: string }) => {
    const sid = ph.student_id;
    const url = ph.photo_url;
    if (sid && url && String(url).trim() && !photoByStudentId[sid]) {
      photoByStudentId[sid] = String(url).trim();
    }
  });
  const parentsByStudent: Record<string, ParentLite[]> = {};
  (parentsRes.data || []).forEach((p: { student_id?: string; name?: string; email?: string; phone?: string }) => {
    const sid = p.student_id;
    if (!sid) return;
    if (!parentsByStudent[sid]) parentsByStudent[sid] = [];
    parentsByStudent[sid].push({
      name: p.name || '',
      email: p.email || undefined,
      phone: p.phone || undefined,
    });
  });

  let classTeacherNameByClass: Record<string, string> = {};
  if (!classTeachersRes.error && classTeachersRes.data?.length) {
    const teacherIds = [...new Set(classTeachersRes.data.map((ct: { teacher_id?: string }) => ct.teacher_id).filter(Boolean))];
    const teacherNameMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('teachers')
        .select('teacher_id, name')
        .eq('school_id', u.school_id)
        .in('teacher_id', teacherIds as string[]);
      (teachers || []).forEach((t: { teacher_id: string; name?: string }) => {
        teacherNameMap[t.teacher_id] = t.name || '';
      });
    }
    classTeachersRes.data.forEach((ct: { class_name?: string; teacher_id?: string }) => {
      if (ct.class_name && ct.teacher_id) {
        classTeacherNameByClass[ct.class_name] = teacherNameMap[ct.teacher_id] || '';
      }
    });
  }

  const attendedSet = new Set((attendanceRes.data || []).map((x: { student_id: string }) => x.student_id));

  return {
    rows,
    parentsByStudent,
    classTeacherNameByClass,
    attendedTodayCount: attendedSet.size,
    photoByStudentId,
  };
}

type ExpandState = { studentId: string; kind: 'student' | 'parent'; parentIndex: number } | null;

export default function DesignStudentsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortKey, setSortKey] = useState<'name-asc' | 'name-desc' | 'class-asc' | 'class-desc'>('name-asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [page, setPage] = useState(1);
  const [expand, setExpand] = useState<ExpandState>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students-design', user?.id ?? ''],
    queryFn: () => fetchStudentsContext(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_MS,
  });

  const rows = data?.rows ?? [];
  const parentsByStudent = data?.parentsByStudent ?? {};
  const classTeacherNameByClass = data?.classTeacherNameByClass ?? {};
  const attendedToday = data?.attendedTodayCount ?? 0;
  const photoByStudentId = data?.photoByStudentId ?? {};

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.current_class) set.add(r.current_class);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredSorted = useMemo(() => {
    let out = [...rows];
    const t = q.trim().toLowerCase();
    if (t) {
      out = out.filter((r) => {
        const parents = displayParentsForStudent(r.student_id, r, parentsByStudent);
        return (
          (r.name || '').toLowerCase().includes(t) ||
          (r.current_class || '').toLowerCase().includes(t) ||
          (r.guardian_name || '').toLowerCase().includes(t) ||
          parents.some((p) => (p.name || '').toLowerCase().includes(t))
        );
      });
    }
    if (classFilter) out = out.filter((r) => r.current_class === classFilter);

    out.sort((a, b) => {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      const ac = (a.current_class || '').toLowerCase();
      const bc = (b.current_class || '').toLowerCase();
      switch (sortKey) {
        case 'name-desc':
          return bn.localeCompare(an);
        case 'class-asc':
          return ac.localeCompare(bc) || an.localeCompare(bn);
        case 'class-desc':
          return bc.localeCompare(ac) || an.localeCompare(bn);
        default:
          return an.localeCompare(bn);
      }
    });
    return out;
  }, [rows, q, classFilter, sortKey, parentsByStudent]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, safePage]);

  const stats = useMemo(() => {
    const uniqueClasses = new Set(rows.map((r) => r.current_class).filter(Boolean)).size;
    const withParents = rows.filter(
      (r) => displayParentsForStudent(r.student_id, r, parentsByStudent).length > 0
    ).length;
    return {
      total: rows.length,
      classes: uniqueClasses,
      withParents,
      attendedToday,
    };
  }, [rows, parentsByStudent, attendedToday]);

  const loading = isLoading && !data;

  const openStudentQuick = (studentId: string) => {
    setExpand((prev) =>
      prev?.studentId === studentId && prev.kind === 'student' ? null : { studentId, kind: 'student', parentIndex: 0 }
    );
  };

  const openParentQuick = (studentId: string, parentIndex: number) => {
    setExpand((prev) =>
      prev?.studentId === studentId && prev.kind === 'parent' && prev.parentIndex === parentIndex
        ? null
        : { studentId, kind: 'parent', parentIndex }
    );
  };

  const closeExpand = () => setExpand(null);

  return (
    <AdminPageWrapper
      title="Students"
      subtitle="Manage enrolled students, classes, and parent contacts."
    >
      <div className="space-y-5 print:space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between print:hidden">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--ac-border)] bg-white/5 px-3 py-2 text-sm font-medium ac-text-primary hover:bg-white/10"
            >
              <Printer className="h-4 w-4 opacity-80" />
              Print
            </button>
            <button
              type="button"
              onClick={() => alert('Export is coming soon.')}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--ac-border)] bg-white/5 px-3 py-2 text-sm font-medium ac-text-secondary hover:bg-white/10"
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/parents')}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--ac-border)] bg-white/5 px-3 py-2 text-sm font-medium ac-text-primary hover:bg-white/10"
            >
              <Users className="h-4 w-4 opacity-80" />
              Add family
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/students/add')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              <UserPlus className="h-4 w-4" />
              Add student
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--ac-border)] p-1 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-emerald-600/20 text-emerald-400' : 'ac-text-secondary hover:ac-text-primary'
              }`}
              aria-pressed={viewMode === 'table'}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-emerald-600/20 text-emerald-400' : 'ac-text-secondary hover:ac-text-primary'
              }`}
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total students', value: loading ? '…' : String(stats.total), icon: UserCircle2 },
            { label: 'Classes', value: loading ? '…' : String(stats.classes), icon: GraduationCap },
            { label: 'With parents linked', value: loading ? '…' : String(stats.withParents), icon: Users },
            { label: 'Attended today', value: loading ? '…' : String(stats.attendedToday), icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="ac-glass-card flex items-center gap-3 rounded-xl border border-[var(--ac-border)] p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide ac-text-muted">{label}</p>
                <p className="text-xl font-semibold tabular-nums ac-text-primary">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center print:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ac-text-muted" />
            <input
              type="search"
              placeholder="Search by name, class, or parent…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="ac-input w-full rounded-xl border border-[var(--ac-border)] py-2.5 pl-10 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="ac-input rounded-xl border border-[var(--ac-border)] px-3 py-2.5 text-sm min-w-[140px]"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="ac-input rounded-xl border border-[var(--ac-border)] px-3 py-2.5 text-sm min-w-[160px]"
              value={sortKey}
              onChange={(e) => {
                setSortKey(e.target.value as 'name-asc' | 'name-desc' | 'class-asc' | 'class-desc');
                setPage(1);
              }}
            >
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="class-asc">Class A → Z</option>
              <option value="class-desc">Class Z → A</option>
            </select>
          </div>
        </div>

        {/* Table view */}
        {viewMode === 'table' && (
          <div className="overflow-hidden rounded-xl border border-[var(--ac-border)] bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--ac-border)] bg-white/[0.04]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ac-text-muted">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ac-text-muted">Parents / guardian</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ac-text-muted">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ac-text-muted">Class teacher</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ac-text-muted">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ac-text-muted">Phone</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider ac-text-muted w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="border-b border-[var(--ac-border)]">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="h-10 animate-pulse rounded-lg bg-white/5" />
                        </td>
                      </tr>
                    ))
                  ) : pageSlice.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <p className="ac-text-secondary">No students match your filters.</p>
                      </td>
                    </tr>
                  ) : (
                    pageSlice.map((r, idx) => {
                      const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                      const parents = displayParentsForStudent(r.student_id, r, parentsByStudent);
                      const first = parents[0];
                      const addr =
                        (r.address && r.address.trim()) || (r.guardian_address && r.guardian_address.trim()) || '';
                      const teacher = classTeacherNameByClass[r.current_class || ''] || '';
                      const isOpen =
                        expand?.studentId === r.student_id &&
                        (expand.kind === 'student' || expand.kind === 'parent');

                      return (
                        <Fragment key={r.student_id}>
                          <tr
                            className={`border-b border-[var(--ac-border)] transition-colors ${
                              isOpen ? 'bg-emerald-500/[0.06]' : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <td className="px-4 py-2.5 align-middle">
                              <div className="flex items-center gap-3">
                                {photoByStudentId[r.student_id] ? (
                                  <img
                                    src={photoByStudentId[r.student_id]}
                                    alt=""
                                    className="h-9 w-9 shrink-0 rounded-full object-cover border border-white/10 shadow-inner"
                                  />
                                ) : (
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-inner ${avatarGradient(globalIdx)}`}
                                  >
                                    {initials(r.name || '')}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => openStudentQuick(r.student_id)}
                                    className="block truncate text-left font-semibold ac-text-primary hover:text-emerald-400"
                                  >
                                    {r.name || '—'}
                                  </button>
                                  {r.current_class && (
                                    <p className="truncate text-xs font-medium text-sky-500/90 dark:text-sky-400">{r.current_class}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 align-middle max-w-[200px]">
                              {parents.length ? (
                                <div className="flex flex-col gap-0.5">
                                  {parents.map((p, pi) => (
                                    <button
                                      key={pi}
                                      type="button"
                                      onClick={() => openParentQuick(r.student_id, pi)}
                                      className="truncate text-left text-sm ac-text-secondary hover:text-emerald-400 hover:underline underline-offset-2"
                                    >
                                      {p.name || '—'}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="ac-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 align-middle">
                              {r.current_class ? (
                                <span className="inline-flex rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                                  {r.current_class}
                                </span>
                              ) : (
                                <span className="ac-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 align-middle">
                              <span className="text-sm ac-text-secondary">{teacher || '—'}</span>
                            </td>
                            <td className="px-4 py-2.5 align-middle max-w-[220px]">
                              {addr ? (
                                <span className="line-clamp-2 text-sm ac-text-secondary" title={addr}>
                                  {addr}
                                </span>
                              ) : (
                                <span className="ac-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 align-middle">
                              {first?.phone ? (
                                <a
                                  href={`tel:${first.phone.replace(/\s/g, '')}`}
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-500 hover:text-emerald-400"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="h-3.5 w-3.5 opacity-80" />
                                  {first.phone}
                                </a>
                              ) : (
                                <span className="ac-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 align-middle text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ac-border)] ac-text-secondary hover:bg-white/10 hover:ac-text-primary"
                                  title="View profile"
                                  aria-label="View full profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openStudentQuick(r.student_id)}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ac-border)] transition-transform hover:bg-white/10 ${
                                    expand?.studentId === r.student_id && expand.kind === 'student' ? 'rotate-90 bg-white/10' : ''
                                  }`}
                                  title="Quick view"
                                  aria-label="Toggle quick view"
                                >
                                  <ChevronRight className="h-4 w-4 ac-text-secondary" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expand?.studentId === r.student_id && expand.kind === 'student' && (
                            <tr className="bg-white/[0.02]">
                              <td colSpan={7} className="px-4 py-2">
                                <QuickStudentPanel
                                  row={r}
                                  parents={parents}
                                  teacher={teacher}
                                  photoUrl={photoByStudentId[r.student_id]}
                                  gradientClass={avatarGradient(globalIdx)}
                                  onClose={closeExpand}
                                  onViewParent={(pi) => openParentQuick(r.student_id, pi)}
                                  onNavigate={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                                />
                              </td>
                            </tr>
                          )}
                          {expand?.studentId === r.student_id && expand.kind === 'parent' && parents[expand.parentIndex] && (
                            <tr className="bg-white/[0.02]">
                              <td colSpan={7} className="px-4 py-2">
                                <QuickParentPanel
                                  studentName={r.name || '—'}
                                  studentClass={r.current_class}
                                  teacher={teacher}
                                  parent={parents[expand.parentIndex]}
                                  address={addr}
                                  gradientClass={avatarGradient(globalIdx + 3)}
                                  onClose={closeExpand}
                                  onViewStudent={() => openStudentQuick(r.student_id)}
                                  onNavigate={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Card view */}
        {viewMode === 'cards' && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:hidden">
            {loading ? (
              <p className="ac-text-muted col-span-full text-sm">Loading…</p>
            ) : pageSlice.length === 0 ? (
              <p className="ac-text-muted col-span-full text-center py-12">No students found.</p>
            ) : (
              pageSlice.map((r, idx) => {
                const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                const parents = displayParentsForStudent(r.student_id, r, parentsByStudent);
                const first = parents[0];
                const addr =
                  (r.address && r.address.trim()) || (r.guardian_address && r.guardian_address.trim()) || '';
                const teacher = classTeacherNameByClass[r.current_class || ''] || '';
                return (
                  <div
                    key={r.student_id}
                    className="ac-glass-card flex flex-col rounded-xl border border-[var(--ac-border)] p-4"
                  >
                    <div className="flex items-start gap-3">
                      {photoByStudentId[r.student_id] ? (
                        <img
                          src={photoByStudentId[r.student_id]}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full object-cover border border-[var(--ac-border)]"
                        />
                      ) : (
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${avatarGradient(globalIdx)}`}
                        >
                          {initials(r.name || '')}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold ac-text-primary truncate">{r.name || '—'}</h3>
                        <p className="text-xs ac-text-muted">{r.current_class || 'No class'}</p>
                      </div>
                    </div>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="ac-text-muted shrink-0">Parent</dt>
                        <dd className="text-right ac-text-secondary truncate">{first?.name || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="ac-text-muted shrink-0">Teacher</dt>
                        <dd className="text-right ac-text-secondary truncate">{teacher || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="ac-text-muted shrink-0">Phone</dt>
                        <dd className="text-right ac-text-secondary truncate">{first?.phone || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="ac-text-muted shrink-0">Address</dt>
                        <dd className="text-right ac-text-secondary line-clamp-2">{addr || '—'}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                        className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      >
                        View profile
                      </button>
                      {first?.phone && (
                        <a
                          href={`tel:${first.phone.replace(/\s/g, '')}`}
                          className="rounded-lg border border-[var(--ac-border)] px-3 py-2 text-sm ac-text-primary hover:bg-white/10"
                        >
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredSorted.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <p className="text-sm ac-text-muted">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredSorted.length)} of{' '}
              {filteredSorted.length} students
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[var(--ac-border)] px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-white/10"
                >
                  Previous
                </button>
                <span className="px-2 text-sm ac-text-secondary">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-[var(--ac-border)] px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-white/10"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}

/** Compact label + value for inline row expansion (table-style density) */
function CompactInlineField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ac-text-muted)]">
        {label}
      </p>
      <div className="text-sm font-medium leading-snug text-[var(--ac-text-primary)] break-words [&_a]:text-sky-600 [&_a]:underline-offset-2 hover:[&_a]:text-sky-500 dark:[&_a]:text-sky-400">
        {children}
      </div>
    </div>
  );
}

function QuickStudentPanel({
  row,
  parents,
  teacher,
  photoUrl,
  gradientClass,
  onClose,
  onViewParent,
  onNavigate,
}: {
  row: StudentListRow;
  parents: ParentLite[];
  teacher: string;
  photoUrl?: string | null;
  gradientClass: string;
  onClose: () => void;
  onViewParent: (index: number) => void;
  onNavigate: () => void;
}) {
  const first = parents[0];
  const second = parents[1];
  const nameLine = displayFullName(row);
  const studentAddr = (row.address && row.address.trim()) || '';
  const guardianAddrOnly = (row.guardian_address && row.guardian_address.trim()) || '';
  const fullAddr = studentAddr || guardianAddrOnly || '—';
  const primaryLabel = (first?.name || row.guardian_name || '').trim() || 'Primary contact';
  const teacherLine =
    teacher.trim() && row.current_class?.trim()
      ? `${teacher.trim()} (${row.current_class.trim()})`
      : teacher.trim() || row.current_class?.trim() || '—';

  const secondBlock = second
    ? second.phone?.trim()
      ? (
          <a
            href={`tel:${second.phone.replace(/\s/g, '')}`}
            className="text-sky-600 hover:underline dark:text-sky-400"
            onClick={(e) => e.stopPropagation()}
          >
            {second.phone.trim()}
          </a>
        )
      : second.email?.trim()
        ? (
            <a
              href={`mailto:${second.email.trim()}`}
              className="break-all text-sky-600 hover:underline dark:text-sky-400"
              onClick={(e) => e.stopPropagation()}
            >
              {second.email.trim()}
            </a>
          )
        : '—'
    : '—';

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--ac-border)] bg-[var(--ac-card-bg)] text-left shadow-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 rounded-md border border-[var(--ac-border)] bg-black/[0.04] p-1.5 text-[var(--ac-text-muted)] transition-colors hover:bg-black/[0.08] hover:text-[var(--ac-text-primary)] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
        aria-label="Close panel"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <div className="flex flex-col gap-3 p-3 pr-10 sm:flex-row sm:items-start sm:gap-5">
        {/* Left: photo + primary contact + quick call / email */}
        <div className="flex gap-3 sm:max-w-[220px] sm:shrink-0 sm:flex-col sm:items-start">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-[var(--ac-border)]"
            />
          ) : (
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ring-1 ring-white/15 ${gradientClass}`}
            >
              {initials(row.name || '')}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ac-text-muted)]">
              Primary contact
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-tight text-[var(--ac-text-primary)]">{primaryLabel}</p>
            <div className="mt-2 flex gap-2">
              {first?.phone?.trim() ? (
                <a
                  href={`tel:${first.phone.replace(/\s/g, '')}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm transition hover:bg-sky-500"
                  title="Call"
                  aria-label="Call primary contact"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-4 w-4" strokeWidth={2} />
                </a>
              ) : null}
              {first?.email?.trim() ? (
                <a
                  href={`mailto:${first.email.trim()}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500"
                  title="Email"
                  aria-label="Email primary contact"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-4 w-4" strokeWidth={2} />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Three columns — same information architecture as classic school MIS row expansion */}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 border-t border-[var(--ac-border)] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 md:grid-cols-3">
          <div className="space-y-3">
            <CompactInlineField label="Phone number">
              {first?.phone?.trim() ? (
                <a
                  href={`tel:${first.phone.replace(/\s/g, '')}`}
                  className="text-sky-600 hover:underline dark:text-sky-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {first.phone.trim()}
                </a>
              ) : (
                '—'
              )}
            </CompactInlineField>
            <CompactInlineField label={primaryLabel}>
              {first?.email?.trim() ? (
                <a
                  href={`mailto:${first.email.trim()}`}
                  className="break-all text-[var(--ac-text-secondary)] hover:text-sky-600 hover:underline dark:hover:text-sky-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {first.email.trim()}
                </a>
              ) : (
                <span className="text-[var(--ac-text-secondary)]">—</span>
              )}
            </CompactInlineField>
          </div>
          <div className="space-y-3">
            <CompactInlineField label="Pupil's name">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate();
                }}
                className="text-left font-semibold text-sky-600 hover:underline dark:text-sky-400"
              >
                {nameLine}
              </button>
            </CompactInlineField>
            <CompactInlineField label={second?.name?.trim() || 'Second parent'}>{secondBlock}</CompactInlineField>
          </div>
          <div className="space-y-3">
            <CompactInlineField label="Teacher">
              <span className="text-sky-600 dark:text-sky-400">{teacherLine}</span>
            </CompactInlineField>
            <CompactInlineField label="Address">
              <span className="whitespace-pre-wrap text-[var(--ac-text-secondary)] line-clamp-4" title={fullAddr}>
                {fullAddr}
              </span>
            </CompactInlineField>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ac-border)] bg-black/[0.02] px-3 py-2 dark:bg-white/[0.02]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          Open full profile
        </button>
        {parents.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewParent(i);
            }}
            className="rounded-md border border-[var(--ac-border)] px-2.5 py-1 text-xs font-medium text-[var(--ac-text-secondary)] transition hover:bg-white/[0.06] hover:ac-text-primary dark:hover:bg-white/[0.08]"
          >
            {p.name?.trim() || `Guardian ${i + 1}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickParentPanel({
  studentName,
  studentClass,
  teacher,
  parent,
  address,
  gradientClass,
  onClose,
  onViewStudent,
  onNavigate,
}: {
  studentName: string;
  studentClass: string | null;
  teacher: string;
  parent: ParentLite;
  address: string;
  gradientClass: string;
  onClose: () => void;
  onViewStudent: () => void;
  onNavigate: () => void;
}) {
  const teacherLine =
    teacher.trim() && studentClass?.trim()
      ? `${teacher.trim()} (${studentClass.trim()})`
      : teacher.trim() || studentClass?.trim() || '—';

  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--ac-border)] bg-[var(--ac-card-bg)] text-left shadow-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 z-10 rounded-md border border-[var(--ac-border)] bg-black/[0.04] p-1.5 text-[var(--ac-text-muted)] transition-colors hover:bg-black/[0.08] hover:text-[var(--ac-text-primary)] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
        aria-label="Close panel"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <div className="flex flex-col gap-3 p-3 pr-10 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex gap-3 sm:max-w-[220px] sm:shrink-0 sm:flex-col sm:items-start">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ring-1 ring-white/15 ${gradientClass}`}
          >
            {initials(parent.name || '')}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ac-text-muted)]">
              Parent / guardian
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-tight text-[var(--ac-text-primary)]">
              {parent.name || '—'}
            </p>
            <div className="mt-2 flex gap-2">
              {parent.phone?.trim() ? (
                <a
                  href={`tel:${parent.phone.replace(/\s/g, '')}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm transition hover:bg-sky-500"
                  title="Call"
                  aria-label="Call"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-4 w-4" strokeWidth={2} />
                </a>
              ) : null}
              {parent.email?.trim() ? (
                <a
                  href={`mailto:${parent.email.trim()}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-500"
                  title="Email"
                  aria-label="Email"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-4 w-4" strokeWidth={2} />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 border-t border-[var(--ac-border)] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 md:grid-cols-3">
          <div className="space-y-3">
            <CompactInlineField label="Phone number">
              {parent.phone?.trim() ? (
                <a
                  href={`tel:${parent.phone.replace(/\s/g, '')}`}
                  className="text-sky-600 hover:underline dark:text-sky-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {parent.phone.trim()}
                </a>
              ) : (
                '—'
              )}
            </CompactInlineField>
            <CompactInlineField label="Email">
              {parent.email?.trim() ? (
                <a
                  href={`mailto:${parent.email.trim()}`}
                  className="break-all text-[var(--ac-text-secondary)] hover:text-sky-600 hover:underline dark:hover:text-sky-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {parent.email.trim()}
                </a>
              ) : (
                '—'
              )}
            </CompactInlineField>
          </div>
          <div className="space-y-3">
            <CompactInlineField label="Pupil's name">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewStudent();
                }}
                className="text-left font-semibold text-sky-600 hover:underline dark:text-sky-400"
              >
                {studentName}
              </button>
            </CompactInlineField>
            <CompactInlineField label="Class">{studentClass?.trim() || '—'}</CompactInlineField>
          </div>
          <div className="space-y-3">
            <CompactInlineField label="Teacher">
              <span className="text-sky-600 dark:text-sky-400">{teacherLine}</span>
            </CompactInlineField>
            <CompactInlineField label="Address">
              <span className="whitespace-pre-wrap text-[var(--ac-text-secondary)] line-clamp-4" title={address || undefined}>
                {address.trim() ? address : '—'}
              </span>
            </CompactInlineField>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--ac-border)] bg-black/[0.02] px-3 py-2 dark:bg-white/[0.02]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewStudent();
          }}
          className="rounded-md border border-[var(--ac-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--ac-text-secondary)] transition hover:bg-white/[0.06] hover:ac-text-primary dark:hover:bg-white/[0.08]"
        >
          Student overview
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500"
        >
          Open full profile
        </button>
      </div>
    </div>
  );
}
