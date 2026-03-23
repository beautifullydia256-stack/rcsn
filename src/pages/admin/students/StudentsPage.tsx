import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { displayParentsForStudent } from '@/lib/studentDisplayParents';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import {
  Settings,
  ChevronDown,
  UserPlus,
  Users,
  ArrowUpDown,
  Search,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  MoreHorizontal,
  Mail,
  Phone,
} from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

type SortKey = 'name' | 'parents' | 'teacher' | 'class' | 'email' | 'phone';

async function fetchStudentsList(userId: string) {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return { schoolType: null as 'Nursery/Primary' | 'Secondary' | null, rows: [] as any[], parentsByStudent: {} as Record<string, { name: string; email?: string; phone?: string }[]>, classTeacherNameByClass: {} as Record<string, string> };

  const [schoolRes, studentsRes, parentsRes, classTeachersRes] = await Promise.all([
    supabase.from('schools').select('type').eq('school_id', u.school_id).single(),
    supabase
      .from('students')
      .select('student_id, name, current_class, status, created_at, admission_number, address, guardian_address, guardian_name, guardian_email, guardian_phone')
      .eq('school_id', u.school_id)
      .order('created_at', { ascending: false }),
    supabase.from('parents').select('student_id, name, email, phone').eq('school_id', u.school_id),
    supabase.from('class_teachers').select('class_name, teacher_id').eq('school_id', u.school_id),
  ]);
  const schoolType = (schoolRes.data?.type as 'Nursery/Primary' | 'Secondary') || null;
  const rows = studentsRes.data || [];
  const parents = parentsRes.data || [];
  const parentsByStudent: Record<string, { name: string; email?: string; phone?: string }[]> = {};
  parents.forEach((p: any) => {
    const sid = p.student_id;
    if (!sid) return;
    if (!parentsByStudent[sid]) parentsByStudent[sid] = [];
    parentsByStudent[sid].push({ name: p.name || '', email: p.email, phone: p.phone });
  });

  let classTeacherNameByClass: Record<string, string> = {};
  if (!classTeachersRes.error && classTeachersRes.data?.length) {
    const classTeachers = classTeachersRes.data;
    const teacherIds = [...new Set(classTeachers.map((ct: any) => ct.teacher_id).filter(Boolean))];
    const teacherNameMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id).in('teacher_id', teacherIds);
      (teachers || []).forEach((t: any) => { teacherNameMap[t.teacher_id] = t.name || ''; });
    }
    classTeachers.forEach((ct: any) => {
      if (ct.class_name && ct.teacher_id) classTeacherNameByClass[ct.class_name] = teacherNameMap[ct.teacher_id] || '';
    });
  }

  return { schoolType, rows, parentsByStudent, classTeacherNameByClass };
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState('');
  const [klass, setKlass] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [displayOpen, setDisplayOpen] = useState(false);
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [expandedParent, setExpandedParent] = useState<{ studentId: string; parentIndex: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', user?.id ?? ''],
    queryFn: () => fetchStudentsList(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const rows = data?.rows ?? [];
  const schoolType = data?.schoolType ?? null;
  const parentsByStudent = data?.parentsByStudent ?? {};
  const classTeacherNameByClass = data?.classTeacherNameByClass ?? {};

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows;
    if (t) {
      out = out.filter((r) => {
        const parentsList = displayParentsForStudent(r.student_id, r, parentsByStudent);
        return (
          (r.name || '').toLowerCase().includes(t) ||
          (r.current_class || '').toLowerCase().includes(t) ||
          (r.guardian_name || '').toLowerCase().includes(t) ||
          parentsList.some((p) => p.name?.toLowerCase().includes(t))
        );
      });
    }
    if (klass) out = out.filter((r) => (r.current_class || '') === klass);
    return out;
  }, [q, klass, rows, parentsByStudent]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortKey) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'parents':
          aVal = (
            displayParentsForStudent(a.student_id, a, parentsByStudent)
              .map((p) => p.name)
              .join(', ') || ''
          ).toLowerCase();
          bVal = (
            displayParentsForStudent(b.student_id, b, parentsByStudent)
              .map((p) => p.name)
              .join(', ') || ''
          ).toLowerCase();
          break;
        case 'teacher':
          aVal = ('—').toLowerCase();
          bVal = ('—').toLowerCase();
          break;
        case 'class':
          aVal = (a.current_class || '').toLowerCase();
          bVal = (b.current_class || '').toLowerCase();
          break;
        case 'email':
          aVal = (displayParentsForStudent(a.student_id, a, parentsByStudent)[0]?.email || '—').toLowerCase();
          bVal = (displayParentsForStudent(b.student_id, b, parentsByStudent)[0]?.email || '—').toLowerCase();
          break;
        case 'phone':
          aVal = (displayParentsForStudent(a.student_id, a, parentsByStudent)[0]?.phone || '—').toLowerCase();
          bVal = (displayParentsForStudent(b.student_id, b, parentsByStudent)[0]?.phone || '—').toLowerCase();
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortOrder, parentsByStudent, classTeacherNameByClass]);

  const loading = isLoading && !data;

  const ThSort = ({ column, label }: { column: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-sm font-semibold ac-text-muted whitespace-nowrap cursor-pointer hover:bg-white/5 transition-colors border-r border-[var(--ac-border)] last:border-r-0"
      onClick={() => {
        setSortKey(column);
        setSortOrder((prev) => (sortKey === column ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
      }}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortKey === column ? (
          sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <span className="opacity-70"><ArrowUpDown className="w-4 h-4" /></span>
        )}
      </span>
    </th>
  );

  return (
    <AdminPageWrapper title="Students">
      <div className="space-y-4">
        {/* Toolbar – match screenshot */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setDisplayOpen(!displayOpen)}
              className="ac-glass-btn-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ac-text-primary hover:opacity-90"
            >
              <Settings className="w-4 h-4" />
              Display / Print
              <ChevronDown className="w-4 h-4" />
            </button>
            {displayOpen && (
              <div className="ac-glass-card absolute left-0 top-full mt-1 w-48 rounded-xl py-1 shadow-lg z-10 border">
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10" onClick={() => { window.print(); setDisplayOpen(false); }}>Print table</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-muted hover:bg-white/10" onClick={() => setDisplayOpen(false)}>Export (coming soon)</button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/students?add=1')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <UserPlus className="w-4 h-4" />
            + Add New
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/parents')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Users className="w-4 h-4" />
            + Add Family
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setGroupByOpen(!groupByOpen)}
              className="ac-glass-btn-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ac-text-primary hover:opacity-90"
            >
              Group By
              <ChevronDown className="w-4 h-4" />
            </button>
            {groupByOpen && (
              <div className="ac-glass-card absolute left-0 top-full mt-1 w-40 rounded-xl py-1 shadow-lg z-10 border">
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10" onClick={() => setGroupByOpen(false)}>None</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10" onClick={() => setGroupByOpen(false)}>Class</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10" onClick={() => setGroupByOpen(false)}>Status</button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="ac-glass-btn-secondary inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ac-text-primary hover:opacity-90"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sorting
              <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="ac-glass-card absolute left-0 top-full mt-1 w-44 rounded-xl py-1 shadow-lg z-10 border">
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10" onClick={() => { setSortKey('name'); setSortOrder('asc'); setSortOpen(false); }}>Name A–Z</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10" onClick={() => { setSortKey('name'); setSortOrder('desc'); setSortOpen(false); }}>Name Z–A</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10" onClick={() => { setSortKey('class'); setSortOrder('asc'); setSortOpen(false); }}>Class</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm ac-text-primary hover:bg-white/10" onClick={() => { setSortKey('name'); setSortOrder('desc'); setSortOpen(false); }}>Date enrolled</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium ac-text-secondary">Filter by class:</span>
            <select
              className="ac-input rounded-xl px-3 py-2 text-sm min-h-0"
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
            >
              <option value="">All Classes</option>
              {schoolType === 'Nursery/Primary' && (
                <>
                  <option value="Baby Class">Baby Class</option>
                  <option value="Middle Class">Middle Class</option>
                  <option value="Top Class">Top Class</option>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <option key={`P-${i}`} value={`Primary ${i + 1}`}>{`Primary ${i + 1}`}</option>
                  ))}
                </>
              )}
              {schoolType === 'Secondary' &&
                Array.from({ length: 6 }).map((_, i) => (
                  <option key={`S-${i}`} value={`Senior ${i + 1}`}>{`Senior ${i + 1}`}</option>
                ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ac-text-muted" />
              <input
                type="text"
                placeholder="Q Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="ac-glass-card ac-input w-full rounded-xl pl-9 pr-3 py-2 text-sm border min-h-0 placeholder:ac-text-muted"
              />
            </div>
          </div>
        </div>

        {/* Table – glass panel, theme-aware (no white in dark mode) */}
        <div className="ac-glass-card overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm ac-table-wrap">
              <thead>
                <tr>
                  <ThSort column="name" label="Student Name" />
                  <ThSort column="parents" label="Parents Names" />
                  <th className="px-4 py-3 text-left text-sm font-semibold ac-text-muted whitespace-nowrap border-r border-[var(--ac-border)] last:border-r-0">Address</th>
                  <ThSort column="teacher" label="Class Teacher" />
                  <ThSort column="class" label="Class" />
                  <ThSort column="email" label="Email" />
                  <ThSort column="phone" label="Phone" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b border-[var(--ac-border)]">
                      <td className="px-4 py-3 border-r border-[var(--ac-border)]"><div className="h-5 w-32 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-[var(--ac-border)]"><div className="h-5 w-24 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-[var(--ac-border)]"><div className="h-5 w-28 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-[var(--ac-border)]"><div className="h-5 w-20 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-[var(--ac-border)]"><div className="h-5 w-16 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-[var(--ac-border)]"><div className="h-5 w-28 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-[var(--ac-border)]"><div className="h-5 w-24 rounded ac-skeleton-block animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-8 w-20 rounded ac-skeleton-block animate-pulse" /></td>
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center ac-text-muted">No students found.</td></tr>
                ) : (
                  sorted.map((r, idx) => {
                    const parentsList = displayParentsForStudent(r.student_id, r, parentsByStudent);
                    const firstParent = parentsList[0];
                    const isExpanded = expandedParent?.studentId === r.student_id && expandedParent?.parentIndex !== undefined;
                    const clickedParent = isExpanded && parentsList[expandedParent.parentIndex] ? parentsList[expandedParent.parentIndex] : null;
                    const otherParents = clickedParent ? parentsList.filter((_, i) => i !== expandedParent!.parentIndex) : [];
                    return (
                      <Fragment key={r.student_id}>
                        <tr className="border-b border-[var(--ac-border)] hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 border-r border-[var(--ac-border)] ac-cell-primary">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="font-semibold ac-text-primary hover:text-emerald-500 hover:underline text-left"
                                onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                              >
                                {r.name || '—'}
                              </button>
                              <button type="button" className="p-0.5 ac-text-muted hover:opacity-100" aria-label="More"><MoreHorizontal className="w-4 h-4" /></button>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-[var(--ac-border)] ac-text-secondary">
                            {parentsList.length > 0 ? (
                              <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                {parentsList.map((p, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    className="hover:text-emerald-400 hover:underline cursor-pointer text-left ac-text-secondary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedParent((prev) =>
                                        prev?.studentId === r.student_id && prev?.parentIndex === pIdx
                                          ? null
                                          : { studentId: r.student_id, parentIndex: pIdx }
                                      );
                                    }}
                                  >
                                    {p.name || '—'}
                                  </button>
                                ))}
                              </span>
                            ) : (
                              <span className="ac-text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-[var(--ac-border)] ac-text-secondary">
                            {(r.address && r.address.trim()) || (r.guardian_address && r.guardian_address.trim()) ? (
                              <span className="truncate max-w-[200px] block" title={(r.address && r.address.trim()) || (r.guardian_address && r.guardian_address.trim()) || ''}>
                                {(r.address && r.address.trim()) || (r.guardian_address && r.guardian_address.trim()) || '—'}
                              </span>
                            ) : (
                              <span className="ac-text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-[var(--ac-border)] ac-text-secondary">{classTeacherNameByClass[r.current_class] || '—'}</td>
                          <td className="px-4 py-3 border-r border-[var(--ac-border)] ac-text-secondary">{r.current_class || '—'}</td>
                          <td className="px-4 py-3 border-r border-[var(--ac-border)]">
                            {firstParent?.email ? (
                              <span className="flex items-center gap-1 ac-text-secondary truncate max-w-[180px]" title={firstParent.email}>
                                <Mail className="w-3.5 h-3.5 flex-shrink-0 ac-text-muted" />
                                {firstParent.email}
                              </span>
                            ) : (
                              <span className="ac-text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-[var(--ac-border)]">
                            {firstParent?.phone ? (
                              <span className="flex items-center gap-1 ac-text-secondary truncate max-w-[140px]" title={firstParent.phone}>
                                <Phone className="w-3.5 h-3.5 flex-shrink-0 ac-text-muted" />
                                {firstParent.phone}
                              </span>
                            ) : (
                              <span className="ac-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && clickedParent && (
                          <tr key={`${r.student_id}-parent-${expandedParent.parentIndex}`}>
                            <td colSpan={7} className="p-0 border-b border-[var(--ac-border)] align-top bg-white/5">
                              <div className="px-6 py-6">
                                <div className="ac-glass-card rounded-2xl overflow-hidden border">
                                  <div className="p-6 sm:p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-6">
                                      <div className="lg:col-span-1">
                                        <h3 className="text-2xl font-bold ac-text-primary tracking-tight">{clickedParent.name || '—'}</h3>
                                        <div className="mt-3 flex items-center gap-3">
                                          {clickedParent.phone && (
                                            <a
                                              href={`tel:${clickedParent.phone.replace(/\s/g, '')}`}
                                              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-md"
                                              aria-label="Call"
                                            >
                                              <Phone className="h-5 w-5" />
                                            </a>
                                          )}
                                          {clickedParent.email && (
                                            <a
                                              href={`mailto:${clickedParent.email}`}
                                              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-md"
                                              aria-label="Email"
                                            >
                                              <Mail className="h-5 w-5" />
                                            </a>
                                          )}
                                        </div>
                                        {clickedParent.email && (
                                          <p className="mt-3 text-base ac-text-secondary break-all">{clickedParent.email}</p>
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium ac-text-muted uppercase tracking-wider mb-1">Phone number</p>
                                        <p className="text-xl font-bold ac-text-primary">
                                          {clickedParent.phone || '—'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium ac-text-muted uppercase tracking-wider mb-1">Pupil&apos;s name</p>
                                        <p className="text-lg font-semibold ac-text-primary">{r.name || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium ac-text-muted uppercase tracking-wider mb-1">Teacher</p>
                                        <p className="text-lg font-semibold ac-text-primary">
                                          {classTeacherNameByClass[r.current_class] || '—'} {r.current_class ? `(${r.current_class})` : ''}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="pt-5 border-t border-[var(--ac-border)] grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {otherParents.length > 0 && (
                                        <div>
                                          <p className="text-sm font-medium ac-text-muted uppercase tracking-wider mb-2">Other guardian(s)</p>
                                          <div className="space-y-2">
                                            {otherParents.map((op, i) => (
                                              <div key={i} className="flex flex-wrap items-baseline gap-2">
                                                <span className="text-base font-semibold ac-text-primary">{op.name}</span>
                                                {op.email && <span className="text-base ac-text-secondary">{op.email}</span>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      <div className={otherParents.length > 0 ? '' : 'md:col-span-2'}>
                                        <p className="text-sm font-medium ac-text-muted uppercase tracking-wider mb-1">Address</p>
                                        <p className="text-base ac-text-secondary leading-relaxed">
                                          {(r.address && r.address.trim()) || (r.guardian_address && r.guardian_address.trim()) || '—'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
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

      </div>
    </AdminPageWrapper>
  );
}
