import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import {
  Fingerprint,
  Users,
  GraduationCap,
  Briefcase,
  Search,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  RefreshCw,
  Plus,
  Check,
} from 'lucide-react';
import NativeModal from '@/components/NativeModal';
import { GovPageLoader, GovRollingBox, GovTableLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterEnrollment, setFilterEnrollment] = useState<'all' | 'enrolled' | 'unenrolled'>('all');

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('school_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setSchoolId(data?.school_id ?? null));
  }, [user?.id]);

  useEffect(() => {
    if (!schoolId) return;
    refreshData();
  }, [schoolId, tab]);

  async function refreshData() {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loadPeople(schoolId, tab);
      setPeople(res);
    } catch {
      setError('Failed to communicate with institutional personnel roster.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPeople(sid: string, currentTab: Tab): Promise<EnrolledPerson[]> {
    const mappings = await supabase
      .from('biometric_device_users')
      .select('id, person_id, device_user_id, device_name, active')
      .eq('school_id', sid)
      .eq('person_type', currentTab === 'students' ? 'student' : 'teacher');

    const mappingMap = new Map<
      string,
      { id: string; device_user_id: string; device_name: string | null; active: boolean }
    >();
    for (const m of mappings.data ?? []) {
      mappingMap.set(m.person_id, {
        id: m.id,
        device_user_id: m.device_user_id,
        device_name: m.device_name,
        active: m.active,
      });
    }

    if (currentTab === 'students') {
      const { data } = await supabase
        .from('students')
        .select('student_id, name, current_class')
        .eq('school_id', sid)
        .eq('status', 'active')
        .order('name');
      return (data ?? []).map((s) => {
        const m = mappingMap.get(s.student_id);
        return {
          person_id: s.student_id,
          name: s.name,
          class_or_role: s.current_class ?? '',
          device_user_id: m?.device_user_id ?? null,
          device_name: m?.device_name ?? null,
          active: m?.active ?? true,
          mapping_id: m?.id ?? null,
        };
      });
    } else {
      const { data } = await supabase
        .from('teachers')
        .select('teacher_id, name, subject')
        .eq('school_id', sid)
        .order('name');
      return (data ?? []).map((tch) => {
        const m = mappingMap.get(tch.teacher_id);
        return {
          person_id: tch.teacher_id,
          name: tch.name,
          class_or_role: tch.subject ?? 'Faculty / Clinical Mentor',
          device_user_id: m?.device_user_id ?? null,
          device_name: m?.device_name ?? null,
          active: m?.active ?? true,
          mapping_id: m?.id ?? null,
        };
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
          const { error: e } = await supabase
            .from('biometric_device_users')
            .delete()
            .eq('id', person.mapping_id);
          if (e) throw e;
        }
      } else if (person.mapping_id) {
        // Update existing
        const { error: e } = await supabase
          .from('biometric_device_users')
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
      const updated = await loadPeople(schoolId, tab);
      setPeople(updated);
      setEditId(null);
      setSuccessMsg(`Hardware Terminal User ID mapped for ${person.name}.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Save failed';
      setError(
        msg.includes('unique')
          ? 'That Terminal Device User ID is already allocated to another institutional record.'
          : msg
      );
    } finally {
      setSaving(false);
    }
  }

  // Filter & Search
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.device_user_id ?? '').includes(search) ||
        p.class_or_role.toLowerCase().includes(search.toLowerCase());
      const matchEnroll =
        filterEnrollment === 'all' ||
        (filterEnrollment === 'enrolled' && !!p.device_user_id) ||
        (filterEnrollment === 'unenrolled' && !p.device_user_id);
      return matchSearch && matchEnroll;
    });
  }, [people, search, filterEnrollment]);

  // Statistics
  const stats = useMemo(() => {
    const total = people.length;
    const enrolledCount = people.filter((p) => !!p.device_user_id).length;
    const unenrolledCount = total - enrolledCount;
    const rate = total > 0 ? Math.round((enrolledCount / total) * 100) : 0;
    return { total, enrolledCount, unenrolledCount, rate };
  }, [people]);

  const activePerson = people.find((p) => p.person_id === editId);

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            BIOMETRIC HARDWARE ENROLLMENT REGISTRY
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            CAMPUS TERMINAL USER MAPPING &amp; TIMEKEEPING SYNCHRONIZATION
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshData}
            disabled={loading}
            className="gov-btn gov-btn-sm flex items-center gap-1.5"
            title="Refresh Personnel Mapping"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>SYNC ROSTER</span>
          </button>
        </div>
      </div>

      {/* Toast Alerts */}
      {error && (
        <div className="border border-rose-300 bg-rose-50 p-3 text-xs font-mono text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-rose-700 hover:text-rose-950 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="border border-emerald-300 bg-emerald-50 p-3 text-xs font-mono text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TOTAL ROSTER
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            ACTIVE {tab === 'students' ? 'TRAINEES' : 'FACULTY'}
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ENROLLED ON TERMINAL
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {stats.enrolledCount.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            HARDWARE USER ID MAPPED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            PENDING ENROLLMENT
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
            {stats.unenrolledCount.toLocaleString()}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            NO HARDWARE ID ASSIGNED
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            TERMINAL COVERAGE
          </div>
          <div className="text-2xl font-bold font-mono text-[#111111] mt-1">
            {stats.rate}%
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            COMPLIANCE PERCENTAGE
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="gov-card p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#333333] font-semibold flex items-center gap-1.5 uppercase">
              <Fingerprint className="w-3.5 h-3.5 text-[#111111]" />
              Terminal Mapping Progression
            </span>
            <span className="text-[#111111] font-bold">
              {stats.enrolledCount} of {stats.total} Mapped ({stats.rate}%)
            </span>
          </div>
          <div className="h-2 w-full bg-[#E5E7EB] overflow-hidden flex">
            <div style={{ width: `${stats.rate}%` }} className="bg-emerald-600 transition-all duration-300" title="Enrolled" />
            <div style={{ width: `${100 - stats.rate}%` }} className="bg-[#CCCCCC] transition-all duration-300" title="Unenrolled" />
          </div>
        </div>
      )}

      {/* ── 3. CONTROL BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Role Tabs */}
          <div className="inline-flex border border-[#CCCCCC]">
            <button
              type="button"
              onClick={() => {
                setTab('students');
                setSearch('');
                setEditId(null);
              }}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                tab === 'students'
                  ? 'bg-[#111111] text-white font-bold'
                  : 'bg-white text-[#555555] hover:bg-[#F3F4F6]'
              }`}
            >
              TRAINEES ({tab === 'students' ? stats.total : '—'})
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('teachers');
                setSearch('');
                setEditId(null);
              }}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                tab === 'teachers'
                  ? 'bg-[#111111] text-white font-bold'
                  : 'bg-white text-[#555555] hover:bg-[#F3F4F6]'
              }`}
            >
              FACULTY &amp; TUTORS ({tab === 'teachers' ? stats.total : '—'})
            </button>
          </div>

          {/* Status Filter */}
          <div className="inline-flex border border-[#CCCCCC]">
            {(['all', 'enrolled', 'unenrolled'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterEnrollment(mode)}
                className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                  filterEnrollment === mode
                    ? 'bg-[#333333] text-white font-bold'
                    : 'bg-white text-[#666666] hover:bg-[#F3F4F6]'
                }`}
              >
                {mode === 'all' ? 'ALL' : mode === 'enrolled' ? 'MAPPED' : 'UNMAPPED'}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#888888]" />
          <input
            type="text"
            placeholder="Search name, cohort, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gov-input pl-8 text-xs font-mono w-full"
          />
        </div>
      </div>

      {/* ── 4. DATA TABLE ── */}
      <div className="gov-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="gov-table w-full text-left">
            <thead>
              <tr>
                <th>PERSONNEL NAME</th>
                <th>{tab === 'students' ? 'COHORT / STAGE' : 'SPECIALIZATION / ROLE'}</th>
                <th>DEVICE USER ID</th>
                <th>DESIGNATED TERMINAL</th>
                <th>ENROLLMENT STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <GovTableLoader colSpan={6} message="AUDITING BIOMETRIC ENROLLMENT HARDWARE ROSTER..." />
              ) : filteredPeople.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-xs font-mono text-[#777777]">
                    {search ? 'NO PERSONNEL MATCHING SEARCH CRITERIA' : `NO ${tab.toUpperCase()} RECORDS FOUND FOR ENROLLMENT`}
                  </td>
                </tr>
              ) : (
                filteredPeople.map((p) => {
                  const isEnrolled = !!p.device_user_id;

                  return (
                    <tr key={p.person_id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="font-bold text-xs text-[#111111]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-none bg-[#111111] text-white flex items-center justify-center text-[10px] font-mono font-bold">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {p.class_or_role || 'General'}
                      </td>
                      <td className="font-mono text-xs">
                        {p.device_user_id ? (
                          <span className="font-bold text-[#111111] bg-[#F1F3F5] px-2 py-0.5 border border-[#CCCCCC]">
                            {p.device_user_id}
                          </span>
                        ) : (
                          <span className="text-[#888888] italic">— Not Mapped —</span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-[#555555]">
                        {p.device_name || 'All Assigned Terminals'}
                      </td>
                      <td>
                        {isEnrolled ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-emerald-400 bg-emerald-50 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            ACTIVE ENROLLMENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-amber-400 bg-amber-50 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            UNREGISTERED
                          </span>
                        )}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className={`gov-btn gov-btn-sm ${!isEnrolled ? 'gov-btn-primary' : ''}`}
                        >
                          {isEnrolled ? 'EDIT MAPPING' : 'ASSIGN ID'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. MAPPING EDIT MODAL ── */}
      {editId && activePerson && (
        <NativeModal
          isOpen={true}
          onClose={() => setEditId(null)}
          title={`BIOMETRIC TERMINAL MAPPING: ${activePerson.name}`}
          subtitle={`Assign hardware terminal Device User ID for automated attendance reconciliation.`}
          icon={Fingerprint}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-[#F8F9FA] border border-[#E5E7EB] text-xs font-mono space-y-1">
              <div><span className="text-[#777777]">PERSONNEL:</span> <span className="font-bold text-[#111111]">{activePerson.name}</span></div>
              <div><span className="text-[#777777]">CLASSIFICATION:</span> <span className="text-[#333333]">{activePerson.class_or_role || 'General'}</span></div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                Device User ID (Terminal PIN / Enrollment Number)
              </label>
              <input
                type="text"
                placeholder="e.g. 1024 or 00892"
                value={editDeviceUserId}
                onChange={(e) => setEditDeviceUserId(e.target.value)}
                className="gov-input w-full font-mono text-sm"
                autoFocus
              />
              <p className="text-[10px] font-mono text-[#777777] mt-1">
                Enter the exact user enrollment ID stored on the ZKTeco / Hikvision / RFID terminal. Leave blank to clear enrollment.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#333333] mb-1 font-semibold">
                Designated Terminal / Gate (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Main Gate Terminal A"
                value={editDeviceName}
                onChange={(e) => setEditDeviceName(e.target.value)}
                className="gov-input w-full font-mono text-sm"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="gov-btn gov-btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEnrollment}
                disabled={saving}
                className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
              >
                {saving ? <GovRollingBox size="sm" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Hardware Mapping</span>
              </button>
            </div>
          </div>
        </NativeModal>
      )}
    </div>
  );
}
