import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { GitBranch, Search, CheckCircle, RefreshCw, Users } from 'lucide-react';

type Stream = { class_name: string; stream_name: string };
type Student = { student_id: string; name: string; current_class: string; admission_number: string };
type Assignment = { student_id: string; stream_name: string };

export default function StreamAllocationPage() {
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  // Use the already-hydrated store value — no extra DB round-trip needed
  const schoolId =
    schoolIdFromStore ??
    (user?.user_metadata?.school_id as string | undefined) ??
    null;

  const [allStreams, setAllStreams] = useState<Stream[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  // Per-row pending stream selection
  const [pendingStreams, setPendingStreams] = useState<Record<string, string>>({});
  // Selected student IDs (for bulk assign)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStream, setBulkStream] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Load all streams so we know which classes have streaming
  useEffect(() => {
    if (!schoolId) return;
    supabase
      .from('class_streams')
      .select('class_name, stream_name')
      .eq('school_id', schoolId)
      .order('class_name')
      .order('sort_order')
      .order('stream_name')
      .then(({ data }) => setAllStreams((data ?? []) as Stream[]));
  }, [schoolId]);

  const streamedClasses = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of allStreams) counts[s.class_name] = (counts[s.class_name] ?? 0) + 1;
    return Object.keys(counts)
      .filter((c) => counts[c] >= 2)
      .sort();
  }, [allStreams]);

  const streamsForClass = useMemo(
    () => allStreams.filter((s) => s.class_name === selectedClass).map((s) => s.stream_name),
    [allStreams, selectedClass],
  );

  const loadClassData = async (className: string) => {
    if (!schoolId || !className) return;
    setLoading(true);
    setPendingStreams({});
    setSelectedIds(new Set());
    setSelectAll(false);
    setBulkStream('');

    const [studRes, assignRes] = await Promise.all([
      supabase
        .from('students')
        .select('student_id, name, current_class, admission_number')
        .eq('school_id', schoolId)
        .eq('current_class', className)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('student_stream_assignments')
        .select('student_id, stream_name')
        .eq('school_id', schoolId)
        .eq('class_name', className),
    ]);
    setLoading(false);
    setStudents((studRes.data ?? []) as Student[]);
    setAssignments((assignRes.data ?? []) as Assignment[]);
  };

  useEffect(() => {
    if (selectedClass) void loadClassData(selectedClass);
  }, [selectedClass, schoolId]);

  const assignmentMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of assignments) m[a.student_id] = a.stream_name;
    return m;
  }, [assignments]);

  const unallocated = useMemo(
    () => students.filter((s) => !assignmentMap[s.student_id]),
    [students, assignmentMap],
  );

  const allocated = useMemo(() => {
    const byStream: Record<string, Student[]> = {};
    for (const s of students) {
      const sn = assignmentMap[s.student_id];
      if (!sn) continue;
      if (!byStream[sn]) byStream[sn] = [];
      byStream[sn].push(s);
    }
    return byStream;
  }, [students, assignmentMap]);

  const filteredUnallocated = useMemo(() => {
    const q = searchQ.toLowerCase();
    if (!q) return unallocated;
    return unallocated.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.admission_number ?? '').toLowerCase().includes(q),
    );
  }, [unallocated, searchQ]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(filteredUnallocated.map((s) => s.student_id)));
      setSelectAll(true);
    }
  }

  async function assignRow(studentId: string, streamName: string) {
    if (!schoolId || !streamName || !selectedClass) return;
    setSaving(true);
    const { error } = await supabase.from('student_stream_assignments').upsert(
      { school_id: schoolId, student_id: studentId, class_name: selectedClass, stream_name: streamName },
      { onConflict: 'school_id,student_id,class_name' },
    );
    setSaving(false);
    if (error) { alert(error.message); return; }
    setPendingStreams((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(studentId); return n; });
    setAssignments((prev) => [
      ...prev.filter((a) => a.student_id !== studentId),
      { student_id: studentId, stream_name: streamName },
    ]);
  }

  async function bulkAssign() {
    if (!schoolId || !bulkStream || selectedIds.size === 0 || !selectedClass) return;
    setSaving(true);
    const rows = Array.from(selectedIds).map((sid) => ({
      school_id: schoolId,
      student_id: sid,
      class_name: selectedClass,
      stream_name: bulkStream,
    }));
    const { error } = await supabase
      .from('student_stream_assignments')
      .upsert(rows, { onConflict: 'school_id,student_id,class_name' });
    setSaving(false);
    if (error) { alert(error.message); return; }
    const ids = new Set(selectedIds);
    setAssignments((prev) => [
      ...prev.filter((a) => !ids.has(a.student_id)),
      ...rows.map((r) => ({ student_id: r.student_id, stream_name: r.stream_name })),
    ]);
    setPendingStreams((prev) => {
      const n = { ...prev };
      ids.forEach((id) => delete n[id]);
      return n;
    });
    setSelectedIds(new Set());
    setSelectAll(false);
    setBulkStream('');
  }

  async function removeFromStream(studentId: string) {
    if (!schoolId || !selectedClass) return;
    await supabase
      .from('student_stream_assignments')
      .delete()
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('class_name', selectedClass);
    setAssignments((prev) =>
      prev.filter((a) => !(a.student_id === studentId)),
    );
  }

  const totalStudents = students.length;
  const allocatedCount = students.filter((s) => assignmentMap[s.student_id]).length;

  return (
    <AdminPageWrapper title="Stream Allocation">
      <div className="space-y-6">

        {/* Class selector */}
        <div className={adminCardClass}>
          <div className="flex items-center gap-3 mb-4">
            <GitBranch className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold ac-text-primary">Select Class</h2>
          </div>
          {streamedClasses.length === 0 ? (
            <p className="text-sm ac-text-muted">
              No streamed classes set up yet. Go to{' '}
              <a href="/dashboard/admin/settings/streams" className="text-purple-600 hover:underline">
                Settings → Class Streams
              </a>{' '}
              to add streams to a class first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {streamedClasses.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`rounded-xl border-2 px-5 py-3 text-sm font-semibold transition-all ${
                    selectedClass === cls
                      ? 'border-purple-500 bg-purple-500/15 text-purple-800 dark:text-purple-200'
                      : 'border-[var(--ac-border)] bg-[var(--ac-surface)] ac-text-primary hover:border-purple-400'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedClass && (
          <>
            {/* Stats row */}
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`${adminCardClass} text-center`}>
                  <p className="text-2xl font-bold ac-text-primary">{totalStudents}</p>
                  <p className="text-xs ac-text-muted mt-0.5">Total students</p>
                </div>
                <div className={`${adminCardClass} text-center`}>
                  <p className="text-2xl font-bold text-emerald-600">{allocatedCount}</p>
                  <p className="text-xs ac-text-muted mt-0.5">Allocated</p>
                </div>
                <div className={`${adminCardClass} text-center`}>
                  <p className="text-2xl font-bold text-amber-500">{unallocated.length}</p>
                  <p className="text-xs ac-text-muted mt-0.5">Unallocated</p>
                </div>
                <div className={`${adminCardClass} text-center`}>
                  <p className="text-2xl font-bold text-purple-600">{streamsForClass.length}</p>
                  <p className="text-xs ac-text-muted mt-0.5">Streams</p>
                </div>
              </div>
            )}

            {/* Unallocated students */}
            <div className={adminCardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold ac-text-primary">
                    Unallocated Students
                    {unallocated.length > 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {unallocated.length}
                      </span>
                    )}
                  </h3>
                  {loading && <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />}
                </div>
                <button
                  onClick={() => void loadClassData(selectedClass)}
                  disabled={loading}
                  className="ac-glass-btn-secondary px-3 py-2 text-sm"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-10 text-center ac-text-muted text-sm animate-pulse">Loading…</div>
              ) : unallocated.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                  <p className="font-medium ac-text-primary">All students are allocated!</p>
                  <p className="text-sm ac-text-muted mt-1">
                    Every student in {selectedClass} has been assigned to a stream.
                  </p>
                </div>
              ) : (
                <>
                  {/* Search + bulk bar */}
                  <div className="flex flex-wrap items-end gap-3 mb-4">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ac-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search by name or admission no."
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        className="ac-input pl-9 w-full text-sm"
                      />
                    </div>
                  </div>

                  {/* Bulk assign bar */}
                  {selectedIds.size > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3">
                      <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                        {selectedIds.size} selected
                      </span>
                      <select
                        className="ac-input text-sm"
                        value={bulkStream}
                        onChange={(e) => setBulkStream(e.target.value)}
                      >
                        <option value="">Assign to stream…</option>
                        {streamsForClass.map((sn) => (
                          <option key={sn} value={sn}>{sn}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => void bulkAssign()}
                        disabled={!bulkStream || saving}
                        className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
                      >
                        {saving ? 'Assigning…' : 'Assign All Selected'}
                      </button>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--ac-border)]">
                          <th className="py-3 px-2 text-left">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={toggleSelectAll}
                              className="text-purple-600"
                            />
                          </th>
                          <th className="py-3 px-2 text-left text-sm font-medium ac-text-secondary">Student</th>
                          <th className="py-3 px-2 text-left text-sm font-medium ac-text-secondary">Adm. No.</th>
                          <th className="py-3 px-2 text-left text-sm font-medium ac-text-secondary">Assign Stream</th>
                          <th className="py-3 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnallocated.map((s) => (
                          <tr key={s.student_id} className="border-b border-[var(--ac-border)] last:border-0">
                            <td className="py-3 px-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(s.student_id)}
                                onChange={() => toggleSelect(s.student_id)}
                                className="text-purple-600"
                              />
                            </td>
                            <td className="py-3 px-2 font-medium ac-text-primary">{s.name}</td>
                            <td className="py-3 px-2 text-sm ac-text-muted font-mono">
                              {s.admission_number || '—'}
                            </td>
                            <td className="py-3 px-2">
                              <select
                                className="ac-input py-1 px-3 text-sm min-w-[140px]"
                                value={pendingStreams[s.student_id] ?? ''}
                                onChange={(e) =>
                                  setPendingStreams((prev) => ({
                                    ...prev,
                                    [s.student_id]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Pick stream…</option>
                                {streamsForClass.map((sn) => (
                                  <option key={sn} value={sn}>{sn}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-2">
                              <button
                                disabled={!pendingStreams[s.student_id] || saving}
                                onClick={() => void assignRow(s.student_id, pendingStreams[s.student_id])}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                              >
                                Assign
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Stream Roster */}
            {!loading && allocatedCount > 0 && (
              <div className={adminCardClass}>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold ac-text-primary">
                    Stream Roster — {selectedClass}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {streamsForClass.map((streamName) => {
                    const inStream = allocated[streamName] ?? [];
                    return (
                      <div
                        key={streamName}
                        className="rounded-xl border border-[var(--ac-border)] bg-[var(--ac-surface)] overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-[var(--ac-border)] bg-purple-500/10 px-4 py-3">
                          <span className="font-bold ac-text-primary">{streamName}</span>
                          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                            {inStream.length} student{inStream.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {inStream.length === 0 ? (
                          <p className="px-4 py-4 text-sm ac-text-muted italic">No students yet</p>
                        ) : (
                          <ul className="divide-y divide-[var(--ac-border)]">
                            {inStream.map((s) => (
                              <li
                                key={s.student_id}
                                className="flex items-center justify-between px-4 py-2.5"
                              >
                                <div>
                                  <p className="text-sm font-medium ac-text-primary">{s.name}</p>
                                  {s.admission_number && (
                                    <p className="text-xs ac-text-muted font-mono">{s.admission_number}</p>
                                  )}
                                </div>
                                <button
                                  className="text-xs text-rose-400 hover:text-rose-600 ml-3 shrink-0"
                                  title="Remove from stream"
                                  onClick={() => void removeFromStream(s.student_id)}
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminPageWrapper>
  );
}
