import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { settingsInsetSurface, settingsPrimaryActionClass } from './settingsTabStyles';

type Stream = { id: string; class_name: string; stream_name: string; sort_order: number };
type Student = { student_id: string; name: string; current_class: string };
type Assignment = { student_id: string; class_name: string; stream_name: string };

export default function SettingsClassStreams({
  schoolId,
  classOptions,
  embedded,
}: {
  schoolId: string | null;
  classOptions: string[];
  embedded?: boolean;
}) {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add stream form
  const [formClass, setFormClass] = useState('');
  const [formStreamName, setFormStreamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Allocation state: studentId → chosen stream
  const [pendingAlloc, setPendingAlloc] = useState<Record<string, string>>({});
  const [savingAlloc, setSavingAlloc] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    load();
  }, [schoolId]);

  async function load() {
    setLoading(true);
    const [streamsRes, studentsRes, allocRes] = await Promise.all([
      supabase
        .from('class_streams')
        .select('id, class_name, stream_name, sort_order')
        .eq('school_id', schoolId!)
        .order('class_name')
        .order('sort_order')
        .order('stream_name'),
      supabase
        .from('students')
        .select('student_id, name, current_class')
        .eq('school_id', schoolId!)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('student_stream_assignments')
        .select('student_id, class_name, stream_name')
        .eq('school_id', schoolId!),
    ]);
    setLoading(false);
    if (streamsRes.error) { setError(streamsRes.error.message); return; }
    setStreams((streamsRes.data ?? []) as Stream[]);
    setStudents((studentsRes.data ?? []) as Student[]);
    setAssignments((allocRes.data ?? []) as Assignment[]);
  }

  const streamsByClass = streams.reduce<Record<string, Stream[]>>((acc, s) => {
    if (!acc[s.class_name]) acc[s.class_name] = [];
    acc[s.class_name].push(s);
    return acc;
  }, {});

  const assignmentMap = assignments.reduce<Record<string, string>>((acc, a) => {
    acc[`${a.class_name}::${a.student_id}`] = a.stream_name;
    return acc;
  }, {});

  async function addStream(e: React.FormEvent) {
    e.preventDefault();
    if (!formClass || !formStreamName.trim()) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('class_streams').insert({
      school_id: schoolId!,
      class_name: formClass,
      stream_name: formStreamName.trim(),
      sort_order: (streamsByClass[formClass]?.length ?? 0),
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setFormStreamName('');
    load();
  }

  async function deleteStream(id: string, className: string, streamName: string) {
    // Check if any students are in this stream
    const assigned = assignments.filter(
      (a) => a.class_name === className && a.stream_name === streamName,
    );
    if (assigned.length > 0) {
      if (!window.confirm(`${assigned.length} student(s) are in this stream. Delete anyway? Their stream assignment will be cleared.`)) return;
      await supabase
        .from('student_stream_assignments')
        .delete()
        .eq('school_id', schoolId!)
        .eq('class_name', className)
        .eq('stream_name', streamName);
    }
    setDeletingId(id);
    await supabase.from('class_streams').delete().eq('id', id);
    setDeletingId(null);
    load();
  }

  async function saveAllocation(studentId: string, className: string) {
    const streamName = pendingAlloc[studentId];
    if (!streamName) return;
    setSavingAlloc(studentId);
    const { error: err } = await supabase
      .from('student_stream_assignments')
      .upsert(
        { school_id: schoolId!, student_id: studentId, class_name: className, stream_name: streamName },
        { onConflict: 'school_id,student_id,class_name' },
      );
    setSavingAlloc(null);
    if (err) { setError(err.message); return; }
    setPendingAlloc((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
    setAssignments((prev) => {
      const filtered = prev.filter((a) => !(a.student_id === studentId && a.class_name === className));
      return [...filtered, { student_id: studentId, class_name: className, stream_name: streamName }];
    });
  }

  // Classes that have ≥2 streams (streaming is "active")
  const activeStreamedClasses = Object.keys(streamsByClass).filter(
    (c) => streamsByClass[c].length >= 2,
  );

  // Students in a streamed class who haven't been assigned a stream yet
  const unallocated = activeStreamedClasses.flatMap((className) =>
    students
      .filter(
        (s) =>
          s.current_class === className &&
          !assignmentMap[`${className}::${s.student_id}`],
      )
      .map((s) => ({ ...s, streamOptions: streamsByClass[className].map((st) => st.stream_name) })),
  );

  return (
    <div className={embedded ? 'p-4 md:p-6 space-y-8' : 'space-y-8'}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold ac-text-primary">Class Streams</h2>
        <p className="text-sm ac-text-muted mt-0.5">
          Split a class into streams (e.g. Primary 7 West / East). Teachers and timetables will
          work per-stream. Reports are still generated per base class.
        </p>
      </div>

      {/* Add stream form */}
      <form onSubmit={addStream} className={`${settingsInsetSurface} p-4 space-y-4`}>
        <p className="text-sm font-medium ac-text-primary">Add a stream to a class</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            className="ac-input w-full"
            value={formClass}
            onChange={(e) => setFormClass(e.target.value)}
            required
          >
            <option value="">Select class…</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            className="ac-input w-full"
            placeholder="Stream name (e.g. West, East, A, B)"
            value={formStreamName}
            onChange={(e) => setFormStreamName(e.target.value)}
            required
          />
          <button type="submit" disabled={saving} className={settingsPrimaryActionClass}>
            {saving ? 'Saving…' : '+ Add Stream'}
          </button>
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <p className="text-xs ac-text-muted">
          A class needs at least 2 streams before streaming is activated.
        </p>
      </form>

      {/* Existing streams grouped by class */}
      {loading ? (
        <p className="text-sm ac-text-muted">Loading…</p>
      ) : Object.keys(streamsByClass).length === 0 ? (
        <p className="text-sm ac-text-muted">No streams set up yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.keys(streamsByClass)
            .sort()
            .map((className) => {
              const classStreams = streamsByClass[className];
              const isActive = classStreams.length >= 2;
              return (
                <div key={className} className={settingsInsetSurface + ' p-4'}>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold ac-text-primary">{className}</h3>
                    {isActive ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Need ≥2 streams
                      </span>
                    )}
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {classStreams.map((st) => (
                      <li
                        key={st.id}
                        className="flex items-center gap-2 rounded-full border border-[var(--ac-border)] bg-[var(--ac-surface)] px-3 py-1.5 text-sm font-medium ac-text-primary"
                      >
                        {st.stream_name}
                        <button
                          className="text-rose-400 hover:text-rose-600 text-xs ml-1"
                          disabled={deletingId === st.id}
                          onClick={() => deleteStream(st.id, st.class_name, st.stream_name)}
                          title="Remove stream"
                        >
                          {deletingId === st.id ? '…' : '✕'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </div>
      )}

      {/* Unallocated students */}
      {!loading && unallocated.length > 0 && (
        <div>
          <h3 className="text-base font-semibold ac-text-primary mb-1">Unallocated Students</h3>
          <p className="text-sm ac-text-muted mb-4">
            These students are in a streamed class but haven't been assigned to a stream yet.
          </p>
          <div className="space-y-2">
            {unallocated.map((s) => (
              <div
                key={s.student_id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--ac-border)] bg-[var(--ac-surface)] px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium ac-text-primary text-sm">{s.name}</p>
                  <p className="text-xs ac-text-muted">{s.current_class}</p>
                </div>
                <select
                  className="ac-input text-sm"
                  value={pendingAlloc[s.student_id] ?? ''}
                  onChange={(e) =>
                    setPendingAlloc((prev) => ({ ...prev, [s.student_id]: e.target.value }))
                  }
                >
                  <option value="">Pick stream…</option>
                  {s.streamOptions.map((sn) => (
                    <option key={sn} value={sn}>{sn}</option>
                  ))}
                </select>
                <button
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  disabled={!pendingAlloc[s.student_id] || savingAlloc === s.student_id}
                  onClick={() => saveAllocation(s.student_id, s.current_class)}
                >
                  {savingAlloc === s.student_id ? 'Saving…' : 'Assign'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocated students by stream (per class) */}
      {!loading && activeStreamedClasses.length > 0 && (
        <div className="space-y-6">
          {activeStreamedClasses.sort().map((className) => {
            const classStreamNames = streamsByClass[className].map((s) => s.stream_name);
            const allocatedHere = students.filter(
              (s) =>
                s.current_class === className &&
                assignmentMap[`${className}::${s.student_id}`],
            );
            if (allocatedHere.length === 0) return null;
            return (
              <div key={`alloc-${className}`} className={settingsInsetSurface + ' p-4'}>
                <h4 className="font-semibold ac-text-primary mb-3">{className} — Stream Roster</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classStreamNames.map((streamName) => {
                    const inStream = allocatedHere.filter(
                      (s) => assignmentMap[`${className}::${s.student_id}`] === streamName,
                    );
                    return (
                      <div key={streamName}>
                        <p className="text-xs font-bold uppercase tracking-wide ac-text-muted mb-2">
                          {streamName} ({inStream.length})
                        </p>
                        {inStream.length === 0 ? (
                          <p className="text-xs ac-text-muted italic">No students yet</p>
                        ) : (
                          <ul className="space-y-1">
                            {inStream.map((s) => (
                              <li
                                key={s.student_id}
                                className="flex items-center justify-between rounded-lg border border-[var(--ac-border)] bg-[var(--ac-surface)] px-3 py-2"
                              >
                                <span className="text-sm ac-text-primary">{s.name}</span>
                                <button
                                  className="text-xs text-rose-400 hover:text-rose-600"
                                  onClick={async () => {
                                    await supabase
                                      .from('student_stream_assignments')
                                      .delete()
                                      .eq('school_id', schoolId!)
                                      .eq('student_id', s.student_id)
                                      .eq('class_name', className);
                                    setAssignments((prev) =>
                                      prev.filter(
                                        (a) =>
                                          !(
                                            a.student_id === s.student_id &&
                                            a.class_name === className
                                          ),
                                      ),
                                    );
                                  }}
                                  title="Remove from stream"
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
            );
          })}
        </div>
      )}
    </div>
  );
}
