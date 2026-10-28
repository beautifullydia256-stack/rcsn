import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '@/lib/supabase';
import { GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import SectionHeader from './SectionHeader';

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

  const { isTertiary, isSecondary } = useSchoolType();
  const unitLabel = isTertiary ? 'Programme' : isSecondary ? 'Class' : 'Class';
  const streamLabel = isTertiary ? 'Cohort / Stream' : 'Stream';
  const exampleText = isTertiary
    ? 'e.g. Diploma in Nursing — March Intake / August Intake'
    : isSecondary
    ? 'e.g. Senior 2 North / South'
    : 'e.g. Primary 5 Blue / Red';

  return (
    <div className="space-y-6">
      <SectionHeader
        embedded={embedded}
        title={isTertiary ? 'PROGRAMME COHORTS & STREAM REGISTRY' : 'CLASS STREAMS REGISTRY'}
        badge="COHORT DIVISION"
      />

      {/* Add stream form card */}
      <form onSubmit={addStream} className="gov-card p-5 space-y-4">
        <div className="border-b border-[#E2E8F0] pb-2 mb-2">
          <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
            {isTertiary ? 'REGISTER COHORT STREAM TO PROGRAMME' : 'REGISTER STREAM TO CLASS'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              {unitLabel.toUpperCase()}
            </label>
            <select
              className="gov-select w-full"
              value={formClass}
              onChange={(e) => setFormClass(e.target.value)}
              required
            >
              <option value="">{`Select ${unitLabel.toLowerCase()}…`}</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-mono uppercase font-bold text-[#555555]">
              {streamLabel.toUpperCase()} IDENTIFIER
            </label>
            <input
              className="gov-input w-full"
              placeholder={isTertiary ? "e.g. March Intake, Cohort A" : "e.g. West, East, A, B"}
              value={formStreamName}
              onChange={(e) => setFormStreamName(e.target.value)}
              required
            />
          </div>
          <div>
            <button type="submit" disabled={saving} className="gov-btn gov-btn-sm gov-btn-primary w-full h-[38px]">
              {saving ? 'SAVING…' : `+ ADD ${streamLabel.toUpperCase()}`}
            </button>
          </div>
        </div>
        {error && <p className="text-xs font-mono text-red-600">{error}</p>}
      </form>

      {/* Existing streams grouped by class */}
      {loading ? (
        <div className="py-8 flex items-center justify-center">
          <GovRollingBox size="md" />
        </div>
      ) : Object.keys(streamsByClass).length === 0 ? (
        <div className="gov-card p-8 text-center text-xs font-mono text-[#888888]">NO STREAMS CONFIGURED YET.</div>
      ) : (
        <div className="space-y-4">
          {Object.keys(streamsByClass)
            .sort()
            .map((className) => {
              const classStreams = streamsByClass[className];
              const isActive = classStreams.length >= 2;
              return (
                <div key={className} className="gov-card p-4">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 mb-3">
                    <h3 className="text-xs font-mono font-bold text-[#111111] uppercase">{className}</h3>
                    {isActive ? (
                      <span className="gov-tag gov-tag-approved text-[10px] font-mono uppercase">
                        ACTIVE STREAMING ({classStreams.length} DIVISIONS)
                      </span>
                    ) : (
                      <span className="gov-tag gov-tag-warned text-[10px] font-mono uppercase">
                        PENDING (MINIMUM 2 REQUIRED)
                      </span>
                    )}
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {classStreams.map((st) => (
                      <li
                        key={st.id}
                        className="flex items-center gap-2 rounded border border-[#CCCCCC] bg-[#FAFAFA] px-3 py-1 text-xs font-mono text-[#111111]"
                      >
                        <span className="font-bold">{st.stream_name}</span>
                        <button
                          className="text-[#888888] hover:text-red-600 text-xs ml-1 p-0.5 inline-flex items-center"
                          disabled={deletingId === st.id}
                          onClick={() => deleteStream(st.id, st.class_name, st.stream_name)}
                          title="Remove stream"
                        >
                          {deletingId === st.id ? '…' : <X className="w-3 h-3" />}
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
        <div className="gov-card p-5 space-y-3">
          <div className="border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
            <span className="text-xs font-mono uppercase font-bold text-[#111111] tracking-wider">
              UNALLOCATED TRAINEES
            </span>
            <span className="gov-tag gov-tag-warned text-[10px] font-mono">
              {unallocated.length} PENDING ALLOCATION
            </span>
          </div>
          <div className="space-y-2">
            {unallocated.map((s) => (
              <div
                key={s.student_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#E2E8F0] bg-[#FAFAFA] p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs font-mono text-[#111111] uppercase">{s.name}</p>
                  <p className="text-[11px] font-mono text-[#666666]">{s.current_class}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="gov-select text-xs w-auto"
                    value={pendingAlloc[s.student_id] ?? ''}
                    onChange={(e) =>
                      setPendingAlloc((prev) => ({ ...prev, [s.student_id]: e.target.value }))
                    }
                  >
                    <option value="">SELECT STREAM…</option>
                    {s.streamOptions.map((sn) => (
                      <option key={sn} value={sn}>{sn}</option>
                    ))}
                  </select>
                  <button
                    className="gov-btn gov-btn-sm gov-btn-primary"
                    disabled={!pendingAlloc[s.student_id] || savingAlloc === s.student_id}
                    onClick={() => saveAllocation(s.student_id, s.current_class)}
                  >
                    {savingAlloc === s.student_id ? 'SAVING…' : 'ASSIGN'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocated students by stream (per class) */}
      {!loading && activeStreamedClasses.length > 0 && (
        <div className="space-y-4">
          {activeStreamedClasses.sort().map((className) => {
            const classStreamNames = streamsByClass[className].map((s) => s.stream_name);
            const allocatedHere = students.filter(
              (s) =>
                s.current_class === className &&
                assignmentMap[`${className}::${s.student_id}`],
            );
            if (allocatedHere.length === 0) return null;
            return (
              <div key={`alloc-${className}`} className="gov-card p-5">
                <div className="border-b border-[#E2E8F0] pb-2 mb-3">
                  <h4 className="text-xs font-mono font-bold text-[#111111] uppercase">
                    {className} — STREAM ALLOCATION ROSTER
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classStreamNames.map((streamName) => {
                    const inStream = allocatedHere.filter(
                      (s) => assignmentMap[`${className}::${s.student_id}`] === streamName,
                    );
                    return (
                      <div key={streamName} className="border border-[#E2E8F0] p-3 rounded bg-[#FAFAFA]">
                        <p className="text-[11px] font-mono font-bold uppercase text-[#444444] mb-2 flex items-center justify-between border-b border-[#E2E8F0] pb-1">
                          <span>{streamName}</span>
                          <span className="font-bold text-[#111111]">({inStream.length})</span>
                        </p>
                        {inStream.length === 0 ? (
                          <p className="text-[11px] font-mono text-[#888888]">NO TRAINEES ALLOCATED</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {inStream.map((s) => (
                              <li
                                key={s.student_id}
                                className="flex items-center justify-between rounded border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-mono"
                              >
                                <span className="text-[#111111] font-medium">{s.name}</span>
                                <button
                                  className="text-[#888888] hover:text-red-600 text-xs p-0.5 inline-flex items-center"
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
                                  <X className="w-3 h-3" />
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
