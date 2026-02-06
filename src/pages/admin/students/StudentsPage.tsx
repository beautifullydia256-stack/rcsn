import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
  if (!u?.school_id) return { schoolType: null as 'Nursery/Primary' | 'Secondary' | null, rows: [] as any[], parentsByStudent: {} as Record<string, { name: string; email?: string; phone?: string }[]> };

  const [schoolRes, studentsRes, parentsRes] = await Promise.all([
    supabase.from('schools').select('type').eq('school_id', u.school_id).single(),
    supabase
      .from('students')
      .select('student_id, name, current_class, status, created_at, admission_number')
      .eq('school_id', u.school_id)
      .order('created_at', { ascending: false }),
    supabase.from('parents').select('student_id, name, email, phone').eq('school_id', u.school_id),
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
  return { schoolType, rows, parentsByStudent };
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

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows;
    if (t) out = out.filter((r) => (r.name || '').toLowerCase().includes(t) || (r.current_class || '').toLowerCase().includes(t) || (parentsByStudent[r.student_id]?.some((p) => p.name?.toLowerCase().includes(t))));
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
          aVal = (parentsByStudent[a.student_id]?.map((p) => p.name).join(', ') || '').toLowerCase();
          bVal = (parentsByStudent[b.student_id]?.map((p) => p.name).join(', ') || '').toLowerCase();
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
          aVal = (parentsByStudent[a.student_id]?.[0]?.email || '—').toLowerCase();
          bVal = (parentsByStudent[b.student_id]?.[0]?.email || '—').toLowerCase();
          break;
        case 'phone':
          aVal = (parentsByStudent[a.student_id]?.[0]?.phone || '—').toLowerCase();
          bVal = (parentsByStudent[b.student_id]?.[0]?.phone || '—').toLowerCase();
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortOrder, parentsByStudent]);

  const loading = isLoading && !data;

  const ThSort = ({ column, label }: { column: SortKey; label: string }) => (
    <th
      className="px-4 py-3 text-left text-sm font-semibold text-gray-800 whitespace-nowrap cursor-pointer hover:bg-teal-100/80 transition-colors border-r border-teal-200/60 last:border-r-0"
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
          <span className="text-teal-300"><ArrowUpDown className="w-4 h-4" /></span>
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
              Display / Print
              <ChevronDown className="w-4 h-4" />
            </button>
            {displayOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-10">
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { window.print(); setDisplayOpen(false); }}>Print table</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50" onClick={() => setDisplayOpen(false)}>Export (coming soon)</button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4" />
            + Add New
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/parents')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Users className="w-4 h-4" />
            + Add Family
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setGroupByOpen(!groupByOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Group By
              <ChevronDown className="w-4 h-4" />
            </button>
            {groupByOpen && (
              <div className="absolute left-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-10">
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => setGroupByOpen(false)}>None</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => setGroupByOpen(false)}>Class</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => setGroupByOpen(false)}>Status</button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sorting
              <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-10">
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setSortKey('name'); setSortOrder('asc'); setSortOpen(false); }}>Name A–Z</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setSortKey('name'); setSortOrder('desc'); setSortOpen(false); }}>Name Z–A</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setSortKey('class'); setSortOrder('asc'); setSortOpen(false); }}>Class</button>
                <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { setSortKey('name'); setSortOrder('desc'); setSortOpen(false); }}>Date enrolled</button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter by class:</span>
            <select
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Q Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Table – teal header, alternating rows, grid borders */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-teal-50 border-b-2 border-teal-100">
                  <ThSort column="name" label="Student Name" />
                  <ThSort column="parents" label="Parents Names" />
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-800 whitespace-nowrap border-r border-teal-200/60">Address</th>
                  <ThSort column="teacher" label="Class Teacher" />
                  <ThSort column="class" label="Class" />
                  <ThSort column="email" label="Email" />
                  <ThSort column="phone" label="Phone" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}`}>
                      <td className="px-4 py-3 border-r border-gray-100"><div className="h-5 w-32 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-gray-100"><div className="h-5 w-24 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-gray-100"><div className="h-5 w-28 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-gray-100"><div className="h-5 w-20 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-gray-100"><div className="h-5 w-16 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-gray-100"><div className="h-5 w-28 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="px-4 py-3 border-r border-gray-100"><div className="h-5 w-24 rounded bg-gray-200 animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-8 w-20 rounded bg-gray-200 animate-pulse" /></td>
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No students found.</td></tr>
                ) : (
                  sorted.map((r, idx) => {
                    const parentsList = parentsByStudent[r.student_id] || [];
                    const firstParent = parentsList[0];
                    const isExpanded = expandedParent?.studentId === r.student_id && expandedParent?.parentIndex !== undefined;
                    const clickedParent = isExpanded && parentsList[expandedParent.parentIndex] ? parentsList[expandedParent.parentIndex] : null;
                    const otherParents = clickedParent ? parentsList.filter((_, i) => i !== expandedParent!.parentIndex) : [];
                    return (
                      <Fragment key={r.student_id}>
                        <tr
                          className={`border-b border-gray-100 hover:bg-teal-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}`}
                        >
                          <td className="px-4 py-3 border-r border-gray-100">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="font-semibold text-gray-900 hover:text-green-600 hover:underline text-left"
                                onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}
                              >
                                {r.name || '—'}
                              </button>
                              <button type="button" className="p-0.5 text-gray-400 hover:text-gray-600" aria-label="More"><MoreHorizontal className="w-4 h-4" /></button>
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100 text-gray-700">
                            {parentsList.length > 0 ? (
                              <span className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                {parentsList.map((p, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    className="hover:text-green-600 hover:underline cursor-pointer text-left"
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
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100 text-gray-500">—</td>
                          <td className="px-4 py-3 border-r border-gray-100 text-gray-500">—</td>
                          <td className="px-4 py-3 border-r border-gray-100 text-gray-700">{r.current_class || '—'}</td>
                          <td className="px-4 py-3 border-r border-gray-100">
                            {firstParent?.email ? (
                              <span className="flex items-center gap-1 text-gray-700 truncate max-w-[180px]" title={firstParent.email}>
                                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                {firstParent.email}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-100">
                            {firstParent?.phone ? (
                              <span className="flex items-center gap-1 text-gray-700 truncate max-w-[140px]" title={firstParent.phone}>
                                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                                {firstParent.phone}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && clickedParent && (
                          <tr key={`${r.student_id}-parent-${expandedParent.parentIndex}`} className="bg-blue-50/80">
                            <td colSpan={7} className="px-4 py-4 border-b border-gray-100 align-top">
                              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                                <div className="flex flex-wrap items-start gap-4">
                                  <div>
                                    <h4 className="text-lg font-bold text-gray-900">{clickedParent.name || '—'}</h4>
                                    <div className="mt-2 flex items-center gap-2">
                                      {clickedParent.phone && (
                                        <a
                                          href={`tel:${clickedParent.phone.replace(/\s/g, '')}`}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
                                          aria-label="Call"
                                        >
                                          <Phone className="h-4 w-4" />
                                        </a>
                                      )}
                                      {clickedParent.email && (
                                        <a
                                          href={`mailto:${clickedParent.email}`}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
                                          aria-label="Email"
                                        >
                                          <Mail className="h-4 w-4" />
                                        </a>
                                      )}
                                    </div>
                                    {clickedParent.phone && (
                                      <p className="mt-1 text-sm text-gray-700">
                                        Phone number: {clickedParent.phone}
                                      </p>
                                    )}
                                    {clickedParent.email && (
                                      <p className="text-sm text-gray-700">
                                        {clickedParent.name}: {clickedParent.email}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1 text-sm text-gray-700">
                                    <p><span className="font-medium text-gray-500">Pupil&apos;s name:</span> {r.name || '—'}</p>
                                    {otherParents.length > 0 && (
                                      otherParents.map((op, i) => (
                                        <p key={i}>
                                          <span className="font-medium text-gray-500">Other parent:</span> {op.name}{op.email ? ` — ${op.email}` : ''}
                                        </p>
                                      ))
                                    )}
                                    <p><span className="font-medium text-gray-500">Class Teacher:</span> — {(r.current_class && `(${r.current_class})`) || ''}</p>
                                    <p><span className="font-medium text-gray-500">Address:</span> —</p>
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
