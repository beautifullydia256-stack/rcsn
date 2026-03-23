import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { displayParentsForStudent, type ParentLite } from '@/lib/studentDisplayParents';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { SkeletonKPIStrip, SkeletonTable } from '@/components/PwezaSkeleton';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import NativeModal from '@/components/NativeModal';
import { AddStudentForm } from './AddStudentForm';
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

import '@/assets/pwezacore-students-scoped.css';

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
  created_at?: string | null;
};

export type StudentsFetchResult = {
  rows: StudentListRow[];
  parentsByStudent: Record<string, ParentLite[]>;
  classTeacherNameByClass: Record<string, string>;
  attendedTodayCount: number;
  photoByStudentId: Record<string, string>;
  attendanceTodayByStudentId: Record<string, 'present' | 'absent'>;
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

type SortKey = 'name-asc' | 'name-desc' | 'class' | 'recent';

export async function fetchStudentsContext(userId: string): Promise<StudentsFetchResult> {
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
    studentsByParentId: studentsByParentId,
  };
}

export default function DesignStudentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? 'grid' : 'list'
  );
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

  const { data, isPending } = useQuery({
    queryKey: adminQueryKeys.studentsDesign(user?.id ?? ''),
    queryFn: () => fetchStudentsContext(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
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
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                🖨 Print
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => alert('Export is coming soon.')}>
                ⬇ Export
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

          <div className="toolbar fade-up d2 print:hidden">
            <div className="search-bar">
              <span style={{ color: 'var(--t3)', fontSize: 14 }}>🔍</span>
              <input
                placeholder="Search by name, class, or parent…"
                type="search"
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
            <div className="view-toggle">
              <button
                type="button"
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                ≡ List
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ⊞ Grid
              </button>
            </div>
          </div>

          {viewMode === 'list' && (
            <div className="fade-up d3">
              <div className="table-wrap">
                <div className="table-head">
                  <div className="th active">
                    Student <span className="sort-ic">▲</span>
                  </div>
                  <div className="th">Parent / Guardian</div>
                  <div className="th">Class</div>
                  <div className="th">Class Teacher</div>
                  <div className="th">Address</div>
                  <div className="th">Phone</div>
                  <div className="th" style={{ justifyContent: 'flex-end' }}>
                    Actions
                  </div>
                </div>

                {loading ? (
                  <div className="empty-state">
                    <div className="empty-icon">⏳</div>
                    <div className="empty-title">Loading students…</div>
                  </div>
                ) : filteredSorted.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🧑‍🎓</div>
                    <div className="empty-title">No students match your filters.</div>
                    <div className="empty-sub">Try adjusting search or class filter.</div>
                  </div>
                ) : (
                  pageSlice.map((r, idx) => {
                    const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                    const parents = displayParentsForStudent(r.student_id, r, parentsByStudent);
                    const parentLine = parents.map((p) => p.name).filter(Boolean).join(', ') || '';
                    const first = parents[0];
                    const phone = (first?.phone || r.guardian_phone || '').trim();
                    const addr =
                      (r.address && r.address.trim()) || (r.guardian_address && r.guardian_address.trim()) || '';
                    const teacher = classTeacherNameByClass[r.current_class || ''] || '';
                    const name = displayFullName(r);
                    const adm = r.admission_number?.trim();
                    const chipMod = classChipModifier(r.current_class);
                    const chipCls = chipMod ? `class-chip ${chipMod}` : 'class-chip';
                    const photo = photoByStudentId[r.student_id];
                    const filterName = name.toLowerCase();
                    const filterClass = (r.current_class || '').toLowerCase();

                    return (
                      <div
                        key={r.student_id}
                        className="table-row"
                        data-name={filterName}
                        data-class={filterClass}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/dashboard/admin/students/${r.student_id}`);
                          }
                        }}
                      >
                        <div className="td">
                          <div className="student-cell">
                            <div className="student-av" style={photo ? undefined : { background: gradAt(globalIdx) }}>
                              {photo ? (
                                <img src={photo} alt="" />
                              ) : (
                                initials(name)
                              )}
                            </div>
                            <div>
                              <div className="student-name">{name}</div>
                              <div className="student-sub">
                                {adm ? `Admission #${adm}` : '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`td ${parentLine ? '' : 'muted'}`}>{parentLine || '—'}</div>
                        <div className="td">
                          {r.current_class ? (
                            <span className={chipCls}>{r.current_class}</span>
                          ) : (
                            <div className="td muted">—</div>
                          )}
                        </div>
                        <div className={`td ${teacher ? '' : 'muted'}`}>{teacher || '—'}</div>
                        <div className={`td ${addr ? '' : 'muted'}`}>{addr || '—'}</div>
                        <div className="td" onClick={(e) => e.stopPropagation()}>
                          {phone ? (
                            <a href={`tel:${phone.replace(/\s/g, '')}`} className="phone-link">
                              📞 {phone}
                            </a>
                          ) : (
                            <div className="td muted">—</div>
                          )}
                        </div>
                        <div className="td" onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="row-btn"
                              title="View profile"
                              onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                            >
                              👁
                            </button>
                            <button
                              type="button"
                              className="row-btn arrow"
                              title="Open profile"
                              onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                            >
                              ›
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {!loading && filteredSorted.length > 0 && (
                  <div className="pagination print:hidden">
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
                        aria-label="Previous page"
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
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
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
                          <div className="sc-status" title="Active" />
                        </div>
                        <div className="student-card-body">
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
                            onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                          >
                            👁 View
                          </button>
                          <button
                            type="button"
                            className="sc-btn sc-btn-primary"
                            onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                          >
                            Open Profile →
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
          )}
        </div>
      </div>

      <NativeModal
        isOpen={addModalOpen}
        onClose={closeAddStudentModal}
        title="Add student"
        size="xl"
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
