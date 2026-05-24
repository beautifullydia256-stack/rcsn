import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

type EnrolledPerson = {
  person_id: string;
  name: string;
  class_or_role: string;
  device_user_id: string | null;
  device_name: string | null;
  active: boolean;
  mapping_id: string | null;
};

type Tab = 'students' | 'teachers';

export default function BiometricEnrollmentPage() {
  const user = useAuthStore((s) => s.user);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('students');
  const [people, setPeople] = useState<EnrolledPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDeviceUserId, setEditDeviceUserId] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('users').select('school_id').eq('user_id', user.id).single()
      .then(({ data }) => setSchoolId(data?.school_id ?? null));
  }, [user?.id]);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    loadPeople(schoolId, tab).then(setPeople).catch(() => setError('Failed to load.')).finally(() => setLoading(false));
  }, [schoolId, tab]);

  async function loadPeople(sid: string, t: Tab): Promise<EnrolledPerson[]> {
    const mappings = await supabase
      .from('biometric_device_users')
      .select('id, person_id, device_user_id, device_name, active')
      .eq('school_id', sid)
      .eq('person_type', t === 'students' ? 'student' : 'teacher');

    const mappingMap = new Map<string, { id: string; device_user_id: string; device_name: string | null; active: boolean }>();
    for (const m of mappings.data ?? []) {
      mappingMap.set(m.person_id, { id: m.id, device_user_id: m.device_user_id, device_name: m.device_name, active: m.active });
    }

    if (t === 'students') {
      const { data } = await supabase
        .from('students')
        .select('student_id, name, current_class')
        .eq('school_id', sid)
        .eq('status', 'active')
        .order('name');
      return (data ?? []).map((s) => {
        const m = mappingMap.get(s.student_id);
        return { person_id: s.student_id, name: s.name, class_or_role: s.current_class ?? '', device_user_id: m?.device_user_id ?? null, device_name: m?.device_name ?? null, active: m?.active ?? true, mapping_id: m?.id ?? null };
      });
    } else {
      const { data } = await supabase
        .from('teachers')
        .select('teacher_id, name, subject')
        .eq('school_id', sid)
        .order('name');
      return (data ?? []).map((t) => {
        const m = mappingMap.get(t.teacher_id);
        return { person_id: t.teacher_id, name: t.name, class_or_role: t.subject ?? 'Teacher', device_user_id: m?.device_user_id ?? null, device_name: m?.device_name ?? null, active: m?.active ?? true, mapping_id: m?.id ?? null };
      });
    }
  }

  function openEdit(p: EnrolledPerson) {
    setEditId(p.person_id);
    setEditDeviceUserId(p.device_user_id ?? '');
    setEditDeviceName(p.device_name ?? '');
    setError(null);
  }

  async function saveEnrollment() {
    if (!schoolId || !editId) return;
    setSaving(true);
    setError(null);
    const person = people.find((p) => p.person_id === editId)!;
    const deviceId = editDeviceUserId.trim();

    try {
      if (!deviceId) {
        // Remove enrollment
        if (person.mapping_id) {
          const { error: e } = await supabase.from('biometric_device_users').delete().eq('id', person.mapping_id);
          if (e) throw e;
        }
      } else if (person.mapping_id) {
        // Update existing
        const { error: e } = await supabase.from('biometric_device_users')
          .update({ device_user_id: deviceId, device_name: editDeviceName || null })
          .eq('id', person.mapping_id);
        if (e) throw e;
      } else {
        // New enrollment
        const { error: e } = await supabase.from('biometric_device_users').insert({
          school_id: schoolId,
          device_user_id: deviceId,
          person_type: tab === 'students' ? 'student' : 'teacher',
          person_id: editId,
          device_name: editDeviceName || null,
        });
        if (e) throw e;
      }
      // Refresh
      const updated = await loadPeople(schoolId, tab);
      setPeople(updated);
      setEditId(null);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Save failed';
      setError(msg.includes('unique') ? 'That Device User ID is already assigned to someone else.' : msg);
    } finally {
      setSaving(false);
    }
  }

  const filtered = search.trim()
    ? people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.device_user_id ?? '').includes(search))
    : people;

  const enrolled   = filtered.filter((p) => p.device_user_id);
  const unenrolled = filtered.filter((p) => !p.device_user_id);

  return (
    <div className="min-h-screen bg-gray-950 p-4 text-gray-100 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-emerald-400">Biometric Enrollment</h1>
          <p className="mt-1 text-sm text-gray-400">
            Link each student or teacher to their Device User ID registered on the fingerprint terminal.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-gray-800">
          {(['students', 'teachers'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(''); setEditId(null); }}
              className={`px-5 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-emerald-400 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search by name or Device User ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-sm text-red-300">{error}</div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading…</div>
        ) : (
          <div className="space-y-6">
            {/* Enrolled */}
            {enrolled.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                  Enrolled ({enrolled.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900 text-left text-xs text-gray-400">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">{tab === 'students' ? 'Class' : 'Role'}</th>
                        <th className="px-4 py-3">Device User ID</th>
                        <th className="px-4 py-3">Terminal</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrolled.map((p) => (
                        <tr key={p.person_id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-gray-400">{p.class_or_role}</td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-emerald-900/40 px-2 py-0.5 font-mono text-emerald-300">
                              {p.device_user_id}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{p.device_name || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded px-3 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Not enrolled */}
            {unenrolled.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Not Yet Enrolled ({unenrolled.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900 text-left text-xs text-gray-400">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">{tab === 'students' ? 'Class' : 'Role'}</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {unenrolled.map((p) => (
                        <tr key={p.person_id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-gray-400">{p.class_or_role}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded bg-emerald-800/30 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-800/60"
                            >
                              Assign ID
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-500">No {tab} found.</div>
            )}
          </div>
        )}
      </div>

      {/* Edit / Assign Modal */}
      {editId && (() => {
        const person = people.find((p) => p.person_id === editId);
        if (!person) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
              <h2 className="mb-1 text-lg font-semibold text-gray-100">
                {person.device_user_id ? 'Edit Enrollment' : 'Assign Device User ID'}
              </h2>
              <p className="mb-5 text-sm text-gray-400">{person.name}</p>

              <label className="mb-4 block">
                <span className="mb-1 block text-xs font-medium text-gray-400">
                  Device User ID <span className="text-gray-500">(the number registered on the Hikvision terminal)</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  value={editDeviceUserId}
                  onChange={(e) => setEditDeviceUserId(e.target.value)}
                  placeholder="e.g. 104"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-gray-100 placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
              </label>

              <label className="mb-5 block">
                <span className="mb-1 block text-xs font-medium text-gray-400">
                  Terminal name <span className="text-gray-500">(optional, e.g. "Main Gate")</span>
                </span>
                <input
                  type="text"
                  value={editDeviceName}
                  onChange={(e) => setEditDeviceName(e.target.value)}
                  placeholder="e.g. Main Gate"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-600 focus:border-emerald-500 focus:outline-none"
                />
              </label>

              {error && (
                <div className="mb-4 rounded border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</div>
              )}

              {person.device_user_id && (
                <p className="mb-4 text-xs text-gray-500">
                  Leave Device User ID blank and save to remove this person's enrollment.
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setEditId(null); setError(null); }}
                  className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEnrollment}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
