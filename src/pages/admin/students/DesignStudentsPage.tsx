import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { displayParentsForStudent, type ParentLite } from '@/lib/studentDisplayParents';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { SkeletonKPIStrip, SkeletonTable } from '@/components/PwezaSkeleton';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';
import { AddStudentForm } from './AddStudentForm';
import { StudentImportWizard } from '@/components/admin/students/StudentImportWizard';
import { StudentExportDialog } from '@/components/admin/students/StudentExportDialog';
import { StudentImportHistory } from '@/components/admin/students/StudentImportHistory';
import {
  addParentSchoolQueryKey,
  addParentSchoolStaleOptions,
  fetchAddParentSchoolContext,
} from '@/pages/admin/parents/addParentSchoolQuery';
import {
  addStudentSchoolQueryKey,
  addStudentSchoolStaleOptions,
  fetchAddStudentSchoolContext,
} from './addStudentSchoolQuery';
import { resolveDisciplineDisplayStatus } from '@/components/admin/students/StudentDisciplineSection';
import { getOfflineStudents, getOfflineParentsBySchool, type CachedParent } from '@/lib/offlineDb';

import '@/assets/pwezacore-students-scoped.css';

const FILTER_LABELS: Record<string, string> = {
  all: 'All Students',
  active: 'Active Students',
  warned: 'Warned Students',
  suspended: 'Suspended Students',
  deactivated: 'Deactivated Students',
  deleted: 'Deleted Students',
};

function disciplineStatusDotStyle(
  status: ReturnType<typeof resolveDisciplineDisplayStatus>
): CSSProperties {
  const glow = (rgb: string) => `0 0 0 3px ${rgb}`;
  switch (status) {
    case 'Active':
      return { background: '#27e09f', boxShadow: glow('rgba(39,224,159,.15)') };
    case 'Warned':
      return { background: '#f59e0b', boxShadow: glow('rgba(245,158,11,.22)') };
    case 'Suspended':
      return { background: '#f97316', boxShadow: glow('rgba(249,115,22,.22)') };
    case 'Deactivated':
      return { background: '#64748b', boxShadow: glow('rgba(100,116,139,.25)') };
    case 'Deleted':
      return { background: '#f43f5e', boxShadow: glow('rgba(244,63,94,.2)') };
    default:
      return { background: 'var(--green)', boxShadow: glow('rgba(39,224,159,.15)') };
  }
}

function clientDisciplineFilter(
  list: StudentListRow[],
  filter: string,
  warnIds: Set<string>
): StudentListRow[] {
  const f = (filter || 'all').toLowerCase();
  if (f === 'all') return list;
  return list.filter((r) => {
    const st = resolveDisciplineDisplayStatus(
      {
        deleted_at: r.deleted_at,
        discipline_deactivated_at: r.discipline_deactivated_at,
        suspension_open: r.suspension_open,
      },
      warnIds.has(r.student_id)
    );
    if (f === 'active') return st === 'Active';
    if (f === 'warned') return st === 'Warned';
    if (f === 'suspended') return st === 'Suspended';
    if (f === 'deactivated') return st === 'Deactivated';
    if (f === 'deleted') return st === 'Deleted';
    return true;
  });
}

const PAGE_SIZE = 15;

const STUDENTS_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap';

/** Spec §9 — avatar gradient pool */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #3d7eff, #9d7eff)',
  'linear-gradient(135deg, #9d7eff, #ff4f6a)',
  'linear-gradient(135deg, #00e5c3, #3d7eff)',
  'linear-gradient(135deg, #ffb547, #ff4f6a)',
  'linear-gradient(135deg, #27e09f, #3d7eff)',
  'linear-gradient(135deg, #9d7eff, #00e5c3)',
  'linear-gradient(135deg, #ff4f6a, #ffb547)',
  'linear-gradient(135deg, #27e09f, #9d7eff)',
];

function gradAt(i: number) {
  return AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
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

/** Map class label → chip variant (spec §8) */
function classChipModifier(className: string | null | undefined): string {
  const c = (className || '').toLowerCase().trim();
  if (c.includes('primary 1')) return 'rose';
  if (c.includes('primary 2')) return 'amber';
  if (c.includes('primary 3')) return 'blue';
  if (c.includes('primary 4')) return 'green';
  if (c.includes('primary 5')) return '';
  if (c.includes('primary 6')) return 'amber';
  if (c.includes('primary 7')) return 'violet';
  return '';
}

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
  age_years?: number | null;
  created_at?: string | null;
  deleted_at?: string | null;
  discipline_deactivated_at?: string | null;
  suspension_open?: boolean | null;
  suspension_period_start?: string | null;
  suspension_period_end?: string | null;
};

export type StudentsFetchResult = {
  schoolId: string | null;
  schoolType: 'Nursery/Primary' | 'Secondary' | null;
  rows: StudentListRow[];
  parentsByStudent: Record<string, ParentLite[]>;
  classTeacherNameByClass: Record<string, string>;
  attendedTodayCount: number;
  photoByStudentId: Record<string, string>;
  attendanceTodayByStudentId: Record<string, 'present' | 'absent'>;
  studentsByParentId: Record<string, string[]>;
  warningStudentIds: string[];
};

const STUDENT_LIST_SELECT =
  'student_id, name, first_name, middle_name, last_name, current_class, status, admission_number, admission_date, gender, date_of_birth, age_years, nationality, religion, address, city, country, student_phone, student_email, guardian_name, guardian_relationship, guardian_phone, guardian_email, guardian_occupation, guardian_address, medical_condition, stream, previous_school, boarding_type, enrollment_fee, payment_status, expected_fee_amount, fee_discount_percent, created_at, deleted_at, discipline_deactivated_at, suspension_open, suspension_period_start, suspension_period_end';

function displayFullName(row: StudentListRow): string {
  const parts = [row.first_name, row.middle_name, row.last_name]
    .filter((x) => x != null && String(x).trim())
    .map((x) => String(x).trim());
  if (parts.length) return parts.join(' ');
  return (row.name || '').trim() || '—';
}

type SortKey = 'name-asc' | 'name-desc' | 'class' | 'recent';

async function buildOfflineStudentsResult(schoolId: string): Promise<StudentsFetchResult> {
  const [cached, cachedParents] = await Promise.all([
    getOfflineStudents(schoolId),
    getOfflineParentsBySchool(schoolId),
  ]);
  const parentsByStudent: Record<string, ParentLite[]> = {};
  const studentsByParentId: Record<string, string[]> = {};
  for (const p of cachedParents as CachedParent[]) {
    if (!parentsByStudent[p.student_id]) parentsByStudent[p.student_id] = [];
    parentsByStudent[p.student_id].push({ name: p.name, phone: p.phone ?? undefined, email: p.email ?? undefined, parent_id: p.parent_id });
    if (!studentsByParentId[p.parent_id]) studentsByParentId[p.parent_id] = [];
    if (!studentsByParentId[p.parent_id].includes(p.student_id)) studentsByParentId[p.parent_id].push(p.student_id);
  }
  return {
    schoolId,
    schoolType: null,
    rows: cached.map((s) => ({
      student_id: s.student_id,
      name: s.student_name,
      current_class: s.class_name,
      status: s.status,
      admission_number: s.admission_number ?? undefined,
      gender: s.gender ?? undefined,
    })),
    parentsByStudent,
    classTeacherNameByClass: {},
    attendedTodayCount: 0,
    photoByStudentId: Object.fromEntries(cached.filter((s) => s.photo_url).map((s) => [s.student_id, s.photo_url!])),
    attendanceTodayByStudentId: {},
    studentsByParentId,
    warningStudentIds: [],
  };
}

export async function fetchStudentsContext(
  userId: string,
  disciplineFilter: string = 'all'
): Promise<StudentsFetchResult> {
  // Offline: serve from IndexedDB cache instantly (students + parents)
  if (!navigator.onLine) {
    const { schoolId: storedSchoolId } = useAuthStore.getState();
    if (storedSchoolId) {
      return buildOfflineStudentsResult(storedSchoolId);
    }
  }

  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) {
    return {
      schoolId: null,
      schoolType: null,
      rows: [],
      parentsByStudent: {},
      classTeacherNameByClass: {},
      attendedTodayCount: 0,
      photoByStudentId: {},
      attendanceTodayByStudentId: {},
      studentsByParentId: {},
      warningStudentIds: [],
    };
  }

  const schoolId = u.school_id as string;
  const discipline = (disciplineFilter || 'all').toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: warnRows }, { data: canD }, schoolRes] = await Promise.all([
    supabase
      .from('discipline_records')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('action_type', 'warning'),
    supabase.rpc('current_user_can_manage_discipline'),
    supabase.from('schools').select('type').eq('school_id', schoolId).single(),
  ]);
  const warningIds = new Set(
    (warnRows || []).map((w: { student_id?: string }) => w.student_id).filter(Boolean) as string[]
  );

  let rows: StudentListRow[] | null = null;
  if (canD) {
    const { data: rpcRows, error: rpcErr } = await supabase.rpc('admin_list_students_discipline_filtered', {
      p_filter: discipline,
    });
    if (!rpcErr && rpcRows != null) {
      rows = rpcRows as StudentListRow[];
    }
  }
  if (rows == null) {
    const { data: all } = await supabase
      .from('students')
      .select(STUDENT_LIST_SELECT)
      .eq('school_id', schoolId)
      .order('name');
    rows = clientDisciplineFilter((all || []) as StudentListRow[], discipline, warningIds);
  }

  const rowIdSet = new Set(rows.map((r) => r.student_id));
  const schoolType = (schoolRes.data?.type as 'Nursery/Primary' | 'Secondary') || null;

  const [parentsRes, classTeachersRes, attendanceRes, photosRes] = await Promise.all([
    supabase.from('parents').select('parent_id, student_id, name, email, phone').eq('school_id', schoolId),
    supabase.from('class_teachers').select('class_name, teacher_id').eq('school_id', schoolId),
    supabase
      .from('student_attendance')
      .select('student_id, present, status')
      .eq('school_id', schoolId)
      .eq('attendance_date', today),
    supabase
      .from('student_photos')
      .select('student_id, photo_url')
      .eq('school_id', schoolId)
      .eq('is_primary', true),
  ]);
  const photoByStudentId: Record<string, string> = {};
  (photosRes.data || []).forEach((ph: { student_id?: string; photo_url?: string }) => {
    const sid = ph.student_id;
    const url = ph.photo_url;
    if (!sid || !rowIdSet.has(sid)) return;
    if (url && String(url).trim() && !photoByStudentId[sid]) {
      photoByStudentId[sid] = String(url).trim();
    }
  });
  const parentsByStudent: Record<string, ParentLite[]> = {};
  const studentsByParentId: Record<string, string[]> = {};
  (parentsRes.data || []).forEach(
    (p: { parent_id?: string; student_id?: string; name?: string; email?: string; phone?: string }) => {
      const sid = p.student_id;
      if (!sid || !rowIdSet.has(sid)) return;
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
        .eq('school_id', schoolId)
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
    const r = row as { student_id?: string; present?: boolean | null; status?: string | null };
    const sid = r.student_id;
    if (!sid) continue;
    if (studentAttendanceRowIsPresent(r)) {
      attendanceTodayByStudentId[sid] = 'present';
    } else if (attendanceTodayByStudentId[sid] !== 'present') {
      attendanceTodayByStudentId[sid] = 'absent';
    }
  }

  const attendedSet = new Set(
    Object.entries(attendanceTodayByStudentId)
      .filter(([k, v]) => v === 'present' && rowIdSet.has(k))
      .map(([k]) => k)
  );

  return {
    schoolId,
    schoolType,
    rows,
    parentsByStudent,
    classTeacherNameByClass,
    attendedTodayCount: attendedSet.size,
    photoByStudentId,
    attendanceTodayByStudentId,
    studentsByParentId: studentsByParentId,
    warningStudentIds: [...warningIds],
  };
}

export default function DesignStudentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const discipline = (searchParams.get('discipline') || 'all').toLowerCase();
  const filterBanner = FILTER_LABELS[discipline] || FILTER_LABELS.all;
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importHistoryOpen, setImportHistoryOpen] = useState(false);

  /** Same query key as AddStudentForm — runs as soon as this page mounts so the modal hits a warm cache. */
  useQuery({
    queryKey: addStudentSchoolQueryKey(user?.id ?? ''),
    queryFn: () => fetchAddStudentSchoolContext(user!.id),
    enabled: !!user?.id,
    ...addStudentSchoolStaleOptions,
  });

  /** Warm cache for Add Parent modal when opened from this page (same pattern as parents list). */
  useQuery({
    queryKey: addParentSchoolQueryKey(user?.id ?? ''),
    queryFn: () => fetchAddParentSchoolContext(user!.id),
    enabled: !!user?.id,
    ...addParentSchoolStaleOptions,
  });

  const addModalOpen = searchParams.get('add') === '1';

  const closeAddStudentModal = () => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('add');
        return p;
      },
      { replace: true }
    );
  };

  const openAddStudentModal = () => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('add', '1');
        return p;
      },
      { replace: true }
    );
  };
  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const id = 'pweza-students-fonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = STUDENTS_FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  // Load IndexedDB snapshot on mount — used as instant placeholder before Supabase responds
  const schoolIdForCache = useAuthStore((s) => s.schoolId);
  const { data: offlineSnapshot } = useQuery({
    queryKey: ['students-offline-snapshot', schoolIdForCache],
    queryFn: () => schoolIdForCache ? buildOfflineStudentsResult(schoolIdForCache) : null,
    enabled: !!schoolIdForCache,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data, isPending } = useQuery({
    queryKey: adminQueryKeys.studentsDesign(user?.id ?? '', discipline),
    queryFn: () => fetchStudentsContext(user!.id, discipline),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    placeholderData: (prev) => prev ?? offlineSnapshot ?? undefined,
    refetchOnWindowFocus: false,
  });

  const schoolId = data?.schoolId ?? null;
  const schoolType = data?.schoolType ?? null;
  const rows = data?.rows ?? [];
  const parentsByStudent = data?.parentsByStudent ?? {};
  const classTeacherNameByClass = data?.classTeacherNameByClass ?? {};
  const attendedToday = data?.attendedTodayCount ?? 0;
  const photoByStudentId = data?.photoByStudentId ?? {};
  const warningIdSet = new Set(data?.warningStudentIds ?? []);

  const classOptions = (() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.current_class) set.add(r.current_class);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  })();

  const filteredSorted = (() => {
    let out = [...rows];
    const t = q.trim().toLowerCase();
    if (t) {
      out = out.filter((r) => {
        const parents = displayParentsForStudent(r.student_id, r, parentsByStudent);
        const full = displayFullName(r).toLowerCase();
        return (
          full.includes(t) ||
          (r.name || '').toLowerCase().includes(t) ||
          (r.current_class || '').toLowerCase().includes(t) ||
          (r.guardian_name || '').toLowerCase().includes(t) ||
          parents.some((p) => (p.name || '').toLowerCase().includes(t))
        );
      });
    }
    if (classFilter) out = out.filter((r) => r.current_class === classFilter);

    out.sort((a, b) => {
      const an = displayFullName(a).toLowerCase();
      const bn = displayFullName(b).toLowerCase();
      const ac = (a.current_class || '').toLowerCase();
      const bc = (b.current_class || '').toLowerCase();
      switch (sortKey) {
        case 'name-desc':
          return bn.localeCompare(an);
        case 'class':
          return ac.localeCompare(bc) || an.localeCompare(bn);
        case 'recent': {
          const ta = new Date(a.created_at || 0).getTime();
          const tb = new Date(b.created_at || 0).getTime();
          return tb - ta;
        }
        default:
          return an.localeCompare(bn);
      }
    });
    return out;
  })();

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const pageSlice = (() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  })();

  const stats = {
    total: rows.length,
    classes: new Set(rows.map((r) => r.current_class).filter(Boolean)).size,
    withParents: rows.filter(
      (r) => displayParentsForStudent(r.student_id, r, parentsByStudent).length > 0
    ).length,
    attendedToday,
  };

  const loading = !!user?.id && !data && isPending;

  const startIdx = filteredSorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(safePage * PAGE_SIZE, filteredSorted.length);

  const sortSelectValue = sortKey === 'name-desc' ? 'name-desc' : sortKey === 'class' ? 'class' : sortKey === 'recent' ? 'recent' : 'name-asc';

  if (user?.id && isPending && !data) {
    return (
      <AdminPageWrapper>
        <div style={{ padding: '26px 28px' }}>
          <SkeletonKPIStrip count={4} />
          <SkeletonTable rows={8} cols={7} />
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper>
      <div className="pw-students print:bg-[#07090f]">
        <div className="page">
          <div className="page-header fade-up">
            <div className="page-title-block">
              <div className="page-eyebrow">Student Registry</div>
              <h1 className="page-title">Students</h1>
              <p className="page-sub">Manage enrolled students, classes, and parent contacts.</p>
            </div>
            <div className="page-actions print:hidden">
              {schoolId && (
                <>
                  <button type="button" className="btn btn-ghost" onClick={() => setImportOpen(true)}>
                    ⬆ Import students
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setExportOpen(true)}>
                    ⬇ Export
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setImportHistoryOpen(true)}>
                    Import history
                  </button>
                </>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                🖨 Print
              </button>
              <button type="button" className="btn btn-teal" onClick={openAddStudentModal}>
                ＋ Add Student
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard/admin/teachers?add=1')}>
                ＋ Add Teacher
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard/admin/parents?add=1')}>
                ＋ Add Parent
              </button>
            </div>
          </div>

          <div className="kpi-strip fade-up d1">
            <div className="kpi-card c-teal">
              <div className="kpi-ic c-teal">🧑‍🎓</div>
              <div className="kpi-info">
                <div className="kpi-label">Total Students</div>
                <div className="kpi-value c-teal">{loading ? '…' : stats.total}</div>
                <div className="kpi-sub">Enrolled this term</div>
              </div>
            </div>
            <div className="kpi-card c-blue">
              <div className="kpi-ic c-blue">🏫</div>
              <div className="kpi-info">
                <div className="kpi-label">Classes</div>
                <div className="kpi-value">{loading ? '…' : stats.classes}</div>
                <div className="kpi-sub">Active class groups</div>
              </div>
            </div>
            <div className="kpi-card c-green">
              <div className="kpi-ic c-green">👨‍👩‍👧</div>
              <div className="kpi-info">
                <div className="kpi-label">Parents Linked</div>
                <div className="kpi-value c-green">{loading ? '…' : stats.withParents}</div>
                <div className="kpi-sub">With portal access</div>
              </div>
            </div>
            <div className="kpi-card c-amber">
              <div className="kpi-ic c-amber">✅</div>
              <div className="kpi-info">
                <div className="kpi-label">Attended Today</div>
                <div className="kpi-value c-amber">{loading ? '…' : stats.attendedToday}</div>
                <div className="kpi-sub">Present this morning</div>
              </div>
            </div>
          </div>

          <div
            className="fade-up d1 print:hidden"
            style={{
              marginBottom: 12,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--t2)',
            }}
          >
            Showing: <strong style={{ color: 'var(--t1)' }}>{filterBanner}</strong>
          </div>

          <div className="toolbar fade-up d2 print:hidden">
            <div className="search-bar">
              <span style={{ color: 'var(--t3)', fontSize: 14 }}>🔍</span>
              <input
                placeholder="Search by name, class, or parent…"
                type="text"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="filter-select"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={sortSelectValue}
              onChange={(e) => {
                const v = e.target.value;
                setSortKey(v === 'name-desc' ? 'name-desc' : v === 'class' ? 'class' : v === 'recent' ? 'recent' : 'name-asc');
                setPage(1);
              }}
            >
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="class">Class</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>

          <div className="fade-up d3 print:hidden">
              {loading ? (
                <div className="empty-state">
                  <div className="empty-icon">⏳</div>
                  <div className="empty-title">Loading…</div>
                </div>
              ) : pageSlice.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🧑‍🎓</div>
                  <div className="empty-title">No students found.</div>
                </div>
              ) : (
                <div className="card-grid">
                  {pageSlice.map((r, idx) => {
                    const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                    const parents = displayParentsForStudent(r.student_id, r, parentsByStudent);
                    const first = parents[0];
                    const phone = (first?.phone || r.guardian_phone || '').trim();
                    const addr =
                      (r.address && r.address.trim()) || (r.guardian_address && r.guardian_address.trim()) || '';
                    const teacher = classTeacherNameByClass[r.current_class || ''] || '';
                    const name = displayFullName(r);
                    const adm = r.admission_number?.trim();
                    const photo = photoByStudentId[r.student_id];
                    const parentLabel = parents.map((p) => p.name).filter(Boolean).join(', ') || '—';
                    const dStat = resolveDisciplineDisplayStatus(
                      {
                        deleted_at: r.deleted_at,
                        discipline_deactivated_at: r.discipline_deactivated_at,
                        suspension_open: r.suspension_open,
                      },
                      warningIdSet.has(r.student_id)
                    );

                    return (
                      <div key={r.student_id} className="student-card">
                        <div className="student-card-top">
                          <div className="sc-av" style={photo ? undefined : { background: gradAt(globalIdx) }}>
                            {photo ? (
                              <img
                                src={photo}
                                alt=""
                                style={{ width: '100%', height: '100%', borderRadius: 13, objectFit: 'cover' }}
                              />
                            ) : (
                              initials(name)
                            )}
                          </div>
                          <div>
                            <div className="sc-name">{name}</div>
                            <div className="sc-sub">
                              {r.current_class || '—'} · {adm ? `#${adm}` : '—'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="sc-status"
                            title={`${dStat} — open discipline`}
                            onClick={() => navigate(`/dashboard/admin/students/${r.student_id}#discipline`)}
                            style={{
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              background: 'transparent',
                              ...disciplineStatusDotStyle(dStat),
                              width: 10,
                              height: 10,
                            }}
                          />
                        </div>
                        <div className="student-card-body">
                          <div className="sc-row">
                            <span className="sc-row-label">Discipline</span>
                            <span className="sc-row-value">{dStat}</span>
                          </div>
                          <div className="sc-row">
                            <span className="sc-row-label">Teacher</span>
                            <span className="sc-row-value">{teacher || '—'}</span>
                          </div>
                          <div className="sc-row">
                            <span className="sc-row-label">Parent</span>
                            <span className="sc-row-value">{parentLabel}</span>
                          </div>
                          <div className="sc-row">
                            <span className="sc-row-label">Address</span>
                            <span className="sc-row-value">{addr || '—'}</span>
                          </div>
                          <div className="sc-row">
                            <span className="sc-row-label">Phone</span>
                            {phone ? (
                              <a href={`tel:${phone.replace(/\s/g, '')}`} className="sc-row-value phone">
                                📞 {phone}
                              </a>
                            ) : (
                              <span className="sc-row-value">—</span>
                            )}
                          </div>
                        </div>
                        <div className="student-card-foot">
                          <button
                            type="button"
                            className="sc-btn sc-btn-ghost"
                            onClick={() => navigate(`/dashboard/admin/students/${r.student_id}#discipline`)}
                          >
                            ⚖ Discipline
                          </button>
                          <button
                            type="button"
                            className="sc-btn sc-btn-primary"
                            onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                          >
                            Profile →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!loading && filteredSorted.length > 0 && (
                <div className="pagination" style={{ marginTop: 14 }}>
                  <div className="pagination-info">
                    Showing <strong>{startIdx}</strong>–<strong>{endIdx}</strong> of{' '}
                    <strong>{filteredSorted.length}</strong> students
                  </div>
                  <div className="pagination-btns">
                    <button
                      type="button"
                      className="page-btn"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`page-btn ${n === safePage ? 'active' : ''}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="page-btn"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {schoolId && (
        <>
          <StudentImportWizard
            isOpen={importOpen}
            onClose={() => setImportOpen(false)}
            schoolId={schoolId}
            schoolType={schoolType}
            onFinished={() => {
              void queryClient.invalidateQueries({ queryKey: adminQueryKeys.studentsDesign(user?.id ?? '') });
              void queryClient.invalidateQueries({
                queryKey: ['admin', 'student-import-batches', schoolId, user?.id],
              });
              void queryClient.invalidateQueries({ queryKey: ['admin', 'students', user?.id] });
            }}
          />
          <StudentExportDialog
            isOpen={exportOpen}
            onClose={() => setExportOpen(false)}
            schoolId={schoolId}
            schoolType={schoolType}
          />
          <StudentImportHistory isOpen={importHistoryOpen} onClose={() => setImportHistoryOpen(false)} schoolId={schoolId} />
        </>
      )}

      <NativeModal
        isOpen={addModalOpen}
        onClose={closeAddStudentModal}
        title="Add student"
        size="lg"
      >
        <AddStudentForm
          mode="modal"
          onCompleted={closeAddStudentModal}
          onCancel={closeAddStudentModal}
        />
      </NativeModal>
    </AdminPageWrapper>
  );
}
