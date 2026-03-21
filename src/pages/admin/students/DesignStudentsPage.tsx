import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
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
  /** Today's attendance per student: present | absent; missing key = not marked */
  attendanceTodayByStudentId: Record<string, 'present' | 'absent'>;
  /** Portal parent_id -> all student_ids linked to that parent */
  studentsByParentId: Record<string, string[]>;
};

const STUDENT_LIST_SELECT =
  'student_id, name, first_name, middle_name, last_name, current_class, status, admission_number, admission_date, gender, date_of_birth, nationality, religion, address, city, country, student_phone, student_email, guardian_name, guardian_relationship, guardian_phone, guardian_email, guardian_occupation, guardian_address, medical_condition, stream, previous_school, boarding_type, enrollment_fee, payment_status, expected_fee_amount, fee_discount_percent, created_at';

function displayFullName(row: StudentListRow): string {
  const parts = [row.first_name, row.middle_name, row.last_name]
    .filter((x) => x != null && String(x).trim())
    .map((x) => String(x).trim());
  if (parts.length) return parts.join(' ');
  return (row.name || '').trim() || '—';
}

/** Fee chip for quick view — maps DB payment_status strings heuristically */
function feeBalanceStatus(row: StudentListRow): { label: 'Paid' | 'Owing' | 'Overdue' | 'Not set'; chipClass: string } {
  const s = (row.payment_status || '').toLowerCase().trim();
  if (!s) return { label: 'Not set', chipClass: 'bg-white/[0.08] text-[var(--ac-text-muted)]' };
  if (/paid|complete|cleared|fully|settled/.test(s)) {
    return { label: 'Paid', chipClass: 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-500/30' };
  }
  if (/overdue|arrears/.test(s)) {
    return { label: 'Overdue', chipClass: 'bg-rose-500/25 text-rose-200 ring-1 ring-rose-500/35' };
  }
  if (/unpaid|owing|partial|balance|pending|due|outstanding/.test(s)) {
    return { label: 'Owing', chipClass: 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/25' };
  }
  return { label: 'Not set', chipClass: 'bg-white/[0.08] text-[var(--ac-text-muted)]' };
}

function attendanceTodayKind(
  attendanceTodayByStudentId: Record<string, 'present' | 'absent'>,
  studentId: string
): 'present' | 'absent' | 'unmarked' {
  const v = attendanceTodayByStudentId[studentId];
  if (v === 'present') return 'present';
  if (v === 'absent') return 'absent';
  return 'unmarked';
}

const STUDENT_NAME_BTN =
  'cursor-pointer text-left font-semibold ac-text-primary underline-offset-2 decoration-transparent hover:underline hover:decoration-emerald-400/50 hover:text-emerald-400';
const PARENT_NAME_BTN =
  'cursor-pointer text-left text-base ac-text-secondary underline-offset-2 decoration-transparent hover:underline hover:decoration-emerald-400/40 hover:text-emerald-400';

async function fetchStudentsContext(userId: string): Promise<FetchResult> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) {
    return {
      rows: [],
      parentsByStudent: {},
      classTeacherNameByClass: {},
      attendedTodayCount: 0,
      photoByStudentId: {},
      attendanceTodayByStudentId: {},
      studentsByParentId: {},
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  const [studentsRes, parentsRes, classTeachersRes, attendanceRes, photosRes] = await Promise.all([
    supabase.from('students').select(STUDENT_LIST_SELECT).eq('school_id', u.school_id).order('name'),
    supabase.from('parents').select('parent_id, student_id, name, email, phone').eq('school_id', u.school_id),
    supabase.from('class_teachers').select('class_name, teacher_id').eq('school_id', u.school_id),
    supabase
      .from('student_attendance')
      .select('student_id, present')
      .eq('school_id', u.school_id)
      .eq('date', today),
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
  const studentsByParentId: Record<string, string[]> = {};
  (parentsRes.data || []).forEach(
    (p: { parent_id?: string; student_id?: string; name?: string; email?: string; phone?: string }) => {
      const sid = p.student_id;
      if (!sid) return;
      if (!parentsByStudent[sid]) parentsByStudent[sid] = [];
      parentsByStudent[sid].push({
        name: p.name || '',
        email: p.email || undefined,
        phone: p.phone || undefined,
        parent_id: p.parent_id ?? null,
      });
      const pid = p.parent_id;
      if (pid) {
        if (!studentsByParentId[pid]) studentsByParentId[pid] = [];
        if (!studentsByParentId[pid].includes(sid)) studentsByParentId[pid].push(sid);
      }
    }
  );

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

  const attendanceTodayByStudentId: Record<string, 'present' | 'absent'> = {};
  for (const row of attendanceRes.data || []) {
    const sid = (row as { student_id?: string; present?: boolean }).student_id;
    if (!sid) continue;
    const present = (row as { present?: boolean }).present;
    if (present === true) {
      attendanceTodayByStudentId[sid] = 'present';
    } else if (present === false && attendanceTodayByStudentId[sid] !== 'present') {
      attendanceTodayByStudentId[sid] = 'absent';
    }
  }

  const attendedSet = new Set(
    Object.entries(attendanceTodayByStudentId).filter(([, v]) => v === 'present').map(([k]) => k)
  );

  return {
    rows,
    parentsByStudent,
    classTeacherNameByClass,
    attendedTodayCount: attendedSet.size,
    photoByStudentId,
    attendanceTodayByStudentId,
    studentsByParentId,
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
  const attendanceTodayByStudentId = data?.attendanceTodayByStudentId ?? {};
  const studentsByParentId = data?.studentsByParentId ?? {};

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

  const closeExpand = useCallback(() => setExpand(null), []);

  const drawerRow = useMemo(
    () => (expand?.studentId ? rows.find((r) => r.student_id === expand.studentId) : undefined),
    [rows, expand?.studentId]
  );

  const drawerParents = useMemo(() => {
    if (!drawerRow) return [];
    return displayParentsForStudent(drawerRow.student_id, drawerRow, parentsByStudent);
  }, [drawerRow, parentsByStudent]);

  const [drawerEntered, setDrawerEntered] = useState(false);
  useEffect(() => {
    if (!expand) {
      setDrawerEntered(false);
      return;
    }
    setDrawerEntered(false);
    const id = requestAnimationFrame(() => setDrawerEntered(true));
    return () => cancelAnimationFrame(id);
  }, [expand]);

  useEffect(() => {
    if (!expand) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeExpand();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expand, closeExpand]);

  useEffect(() => {
    if (!expand) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expand]);

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
                <p className="text-sm font-medium uppercase tracking-wide ac-text-muted">{label}</p>
                <p className="text-2xl font-semibold tabular-nums ac-text-primary">{value}</p>
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
              className="ac-input w-full rounded-xl border border-[var(--ac-border)] py-3 pl-10 pr-3 text-base"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="ac-input rounded-xl border border-[var(--ac-border)] px-3 py-3 text-base min-w-[140px]"
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
              className="ac-input rounded-xl border border-[var(--ac-border)] px-3 py-3 text-base min-w-[160px]"
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
              <table className="w-full min-w-[880px] border-collapse text-base">
                <thead>
                  <tr className="border-b border-[var(--ac-border)] bg-white/[0.04]">
                    <th className="px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-wider ac-text-muted">Student</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-wider ac-text-muted">Parents / guardian</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-wider ac-text-muted">Class</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-wider ac-text-muted">Class teacher</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-wider ac-text-muted">Address</th>
                    <th className="px-4 py-3.5 text-left text-sm font-semibold uppercase tracking-wider ac-text-muted">Phone</th>
                    <th className="px-4 py-3.5 text-right text-sm font-semibold uppercase tracking-wider ac-text-muted w-[100px]">Actions</th>
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
                            <td className="px-4 py-3.5 align-middle">
                              <div className="flex items-center gap-3">
                                {photoByStudentId[r.student_id] ? (
                                  <img
                                    src={photoByStudentId[r.student_id]}
                                    alt=""
                                    className="h-10 w-10 shrink-0 rounded-full object-cover border border-white/10 shadow-inner"
                                  />
                                ) : (
                                  <div
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-inner ${avatarGradient(globalIdx)}`}
                                  >
                                    {initials(r.name || '')}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => openStudentQuick(r.student_id)}
                                    className={`block max-w-full truncate ${STUDENT_NAME_BTN}`}
                                  >
                                    {r.name || '—'}
                                  </button>
                                  {r.current_class && (
                                    <p className="truncate text-sm font-medium text-sky-500/90 dark:text-sky-400">{r.current_class}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 align-middle max-w-[200px]">
                              {parents.length ? (
                                <div className="flex flex-col gap-0.5">
                                  {parents.map((p, pi) => (
                                    <button
                                      key={pi}
                                      type="button"
                                      onClick={() => openParentQuick(r.student_id, pi)}
                                      className={`truncate ${PARENT_NAME_BTN} text-sm`}
                                    >
                                      {p.name || '—'}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="ac-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 align-middle">
                              {r.current_class ? (
                                <span className="inline-flex rounded-full bg-sky-500/15 px-2.5 py-0.5 text-sm font-medium text-sky-700 dark:text-sky-300">
                                  {r.current_class}
                                </span>
                              ) : (
                                <span className="ac-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 align-middle">
                              <span className="ac-text-secondary">{teacher || '—'}</span>
                            </td>
                            <td className="px-4 py-3.5 align-middle max-w-[220px]">
                              {addr ? (
                                <span className="line-clamp-2 ac-text-secondary" title={addr}>
                                  {addr}
                                </span>
                              ) : (
                                <span className="ac-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 align-middle">
                              {first?.phone ? (
                                <a
                                  href={`tel:${first.phone.replace(/\s/g, '')}`}
                                  className="inline-flex items-center gap-1.5 font-medium text-emerald-500 hover:text-emerald-400"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="h-3.5 w-3.5 opacity-80" />
                                  {first.phone}
                                </a>
                              ) : (
                                <span className="ac-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 align-middle text-right">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openStudentQuick(r.student_id)}
                                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ac-border)] ac-text-secondary hover:bg-white/10 hover:ac-text-primary ${
                                    expand?.studentId === r.student_id && expand.kind === 'student' ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : ''
                                  }`}
                                  title="Quick view"
                                  aria-label="Quick view"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ac-border)] ac-text-secondary hover:bg-white/10 hover:ac-text-primary"
                                  title="Open full profile"
                                  aria-label="Open full profile"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
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
                        <button
                          type="button"
                          onClick={() => openStudentQuick(r.student_id)}
                          className={`block max-w-full truncate text-left text-lg ${STUDENT_NAME_BTN}`}
                        >
                          {r.name || '—'}
                        </button>
                        <p className="text-sm ac-text-muted">{r.current_class || 'No class'}</p>
                      </div>
                    </div>
                    <dl className="mt-4 space-y-2 text-base">
                      <div className="flex justify-between gap-2">
                        <dt className="ac-text-muted shrink-0">Parent</dt>
                        <dd className="min-w-0 flex-1 text-right">
                          {parents.length ? (
                            parents.map((p, pi) => (
                              <button
                                key={pi}
                                type="button"
                                onClick={() => openParentQuick(r.student_id, pi)}
                                className={`block w-full truncate text-right ${PARENT_NAME_BTN} text-sm`}
                              >
                                {p.name || '—'}
                              </button>
                            ))
                          ) : (
                            <span className="ac-text-muted">—</span>
                          )}
                        </dd>
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
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openStudentQuick(r.student_id)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ac-border)] ac-text-secondary hover:bg-white/10 hover:ac-text-primary ${
                          expand?.studentId === r.student_id && expand.kind === 'student' ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : ''
                        }`}
                        title="Quick view"
                        aria-label="Quick view"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ac-border)] ac-text-secondary hover:bg-white/10 hover:ac-text-primary"
                        title="Open full profile"
                        aria-label="Open full profile"
                      >
                        <ChevronRight className="h-4 w-4" />
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

        {/* Right slide-over quick view */}
        {expand && drawerRow && (
          <>
            <div
              role="presentation"
              aria-hidden
              className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${drawerEntered ? 'opacity-100' : 'opacity-0'}`}
              onClick={closeExpand}
            />
            <aside
              className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[var(--ac-border)] bg-[var(--ac-card-bg)] shadow-2xl transition-transform duration-300 ease-out ${drawerEntered ? 'translate-x-0' : 'translate-x-full'}`}
            >
              {expand.kind === 'student' ? (
                <QuickStudentDrawerPanel
                  row={drawerRow}
                  parents={drawerParents}
                  attendanceTodayByStudentId={attendanceTodayByStudentId}
                  photoUrl={photoByStudentId[drawerRow.student_id]}
                  gradientClass={avatarGradient(Math.max(0, rows.findIndex((x) => x.student_id === drawerRow.student_id)))}
                  onClose={closeExpand}
                  onViewParent={(pi) => openParentQuick(drawerRow.student_id, pi)}
                  onNavigate={() => navigate(`/dashboard/admin/students/${drawerRow.student_id}`)}
                />
              ) : drawerParents[expand.parentIndex] ? (
                <QuickParentDrawerPanel
                  parent={drawerParents[expand.parentIndex]}
                  parentIndex={expand.parentIndex}
                  studentRow={drawerRow}
                  linkedStudents={(() => {
                    const p = drawerParents[expand.parentIndex];
                    const pid = p?.parent_id;
                    const ids = pid ? studentsByParentId[pid] || [] : [drawerRow.student_id];
                    return [...new Set(ids)]
                      .map((id) => {
                        const sr = rows.find((x) => x.student_id === id);
                        return { id, name: sr ? displayFullName(sr) : 'Student' };
                      })
                      .sort((a, b) => a.name.localeCompare(b.name));
                  })()}
                  gradientClass={avatarGradient(
                    Math.max(0, rows.findIndex((x) => x.student_id === drawerRow.student_id)) + 3
                  )}
                  onClose={closeExpand}
                  onSelectStudent={(studentId) => openStudentQuick(studentId)}
                  onNavigate={() => navigate(`/dashboard/admin/students/${drawerRow.student_id}`)}
                />
              ) : null}
            </aside>
          </>
        )}
      </div>
    </AdminPageWrapper>
  );
}

function QuickStudentDrawerPanel({
  row,
  parents,
  attendanceTodayByStudentId,
  photoUrl,
  gradientClass,
  onClose,
  onViewParent,
  onNavigate,
}: {
  row: StudentListRow;
  parents: ParentLite[];
  attendanceTodayByStudentId: Record<string, 'present' | 'absent'>;
  photoUrl?: string | null;
  gradientClass: string;
  onClose: () => void;
  onViewParent: (index: number) => void;
  onNavigate: () => void;
}) {
  const first = parents[0];
  const nameLine = displayFullName(row);
  const primaryName = (first?.name?.trim() || row.guardian_name?.trim() || '').trim() || '—';
  const primaryPhone = (first?.phone?.trim() || row.guardian_phone?.trim() || '').trim();
  const lineAddr = (() => {
    const bits = [row.address?.trim(), row.city?.trim(), row.country?.trim()].filter(Boolean);
    if (bits.length) return bits.join(', ');
    return row.guardian_address?.trim() || '—';
  })();

  const att = attendanceTodayKind(attendanceTodayByStudentId, row.student_id);
  const attChip =
    att === 'present'
      ? { label: 'Present', cls: 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-500/35' }
      : att === 'absent'
        ? { label: 'Absent', cls: 'bg-rose-500/25 text-rose-200 ring-1 ring-rose-500/35' }
        : { label: 'Not Marked', cls: 'bg-white/[0.08] text-[var(--ac-text-muted)] ring-1 ring-white/10' };

  const fee = feeBalanceStatus(row);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ac-card-bg)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--ac-border)] px-4 py-3">
        <span className="text-sm font-semibold uppercase tracking-wide text-[var(--ac-text-muted)]">Quick view</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--ac-border)] p-2 text-[var(--ac-text-muted)] hover:bg-white/10 hover:ac-text-primary"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="flex gap-4">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-emerald-500/25"
            />
          ) : (
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white ${gradientClass}`}
            >
              {initials(row.name || '')}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold leading-tight text-[var(--ac-text-primary)]">{nameLine}</h3>
            {row.current_class?.trim() ? (
              <span className="mt-2 inline-flex rounded-full bg-sky-500/15 px-2.5 py-0.5 text-sm font-medium text-sky-700 dark:text-sky-300">
                {row.current_class}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-[var(--ac-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ac-text-muted)]">Primary guardian</p>
          <p className="mt-1 text-base font-semibold text-[var(--ac-text-primary)]">{primaryName}</p>
          {primaryPhone ? (
            <a
              href={`tel:${primaryPhone.replace(/\s/g, '')}`}
              className="mt-1 inline-block text-lg font-medium text-sky-500 hover:text-sky-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {primaryPhone}
            </a>
          ) : (
            <p className="mt-1 text-sm ac-text-muted">No phone on file</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${attChip.cls}`}>
            Today: {attChip.label}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${fee.chipClass}`}>
            Fees: {fee.label}
          </span>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ac-text-muted)]">Address</p>
          <p className="mt-1 text-base leading-snug text-[var(--ac-text-secondary)] line-clamp-2">{lineAddr}</p>
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--ac-border)] bg-black/[0.02] p-4 dark:bg-white/[0.02]">
        <button
          type="button"
          onClick={onNavigate}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-base font-semibold text-white hover:bg-emerald-500"
        >
          Open full profile
        </button>
        {parents.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {parents.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onViewParent(i)}
                className="rounded-lg border border-[var(--ac-border)] px-3 py-1.5 text-sm font-medium text-[var(--ac-text-secondary)] hover:bg-white/[0.06] hover:ac-text-primary"
              >
                {p.name?.trim() || `Guardian ${i + 1}`}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QuickParentDrawerPanel({
  parent,
  parentIndex,
  studentRow,
  linkedStudents,
  gradientClass,
  onClose,
  onSelectStudent,
  onNavigate,
}: {
  parent: ParentLite;
  parentIndex: number;
  studentRow: StudentListRow;
  linkedStudents: { id: string; name: string }[];
  gradientClass: string;
  onClose: () => void;
  onSelectStudent: (studentId: string) => void;
  onNavigate: () => void;
}) {
  const phone =
    (parent.phone?.trim() ||
      (parentIndex === 0 ? studentRow.guardian_phone?.trim() : '') ||
      '') ||
    '';
  const email =
    (parent.email?.trim() ||
      (parentIndex === 0 ? studentRow.guardian_email?.trim() : '') ||
      '') ||
    '';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--ac-card-bg)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--ac-border)] px-4 py-3">
        <span className="text-sm font-semibold uppercase tracking-wide text-[var(--ac-text-muted)]">Parent</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--ac-border)] p-2 text-[var(--ac-text-muted)] hover:bg-white/10 hover:ac-text-primary"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="flex gap-4">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-base font-bold text-white ${gradientClass}`}
          >
            {initials(parent.name || '')}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold leading-tight text-[var(--ac-text-primary)]">
              {parent.name || studentRow.guardian_name || '—'}
            </h3>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="block text-lg font-medium text-sky-500 hover:text-sky-400 hover:underline"
            >
              {phone}
            </a>
          ) : (
            <p className="text-sm ac-text-muted">No phone on file</p>
          )}
          {email ? (
            <a href={`mailto:${email}`} className="block break-all text-base text-emerald-400 hover:underline">
              {email}
            </a>
          ) : (
            <p className="text-sm ac-text-muted">No email on file</p>
          )}
        </div>

        <div className="mt-6 border-t border-[var(--ac-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ac-text-muted)]">Students linked</p>
          <ul className="mt-2 space-y-1">
            {linkedStudents.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelectStudent(s.id)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-base ${STUDENT_NAME_BTN}`}
                >
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 border-t border-[var(--ac-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ac-text-muted)]">Last contacted</p>
          <p className="mt-1 text-sm text-[var(--ac-text-secondary)]">Not tracked in this system</p>
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--ac-border)] bg-black/[0.02] p-4 dark:bg-white/[0.02]">
        <button
          type="button"
          onClick={onNavigate}
          className="w-full rounded-lg bg-violet-600 py-2.5 text-base font-semibold text-white hover:bg-violet-500"
        >
          Open full profile
        </button>
      </div>
    </div>
  );
}

